/**
 * react-native-ping 示例
 * 展示 React Native 中的 ICMP Ping 功能
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ping from '@react-native-ohos/react-native-ping';

const TestCase = ({
  title,
  description,
  onPress,
  isLoading,
  result,
}) => (
  <View style={styles.testCaseContainer}>
    <Text style={styles.testCaseTitle}>{title}</Text>
    {description && <Text style={styles.testCaseDescription}>{description}</Text>}
    <TouchableOpacity
      style={[styles.testButton, isLoading && styles.disabledButton]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.testButtonText}>开始测试</Text>
      )}
    </TouchableOpacity>
    {result !== null && <Text style={styles.testResult}>{result}</Text>}
  </View>
);

interface TrafficStats {
  receivedNetworkSpeed: number;
  sendNetworkSpeed: number;
  receivedNetworkTotal: number;
  sendNetworkTotal: number;
}

interface TestResults {
  [key: string]: string | null;
}

interface LoadingTests {
  [key: string]: boolean;
}

const ReactNativePingDemo = () => {
  const [loadingTests, setLoadingTests] = useState<LoadingTests>({});
  const [testResults, setTestResults] = useState<TestResults>({});
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);

  const runTest = async (testId: string, testFunction: () => Promise<string>) => {
    setLoadingTests(prev => ({ ...prev, [testId]: true }));
    setTestResults(prev => ({ ...prev, [testId]: null }));

    try {
      const result = await testFunction();
      setTestResults(prev => ({
        ...prev,
        [testId]: `测试结果: ${result}`,
      }));
    } catch (error) {
      const errorMessage = error.code
        ? `测试失败 (${error.code}): ${error.message}`
        : `测试失败: ${error.message || '未知错误'}`;
      setTestResults(prev => ({
        ...prev,
        [testId]: errorMessage,
      }));
    } finally {
      setLoadingTests(prev => ({ ...prev, [testId]: false }));
    }
  };

  const runAllTests = async () => {
    const testIds = [
      'testGoogleDNS',
      'test114DNS',
      'testInvalidHost',
      'testShortTimeout',
      'testLongTimeout',
      'testNoHost'
    ];

    for (const testId of testIds) {
      if (!loadingTests[testId]) {
        await runTest(testId, () => runSingleTest(testId));
      }
    }

    Alert.alert('测试完成', '所有测试已执行完毕');
  };

  const runSingleTest = async (testId) => {
    switch (testId) {
      case 'testGoogleDNS':
        return testPing('8.8.8.8', 'Google DNS');
      case 'test114DNS':
        return testPing('114.114.114.114', '114 DNS', { timeout: 5000 });
      case 'testInvalidHost':
        return testPing('invalid-host.example.com', '无效主机', { timeout: 5000 });
      case 'testShortTimeout':
        return testPing('8.8.8.8', '设置探测时间 (500ms)', { timeout: 500 });
      case 'testLongTimeout':
        return testPing('8.8.8.8', '设置探测时间 (5000ms)', { timeout: 5000 });
      case 'testNoHost':
        return testPing('', '未设置 host', { timeout: 5000 });  
      default:
        throw new Error('未知测试');
    }
  };

    const testPing = async (ipAddress: string, name: string, options: { timeout?: number } = {}) => {
        try {
            const start = Date.now();
            const rtt = await Ping.start(ipAddress, options);
            console.log("chy rrt:", rtt)
            return `${name} - RTT: ${rtt}ms`;
        } catch (e) {
            return JSON.stringify(e.message)
        }
    };

  const loadTrafficStats = async () => {
    setIsLoadingTraffic(true);
    try {
      const stats = await Ping.getTrafficStats();
      console.log("chy stats:", stats)
      setTrafficStats(stats);
    } catch (error) {
      Alert.alert('获取流量统计失败', error.message);
    } finally {
      setIsLoadingTraffic(false);
    }
  };

  useEffect(() => {
    loadTrafficStats();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>react-native-ping 演示</Text>
        <Text style={styles.subtitle}>
          高性能 ICMP Ping 控制器
        </Text>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>流量统计</Text>
        {isLoadingTraffic ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : trafficStats ? (
          <View style={styles.statsContainer}>
            <Text style={styles.statItem}>
              接收速度: <Text style={styles.statValue}>{trafficStats.receivedNetworkSpeed}</Text>
            </Text>
            <Text style={styles.statItem}>
              发送速度: <Text style={styles.statValue}>{trafficStats.sendNetworkSpeed}</Text>
            </Text>
            <Text style={styles.statItem}>
              接收总量: <Text style={styles.statValue}>{trafficStats.receivedNetworkTotal}</Text>
            </Text>
            <Text style={styles.statItem}>
              发送总量: <Text style={styles.statValue}>{trafficStats.sendNetworkTotal}</Text>
            </Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadTrafficStats}
          disabled={isLoadingTraffic}
        >
          <Text style={styles.refreshButtonText}>刷新统计</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Ping 测试</Text>
        <TestCase
          title="Google DNS (8.8.8.8)"
          description="测试 Google Public DNS 响应"
          onPress={() => runTest('testGoogleDNS', () => runSingleTest('testGoogleDNS'))}
          isLoading={loadingTests['testGoogleDNS']}
          result={testResults['testGoogleDNS']}
        />
        <TestCase
          title="114 DNS (114.114.114.114)"
          description="测试 114 DNS 响应"
          onPress={() => runTest('test114DNS', () => runSingleTest('test114DNS'))}
          isLoading={loadingTests['test114DNS']}
          result={testResults['test114DNS']}
        />
        <TestCase
          title="无效主机"
          description="测试无效主机地址"
          onPress={() => runTest('testInvalidHost', () => runSingleTest('testInvalidHost'))}
          isLoading={loadingTests['testInvalidHost']}
          result={testResults['testInvalidHost']}
        />
        <TestCase
          title="短探测时间"
          description="测试 500ms 探测时间限制"
          onPress={() => runTest('testShortTimeout', () => runSingleTest('testShortTimeout'))}
          isLoading={loadingTests['testShortTimeout']}
          result={testResults['testShortTimeout']}
        />
        <TestCase
          title="长探测时间"
          description="测试 5000ms 探测时间限制"
          onPress={() => runTest('testLongTimeout', () => runSingleTest('testLongTimeout'))}
          isLoading={loadingTests['testLongTimeout']}
          result={testResults['testLongTimeout']}
        />

        <TestCase
          title="未设置 host"
          description="未设置 host"
          onPress={() => runTest('testNoHost', () => runSingleTest('testNoHost'))}
          isLoading={loadingTests['testNoHost']}
          result={testResults['testNoHost']}
        />
      </View>

      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={[styles.runAllButton, Object.values(loadingTests).some(v => v) && styles.disabledButton]}
          onPress={runAllTests}
          disabled={Object.values(loadingTests).some(v => v)}
        >
          {Object.values(loadingTests).some(v => v) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.runAllButtonText}>运行所有测试</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  testCaseContainer: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  testCaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  testCaseDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 16,
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  testResult: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  statsContainer: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statItem: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  statValue: {
    fontWeight: '600',
    color: '#007AFF',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  runAllButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReactNativePingDemo;
