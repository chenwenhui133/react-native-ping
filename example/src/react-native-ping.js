import Ping from '@react-native-ohos/react-native-ping';

try {
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
  const ms = await Ping.start('114.114.114.114',{ timeout: 1000 });
  console.log(ms);
} catch (error) {
  console.log('special code',error.code, error.message);
}