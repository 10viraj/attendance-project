import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FingerPrintIcon, ClockIcon, ClipboardDocumentListIcon } from 'react-native-heroicons/outline';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import api from '../config/api';

const AttendanceScreen = ({ navigation }) => {
  const [status, setStatus] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get('/attendance/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data.status || 'Not Checked In');
    } catch (error) {
      console.error('Error loading attendance status:', error);
      setStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const authenticateAndAction = async (actionType) => {
    if (status === 'Checked Out') {
      Alert.alert('Shift Completed', 'You have already checked out for today.');
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Not Supported', 'Your device does not support biometric authentication.');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Not Set Up', 'Please configure your fingerprint or face ID in your device settings.');
        return;
      }

      let promptMsg = 'Authenticate';
      if (actionType === 'check-in') promptMsg = 'Authenticate to Check In';
      if (actionType === 'check-out') promptMsg = 'Authenticate to Check Out';
      if (actionType === 'start-break') promptMsg = 'Authenticate to Start Break';
      if (actionType === 'end-break') promptMsg = 'Authenticate to End Break';

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMsg,
        fallbackLabel: 'Use Passcode',
      });

      if (authResult.success) {
        handleAction(actionType);
      } else {
        Alert.alert('Authentication Failed', 'Unable to verify your identity.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred during authentication.');
    }
  };

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const employeeInfoStr = await AsyncStorage.getItem('employeeInfo');
      
      let employeeId;
      if (employeeInfoStr) {
        const employeeInfo = JSON.parse(employeeInfoStr);
        employeeId = employeeInfo.employeeId;
      }

      const endpoint = `/attendance/${action}`;
      
      const payload = {
        employeeId,
        location: { latitude: 28.6139, longitude: 77.2090 }, // Mock location
        verificationMethod: 'Fingerprint'
      };
      
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Offline Mode: Queue the punch
        const queueStr = await AsyncStorage.getItem('punchQueue');
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push({ action, payload, timestamp: new Date().toISOString() });
        await AsyncStorage.setItem('punchQueue', JSON.stringify(queue));
        
        Alert.alert('Offline Mode', `You are offline. Your ${action.replace('-', ' ')} has been saved locally and will sync when reconnected.`);
        
        // Optimistically update UI
        if (action === 'check-in') setStatus('Checked In');
        if (action === 'check-out') setStatus('Checked Out');
        if (action === 'start-break') setStatus('On Break');
        if (action === 'end-break') setStatus('Checked In');
        
        setProcessing(false);
        return;
      }

      const res = await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Alert.alert(
          'Attendance Recorded', 
          `Successfully processed: ${action.replace('-', ' ')}`
        );
        loadStatus();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || `Failed to ${action}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2563eb" barStyle="light-content" translucent={false} />
      
      <View style={styles.headerBackground} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.greetingSub}>Verify Identity</Text>
          <Text style={styles.greetingMain}>Face Scan Attendance</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <ClockIcon color="#2563eb" size={40} />
            </View>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusValue}>
              {loading ? <ActivityIndicator color="#1e293b" /> : status}
            </Text>

            <View style={styles.actionContainer}>
              {status === 'Not Checked In' && (
                <TouchableOpacity 
                  style={styles.checkInButton}
                  onPress={() => authenticateAndAction('check-in')}
                  disabled={processing}
                  activeOpacity={0.8}
                >
                  {processing ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <FingerPrintIcon color="#fff" size={24} />
                      <Text style={styles.buttonText}>Punch Check In</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {status === 'Checked In' && (
                <>
                  <TouchableOpacity 
                    style={[styles.checkInButton, { backgroundColor: '#f59e0b', marginBottom: 12 }]}
                    onPress={() => authenticateAndAction('start-break')}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    {processing ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <ClockIcon color="#fff" size={24} />
                        <Text style={styles.buttonText}>Start Break</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.checkOutButton}
                    onPress={() => authenticateAndAction('check-out')}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    {processing ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <FingerPrintIcon color="#fff" size={24} />
                        <Text style={styles.buttonText}>Punch Check Out</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {status === 'On Break' && (
                <TouchableOpacity 
                  style={[styles.checkInButton, { backgroundColor: '#10b981' }]}
                  onPress={() => authenticateAndAction('end-break')}
                  disabled={processing}
                  activeOpacity={0.8}
                >
                  {processing ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <ClockIcon color="#fff" size={24} />
                      <Text style={styles.buttonText}>End Break</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {status === 'Checked Out' && (
                <View style={styles.doneContainer}>
                  <Text style={styles.doneText}>You have completed your shift for today!</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.historyButton}
                onPress={() => navigation.navigate('AttendanceHistory')}
                activeOpacity={0.8}
              >
                <ClipboardDocumentListIcon color="#2563eb" size={20} />
                <Text style={styles.historyButtonText}>View Attendance History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: '#2563eb', // primary-600
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
    color: '#bfdbfe', // primary-200
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greetingMain: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 40,
  },
  actionContainer: {
    width: '100%',
  },
  checkInButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  checkOutButton: {
    backgroundColor: '#e11d48', // rose-600
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  doneContainer: {
    backgroundColor: '#f1f5f9',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  historyButtonText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AttendanceScreen;
