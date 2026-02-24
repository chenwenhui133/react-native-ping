/**
 * MIT License
 *
 * Copyright (C) 2023 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { TurboModule } from '@rnoh/react-native-openharmony/ts';
// import connection from '@ohos.net.connection';
// import socket from '@ohos.net.socket';
import { socket, connection } from '@kit.NetworkKit';
import fs from '@ohos.file.fs';
import hilog from '@ohos.hilog';
import { util } from '@kit.ArkTS';
import type { TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { BusinessError } from '@kit.BasicServicesKit';
import { statistics } from '@kit.NetworkKit';
import { bundleManager } from '@kit.AbilityKit';
import { http } from '@kit.NetworkKit';
import PingTool from 'libentry.so';

const TAG: string = 'PingHar';
const DOMAIN: number = 0xD001;
const NET_DEV_PATH: string = '/proc/net/dev';
const IGNORED_IFACES: Array<string> = ['lo'];

const DEFAULT_TIMEOUT = 1000;
const DEFAULT_COUNT = 1;
const MIN_TIMEOUT = 100;
const BETWEEN_ATTEMPTS_DELAY = 50;
const DEFAULT_DOMAIN_PORTS: Array<number> = [80, 443, 53];
const DEFAULT_IP_PORTS: Array<number> = [53, 80, 443];

function sleep(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)}KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)}MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(1)}GB`;
}

interface Snapshot {
  rx: number;
  tx: number;
}

async function readSnapshot(): Promise<Snapshot> {
  const fd = fs.openSync(NET_DEV_PATH, fs.OpenMode.READ_ONLY);
  try {
    const stat = fs.statSync(NET_DEV_PATH);
    const buffer = new ArrayBuffer(stat.size);
    console.log('fd--------', JSON.stringify(fd))
    // fs.readSync(fd, buffer);
    // const decoder = new util.TextDecoder();
    // const content = decoder.decode(buffer);
    // const lines = content.split('\n').slice(2);
    // let rxTotal = 0;
    // let txTotal = 0;
    // lines.forEach(line => {
    //   if (!line || line.indexOf(':') === -1) {
    //     return;
    //   }
    //   const [iface, numbers] = line.split(':');
    //   const trimmedIface = iface.trim();
    //   if (!trimmedIface || IGNORED_IFACES.indexOf(trimmedIface) !== -1) {
    //     return;
    //   }
    //   const columns = numbers.trim().split(/\s+/);
    //   if (columns.length < 9) {
    //     return;
    //   }
    //   rxTotal += Number.parseInt(columns[0]);
    //   txTotal += Number.parseInt(columns[8]);
    // });
    return { rx: 22, tx: 33 };
  } finally {
    fs.closeSync(fd);
  }
}

export interface PingOptions {
  timeout?: number;
  payloadSize?: number;
  count?: number;
  port?: number;
}

export interface TrafficStats {
  receivedNetworkSpeed: string;
  receivedNetworkTotal: string;
  sendNetworkSpeed: string;
  sendNetworkTotal: string;
}

export class PingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    console.log('constructor error', JSON.stringify(code))
    this.code = code;
  }
}

function looksLikeIp(host: string): boolean {
  return /^[0-9a-fA-F.:]+$/.test(host);
}

function buildPortList(host: string, explicitPort?: number): Array<number> {
  if (explicitPort && explicitPort > 0 && explicitPort < 65536) {
    return [explicitPort];
  }
  const defaults = looksLikeIp(host) ? DEFAULT_IP_PORTS : DEFAULT_DOMAIN_PORTS;
  const unique = new Set<number>();
  defaults.forEach(port => unique.add(port));
  return Array.from(unique.values());
}

async function ensureDefaultNet(): Promise<connection.NetHandle> {
  try {
    const netHandle = await connection.getDefaultNet();
    if (netHandle && netHandle.netId > 0) {
      return netHandle;
    }
  } catch (error) {
    hilog.error(DOMAIN, TAG, 'Failed to obtain default network: %{public}s', `${error}`);
    if (typeof error === 'object' && error && 'code' in (error as Record<string, unknown>)) {
      const code = (error as { code?: number }).code ?? 0;
      if (code === 201) {
        throw new PingError('5', 'PingUtil_Message_Unknown');
      }
    }
    throw new PingError('3', 'PingUtil_Message_HostErrorUnknown');
  }
  throw new PingError('3', 'PingUtil_Message_HostErrorUnknown');
}

async function resolveAddresses(netHandle: connection.NetHandle, host: string): Promise<Array<connection.NetAddress>> {
  try {
    const addresses = await netHandle.getAddressesByName(host);
    return addresses.filter(item => !!item && !!item.address);
  } catch (error) {
    hilog.error(DOMAIN, TAG, 'DNS resolution failed: %{public}s', `${error}`);
    if (typeof error === 'object' && error && 'code' in (error as Record<string, unknown>)) {
      const businessCode = (error as { code?: number }).code;
      if (businessCode === 2100001) {
        throw new PingError('4', 'PingUtil_Message_HostErrorHostNotFound');
      }
    }
    throw new PingError('3', 'PingUtil_Message_HostErrorUnknown');
  }
}

function createConnectAddress(raw: connection.NetAddress, port: number): connection.NetAddress {
  return {
    address: raw.address,
    family: raw.family,
    port
  };
}

function wrapWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  console.log('start ping----------wrapWithTimeout0',timeout)
  return new Promise<T>((resolve, reject) => {
    console.log('start ping----------wrapWithTimeout1')
    const timer = setTimeout(() => {
      console.log('start ping----------wrapWithTimeout2')
      reject(new PingError('0', 'PingUtil_Message_Timeout'));
    }, timeout);
    console.log('start ping----------wrapWithTimeout3')
    promise
      .then(value => {
        console.log('start ping----------wrapWithTimeout4',value)
        clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        console.log('start ping----------wrapWithTimeout5',JSON.stringify(error))
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof PingError) {
    return error.code === '0';
  }
  if (typeof error === 'object' && error) {
    const code = (error as { code?: number }).code;
    return code === 2303210;
  }
  return false;
}

async function attemptTcpConnection(
  netHandle: connection.NetHandle,
  address: connection.NetAddress,
  port: number,
  timeout: number
): Promise<number> {
  let tcp: socket.TCPSocket = socket.constructTCPSocketInstance();
  console.log('start ping----------RNReactNativePingTurboModule15', JSON.stringify(tcp), JSON.stringify(netHandle))
  try {
    // await netHandle.bindSocket(tcp);
    console.log('start ping----------RNReactNativePingTurboModule20', JSON.stringify(createConnectAddress(address, port)))
    const started = Date.now();
    console.log('start ping----------RNReactNativePingTurboModule16', JSON.stringify(netHandle))
    const connectAddress = createConnectAddress(address, port)
    console.log('start ping----------RNReactNativePingTurboModule21', JSON.stringify(connectAddress))
    await wrapWithTimeout(
      tcp.connect({
        address: connectAddress,
        timeout
      }),
      timeout
    );
    console.log('start ping----------RNReactNativePingTurboModule17', Math.max(Date.now() - started, 1))
    return Math.max(Date.now() - started, 1);
  } catch (error) {
    console.log('start ping----------RNReactNativePingTurboModule18', JSON.stringify(error))
    if (error instanceof PingError) {
      throw error;
    }
    if (isTimeoutError(error)) {
      throw new PingError('0', 'PingUtil_Message_Timeout');
    }
    hilog.warn(DOMAIN, TAG, 'TCP attempt failed: %{public}s', `${error}`);
    throw new PingError('3', 'PingUtil_Message_HostErrorUnknown');
  } finally {
    try {
      console.log('start ping----------RNReactNativePingTurboModule19', JSON.stringify(tcp))
      await tcp.close();
    } catch (closeError) {
      hilog.warn(DOMAIN, TAG, 'Closing socket failed: %{public}s', `${closeError}`);
    }
  }
}

async function measureSingleRtt(
  netHandle: connection.NetHandle,
  addresses: Array<connection.NetAddress>,
  ports: Array<number>,
  timeout: number
): Promise<number> {
  let lastError: PingError | undefined;
  for (const address of addresses) {
    for (const port of ports) {
      try {
        console.log('start ping----------RNReactNativePingTurboModule8', JSON.stringify(netHandle), JSON.stringify(address), port, timeout)
        return await attemptTcpConnection(netHandle, address, port, timeout);
      } catch (error) {
        console.log('start ping----------RNReactNativePingTurboModule9', error)
        if (error instanceof PingError) {
          lastError = error;
          console.log('start ping----------RNReactNativePingTurboModule10', error)
          if (error.code === '0') {
            console.log('start ping----------RNReactNativePingTurboModule11', error)
            // Timeout is authoritative; bubble immediately.
            throw error;
          }
        } else {
          console.log('start ping----------RNReactNativePingTurboModule12---PingUtil_Message_HostErrorUnknown')
          lastError = new PingError('3', 'PingUtil_Message_HostErrorUnknown');
        }
      }
    }
  }
  if (lastError) {
    console.log('start ping----------RNReactNativePingTurboModule13', lastError)
    throw lastError;
  }
  console.log('start ping----------RNReactNativePingTurboModule14----PingUtil_Message_HostErrorUnknown')
  throw new PingError('3', 'PingUtil_Message_HostErrorUnknown');
}

export class RNReactNativePingTurboModule extends TurboModule {
  constructor(protected ctx: TurboModuleContext) {
    super(ctx);
    console.log('RNReactNativePingTurboModule-----constructor')
  }

  addRegister() {
    let netCon: connection.NetConnection = connection.createNetConnection();
    let linkUpBandwidthKbps = 0;
    let linkDownBandwidthKbps = 0;
    netCon.register((error: BusinessError) => {
      console.error('getTrafficStats-----', JSON.stringify(error));
    });
    // 先使用on接口订阅网络能力变化事件。
    netCon.on('netCapabilitiesChange', (data: connection.NetCapabilityInfo) => {
      linkUpBandwidthKbps = data.netCap.linkUpBandwidthKbps;
      linkDownBandwidthKbps = data.netCap.linkDownBandwidthKbps;
      console.info("Succeeded to get data3: " + JSON.stringify(data));
    });
    // 先使用on接口订阅网络连接信息变化事件。
    netCon.on('netConnectionPropertiesChange', (data: connection.NetConnectionPropertyInfo) => {
      console.info("Succeeded to get data4: " + JSON.stringify(data));
    });

    connection.getDefaultNet().then((netHandle: connection.NetHandle) => {
      if (netHandle.netId == 0) {
        // 当前没有已连接的网络时，netHandler的netId为0，属于异常场景。可根据实际情况添加处理机制。
        return;
      }
      let host = "www.baidu.com";
      netHandle.getAddressesByName(host).then((data: connection.NetAddress[]) => {
        console.info("Succeeded to get data: " + JSON.stringify(data));
      });
    });
    return {
      linkUpBandwidthKbps,
      linkDownBandwidthKbps,
    }
  }

  async httpPing(targetUrl: string, timeout: number = 3000): Promise<number> {
    try {
      let httpRequest = http.createHttp();
      // 构造HTTP请求URL
      const url = targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`;

      const options = {
          url: url,
          method: http.RequestMethod.GET,
          connectTimeout: timeout,
          readTimeout: timeout
      }
      let totalTiming = 0;
      await httpRequest.request(url, options, (err: Error, data: http.HttpResponse) => {
        if (!err) {
          console.info('httpPing----Result:', JSON.stringify(data.performanceTiming.totalTiming));
          if (data.responseCode === 200) {
            totalTiming = data.performanceTiming.totalTiming
          }
        } else {
          console.error('httpPing----error:' ,JSON.parse(JSON.stringify(err)).code);
          const curErr = JSON.parse(JSON.stringify(err));
          if (curErr.code === 2300028) {
            throw new PingError('0', 'PingUtil_Message_Timeout');
          }
          // else if () {
          //
          // }
          else if (curErr.code === 2300006 ) {
            throw new PingError('2', 'PingUtil_Message_HostErrorNotSetHost');
          } else if (curErr.code === 2300003 ) {
            throw new PingError('4', 'PingUtil_Message_HostErrorUnknown');
          }
        }
      });
      // 返回响应时间表示连接成功
      return totalTiming;
    } catch (error) {
      console.error('HTTP Ping failed:', JSON.stringify(error));
      throw new PingError('5', 'PingUtil_Message_Unknown');
    }
  }

  async start(ipAddress: string, options: PingOptions = {}): Promise<number> {
    if (ipAddress == null || ipAddress === "") {
      throw new PingError('2', "PingUtil_Message_HostErrorNotSetHost");
    }
    let result = await PingTool.nativePing(ipAddress, 2)
    let parseResult = JSON.parse(result)
    if (parseResult.avgDelay == 2000) {
      throw new PingError('3', "PingUtil_Message_HostErrorUnknown");
    }
    return parseResult.avgDelay;
  }

  bytesToAvaiUnit(bytes: number): string {
    if (bytes < 1024) { // B
      return `${Math.floor(bytes)}B`; // 只保留整数
    } else if (bytes >= 1024 && bytes < 1024 * 1024) { // KB
      return `${(bytes / 1024.0).toFixed(1)}KB`;
    } else if (bytes >= 1024 * 1024 && bytes < 1024 * 1024 * 1024) { // MB
      return `${(bytes / (1024 * 1024.0)).toFixed(1)}MB`;
    } else { // GB
      return `${(bytes / (1024 * 1024 * 1024.0)).toFixed(1)}GB`;
    }
  }

  private previousStats?: { rx: number; tx: number; timestamp: number };

  async getTrafficStats(): Promise<TrafficStats> {
    const receiveTotal = await statistics.getAllRxBytes();
    const sendTotal = await statistics.getAllTxBytes();
    const receivedNetworkTotal = this.bytesToAvaiUnit(receiveTotal);
    const sendNetworkTotal = this.bytesToAvaiUnit(sendTotal);

    const currentTime = Date.now();
    let receivedNetworkSpeed = '0B/s';
    let sendNetworkSpeed = '0B/s';

    // 计算速度
    if (this.previousStats) {
      const timeDiff = (currentTime - this.previousStats.timestamp) / 1000; // 转换为秒
      if (timeDiff > 0) {
        const rxDiff = receiveTotal - this.previousStats.rx;
        const txDiff = sendTotal - this.previousStats.tx;
        const rxSpeed = rxDiff / timeDiff; // 字节每秒
        const txSpeed = txDiff / timeDiff; // 字节每秒

        receivedNetworkSpeed = `${this.bytesToAvaiUnit(rxSpeed)}/s`;
        sendNetworkSpeed = `${this.bytesToAvaiUnit(txSpeed)}/s`;
      }
    }

    // 更新上一次统计数据
    this.previousStats = {
      rx: receiveTotal,
      tx: sendTotal,
      timestamp: currentTime
    };

    try {
      return {
        receivedNetworkSpeed,
        receivedNetworkTotal,
        sendNetworkSpeed,
        sendNetworkTotal
      };
    } catch (error) {
      hilog.error(DOMAIN, TAG, 'Traffic stats failed: %{public}s', `${error}`);
      throw new PingError('5', 'PingUtil_Message_Unknown');
    }
  }
}
