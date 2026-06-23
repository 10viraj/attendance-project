import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FingerPrintIcon, ClockIcon, ClipboardDocumentListIcon, CalendarDaysIcon, CheckCircleIcon } from 'react-native-heroicons/outline';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../config/api';

const AttendanceScreen = ({ navigation }) => {
  const [status, setStatus] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('');

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const employeeStr = await AsyncStorage.getItem('employeeInfo');
      if (employeeStr) {
        setUserName(JSON.parse(employeeStr).firstName);
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get('/attendance/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data.status || 'Not Checked In');
    } catch (error) {
      if (!error.response || error.response.status !== 401) {
        console.error('Error loading attendance status:', error);
      }
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

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusColor = () => {
    if (status === 'Checked In') return '#22C55E'; // lime green
    if (status === 'On Break') return '#14B8A6'; // teal
    if (status === 'Checked Out') return '#0D9488'; // deep teal
    return '#0369A1'; // ocean blue
  };

  const getStatusBgColor = () => {
    if (status === 'Checked In') return '#DCFCE7'; // light green tint
    if (status === 'On Break') return '#CCFBF1'; // teal tint
    if (status === 'Checked Out') return '#CFFAFE'; // cyan tint
    return '#E0F2FE'; // blue tint
  };


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
        verificationMethod: 'FaceScan' // Premium terminology
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

  const statusColor = getStatusColor();
  const statusBgColor = getStatusBgColor();

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />

      <LinearGradient
        colors={['#4f46e5', '#3b82f6', '#0ea5e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.greetingSub}>{formattedDate}</Text>
          <Text style={styles.greetingMain}>{getGreeting()}, {userName || 'User'}</Text>
        </View>

        {/* Live Clock Dashboard Widget */}
        <View style={styles.clockWidget}>
          <ClockIcon size={24} color="#e0f2fe" style={styles.clockIcon} />
          <Text style={styles.clockText}>{formattedTime}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>

            <View style={[styles.statusIndicatorLine, { backgroundColor: statusColor }]} />

            <View style={[styles.iconCircle, { backgroundColor: statusBgColor }]}>
              {status === 'Checked In' ? <CheckCircleIcon color={statusColor} size={44} /> :
                status === 'On Break' ? <ClockIcon color={statusColor} size={44} /> :
                  status === 'Checked Out' ? <CalendarDaysIcon color={statusColor} size={44} /> :
                    <FingerPrintIcon color={statusColor} size={44} />}
            </View>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusValue}>
              {loading ? <ActivityIndicator color="#1e293b" /> : status}
            </Text>

            <View style={styles.actionContainer}>
              {status === 'Not Checked In' && (
                <TouchableOpacity
                  onPress={() => authenticateAndAction('check-in')}
                  disabled={processing}
                  activeOpacity={0.8}
                  style={styles.buttonShadow}
                >
                  <LinearGradient
                    colors={['#4f46e5', '#3b82f6']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    {processing ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <FingerPrintIcon color="#fff" size={24} />
                        <Text style={styles.buttonText}>Punch Check In</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {status === 'Checked In' && (
                <View style={styles.buttonGroupRow}>
                  <TouchableOpacity
                    style={styles.secondaryButtonTouchable}
                    onPress={() => authenticateAndAction('start-break')}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    <View style={styles.secondaryButton}>
                      {processing ? <ActivityIndicator color="#475569" /> : (
                        <>
                          <ClockIcon color="#475569" size={20} />
                          <Text style={styles.secondaryButtonText}>Start Break</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButtonHalfTouchable}
                    onPress={() => authenticateAndAction('check-out')}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#1e293b', '#0f172a']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.primaryButtonHalf}
                    >
                      {processing ? <ActivityIndicator color="#fff" /> : (
                        <>
                          <FingerPrintIcon color="#fff" size={20} />
                          <Text style={styles.buttonText}>Check Out</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {status === 'On Break' && (
                <TouchableOpacity
                  onPress={() => authenticateAndAction('end-break')}
                  disabled={processing}
                  activeOpacity={0.8}
                  style={styles.buttonShadow}
                >
                  <LinearGradient
                    colors={['#4f46e5', '#3b82f6']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    {processing ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <ClockIcon color="#fff" size={24} />
                        <Text style={styles.buttonText}>End Break</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {status === 'Checked Out' && (
                <View style={styles.doneContainer}>
                  <View style={styles.doneIconWrap}>
                    <CheckCircleIcon size={32} color="#10b981" />
                  </View>
                  <Text style={styles.doneTextTitle}>Shift Completed</Text>
                  <Text style={styles.doneText}>You have successfully finished your shift for today. Great job!</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => navigation.navigate('AttendanceHistory')}
                activeOpacity={0.7}
              >
                <View style={styles.historyButtonInner}>
                  <ClipboardDocumentListIcon color="#4f46e5" size={20} />
                  <Text style={styles.historyButtonText}>View Attendance History</Text>
                </View>
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
    height: 320,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0f2fe',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  greetingMain: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  clockWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 30,
  },
  clockIcon: {
    marginRight: 8,
    opacity: 0.9,
  },
  clockText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
    overflow: 'hidden', // to bound the statusIndicatorLine
    minHeight: 400,
  },
  statusIndicatorLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 40,
    letterSpacing: -0.5,
  },
  actionContainer: {
    width: '100%',
  },
  buttonShadow: {
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderRadius: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 20,
  },
  buttonGroupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButtonTouchable: {
    flex: 1,
    marginRight: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 8,
  },
  primaryButtonHalfTouchable: {
    flex: 1,
    marginLeft: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    borderRadius: 16,
  },
  primaryButtonHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  doneContainer: {
    backgroundColor: '#ecfdf5',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  doneIconWrap: {
    marginBottom: 12,
  },
  doneTextTitle: {
    color: '#065f46',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  doneText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  historyButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100, // pill shape
  },
  historyButtonText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default AttendanceScreen;
