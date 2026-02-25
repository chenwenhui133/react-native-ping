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
import hilog from '@ohos.hilog';
import type { TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { statistics } from '@kit.NetworkKit';
import PingTool from 'libentry.so';

const TAG: string = 'PingHar';
const DOMAIN: number = 0xD001;

const DEFAULT_TIMEOUT = 1;

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
    this.code = code;
  }
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



export class RNReactNativePingTurboModule extends TurboModule {
  constructor(protected ctx: TurboModuleContext) {
    super(ctx);
  }

  async start(ipAddress: string, options: PingOptions = {}): Promise<number> {
    if (ipAddress == null || ipAddress === "") {
      throw new PingError('2', "PingUtil_Message_HostErrorNotSetHost");
    }
    let result;
    let times = options.timeout ? (options.timeout / 1000) : DEFAULT_TIMEOUT;

    try {
      // 探测持续时间。单位：秒。探测间隔为1秒，因此可通过本字段控制探测次数
      result = await PingTool.nativePing(ipAddress, times)
    } catch (error) {
      if (error instanceof PingError) {
        throw error;
      }
      throw new PingError('3', 'PingUtil_Message_HostErrorUnknown');
    }
    let parseResult = JSON.parse(result)
    if (parseResult.avgDelay === times * 1000) {
      throw new PingError('3', 'PingUtil_Message_HostErrorUnknown');
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
