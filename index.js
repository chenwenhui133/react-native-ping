import { TurboModuleRegistry } from 'react-native';
// import RNCPing from './internal/NativePing';
var RNCPing = TurboModuleRegistry ? 
TurboModuleRegistry.get('RNCPing') :
require('react-native').NativeModules.Ping;

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
    console.log('start ping----121212', ipAddress, option, RNCPing);
    const result = await RNCPing.start(ipAddress, option);
    return result;
  }
  static async getTrafficStats() {
    const result = await RNCPing.getTrafficStats();
    return result;
  }
}

export default Ping;



