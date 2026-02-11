import { NativeModules } from 'react-native';

// React Native sets `__turboModuleProxy` on global when TurboModules are enabled.
// Currently, this is the recommended way to detect TurboModules.
// https://reactnative.dev/docs/the-new-architecture/backward-compatibility-turbomodules#unify-the-javascript-specs
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const { RNReactNativePing } = isTurboModuleEnabled
  ? // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./internal/NativeRNCPing').default
  : NativeModules.RNCPing;

  console.log('RNReactNativePing---', RNReactNativePing);
class Ping {
  /**
   *
   * Get RTT (Round-trip delay time)
   * 
   * @static
   * @param {string} ipAddress - For example : 8.8.8.8
   * @param {Object} option - Some optional operations
   * @param {number} option.timeout - timeout
   * @returns
   * @memberof Ping
   */
  static async start(ipAddress, option) {
    console.log('start ping----', ipAddress, option);
    const result = await RNReactNativePing.start(ipAddress, option);
    return result;
  }
  static async getTrafficStats() {
    const result = await RNReactNativePing.getTrafficStats();
    return result;
  }
}

export default Ping;
