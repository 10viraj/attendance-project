import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClockIcon, CalendarDaysIcon, ViewfinderCircleIcon, PaperAirplaneIcon, ArrowTrendingUpIcon, ArrowRightOnRectangleIcon } from 'react-native-heroicons/outline';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../config/api';

let Notifications;
try {
  if (Constants.appOwnership !== 'expo' || Platform.OS !== 'android') {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  console.log('Error setting notification handler:', e);
}

const DashboardScreen = ({ navigation }) => {
  const [employee, setEmployee] = useState(null);
  const [status, setStatus] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [presentDays, setPresentDays] = useState('0');
  const [absentDays, setAbsentDays] = useState('0');
  const [weeklyHours, setWeeklyHours] = useState('0h');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [punchInTime, setPunchInTime] = useState('—');
  const [punchOutTime, setPunchOutTime] = useState('—');
  const [checkInDateObj, setCheckInDateObj] = useState(null);
  const [checkOutDateObj, setCheckOutDateObj] = useState(null);

  const [biometricType, setBiometricType] = useState('Face'); // default

  // Check supported biometric type for UI
  useEffect(() => {
    const checkType = async () => {
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        } else {
          setBiometricType('Manual');
        }
      } catch (e) {
        console.log(e);
      }
    };
    checkType();
  }, []);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const employeeData = await AsyncStorage.getItem('employeeInfo');
      const token = await AsyncStorage.getItem('userToken');
      if (employeeData) setEmployee(JSON.parse(employeeData));

      if (token) {
        // Register for push notifications
        registerForPushNotificationsAsync().then(async (pushToken) => {
          if (pushToken) {
            try {
              await api.post('/auth/push-token', { token: pushToken }, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (err) {
              console.log('Error saving push token', err);
            }
          }
        });

        // Fetch Today's Status
        const statusRes = await api.get('/attendance/today', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let currentStatus = statusRes.data.status === 'Not Checked In' ? 'Not Started' : (statusRes.data.status || 'Not Started');
        
        // Safeguard in case backend hasn't been restarted with the 'Checked Out' status fix
        if (statusRes.data.data && statusRes.data.data.checkOut && statusRes.data.data.checkOut.time) {
          currentStatus = 'Checked Out';
        }

        setStatus(currentStatus);
        
        if (statusRes.data.data) {
          const attendanceData = statusRes.data.data;
          if (attendanceData.checkIn && attendanceData.checkIn.time) {
            setCheckInDateObj(new Date(attendanceData.checkIn.time));
            setPunchInTime(new Date(attendanceData.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
          }
          if (attendanceData.checkOut && attendanceData.checkOut.time) {
            setCheckOutDateObj(new Date(attendanceData.checkOut.time));
            setPunchOutTime(new Date(attendanceData.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
          }
        }

        // Fetch Employee Stats
        try {
          const statsRes = await api.get('/attendance/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (statsRes.data.success) {
            setPresentDays((statsRes.data.data.presentDays || 0).toString());
            setAbsentDays((statsRes.data.data.absentDays || 0).toString());
            
            // Format "Xh Ym" to just "X.Yh" for the compact UI
            const hoursMatch = statsRes.data.data.weeklyHoursFormatted.match(/(\d+)h/);
            const minsMatch = statsRes.data.data.weeklyHoursFormatted.match(/(\d+)m/);
            const h = hoursMatch ? parseInt(hoursMatch[1]) : 0;
            const m = minsMatch ? parseInt(minsMatch[1]) : 0;
            setWeeklyHours(`${(h + m/60).toFixed(1)}h`);
          }
        } catch (statsErr) {
          console.error('Error loading stats:', statsErr);
        }
      }
    } catch (error) {
      if (!error.response || error.response.status !== 401) {
        console.error('Error loading dashboard data:', error);
      }
      setStatus('Not Started');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
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
        console.log('No biometric hardware detected. Bypassing biometric for dashboard.');
        handleAction(actionType);
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        console.log('No biometrics enrolled. Bypassing biometric for dashboard.');
        handleAction(actionType);
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate with ${biometricType}`,
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
      const employeeId = employee?.employeeId;

      const endpoint = `/attendance/${action}`;

      const payload = {
        employeeId,
        location: { latitude: 28.6139, longitude: 77.2090 }, // Mock location
        verificationMethod: biometricType === 'Manual' ? 'Manual' : biometricType
      };

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Offline Mode
        const queueStr = await AsyncStorage.getItem('punchQueue');
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push({ action, payload, timestamp: new Date().toISOString() });
        await AsyncStorage.setItem('punchQueue', JSON.stringify(queue));

        Alert.alert('Offline Mode', `You are offline. Your punch has been saved locally.`);
        if (action === 'check-in') {
          setStatus('Checked In');
          setPunchInTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }
        if (action === 'check-out') {
          setStatus('Checked Out');
          setPunchOutTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }
        setProcessing(false);
        return;
      }

      const res = await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        loadDashboardData();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || `Failed to punch`);
    } finally {
      setProcessing(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const shortDate = currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Get user initial for avatar
  const userName = employee ? employee.firstName : 'User';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  // Determine what button to show
  let buttonAction = 'check-in';
  let buttonText = `Punch In with ${biometricType}`;
  let buttonColor = '#2E4040';
  let ButtonIcon = ViewfinderCircleIcon;

  if (status === 'Checked In' || status === 'On Break') {
     buttonAction = 'check-out';
     buttonText = 'Punch Out';
     buttonColor = '#9B2C2C'; // Red
     ButtonIcon = ArrowRightOnRectangleIcon;
  } else if (status === 'Checked Out') {
     buttonText = 'Shift Completed';
     buttonColor = '#10B981'; // Green
     ButtonIcon = ViewfinderCircleIcon;
  }

  // Format the status for the pill
  const getDisplayStatus = (s) => {
    if (s === 'Checked In') return 'On Shift';
    if (s === 'Checked Out') return 'Shift Completed';
    return s;
  };

  let clockLabel = "Today's Shift";
  let clockDisplay = formattedTime;

  if (status === 'Checked In' && checkInDateObj) {
    clockLabel = "Time Worked";
    const diff = Math.max(0, Math.floor((currentTime - checkInDateObj) / 1000));
    const hrs = Math.floor(diff / 3600).toString().padStart(2, '0');
    const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const secs = (diff % 60).toString().padStart(2, '0');
    clockDisplay = `${hrs}:${mins}:${secs}`;
  } else if (status === 'Checked Out' && checkInDateObj && checkOutDateObj) {
    clockLabel = "Time Worked";
    const diff = Math.max(0, Math.floor((checkOutDateObj - checkInDateObj) / 1000));
    const hrs = Math.floor(diff / 3600).toString().padStart(2, '0');
    const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const secs = (diff % 60).toString().padStart(2, '0');
    clockDisplay = `${hrs}:${mins}:${secs}`;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={false} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header Section */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingSub}>Good morning,</Text>
              <Text style={styles.greetingMain}>{userName}</Text>
              <Text style={styles.greetingDate}>{formattedDate}</Text>
            </View>
            <TouchableOpacity 
              style={styles.avatarCircle}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{userInitial}</Text>
            </TouchableOpacity>
          </View>

          {/* Main Punch Card */}
          <View style={[styles.punchCard, status === 'Checked In' && { backgroundColor: '#1E3A34' }]}>
            <View style={styles.punchCardHeader}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: (status === 'Checked In' || status === 'Checked Out') ? '#10B981' : '#9CA3AF' }]} />
                <Text style={styles.statusPillText}>{loading ? '...' : getDisplayStatus(status)}</Text>
              </View>
              <Text style={styles.punchCardDate}>{shortDate}</Text>
            </View>

            <View style={styles.clockContainer}>
              <Text style={styles.shiftLabel}>{clockLabel}</Text>
              <Text style={styles.liveClock}>{clockDisplay}</Text>
            </View>

            <View style={styles.punchTimesBox}>
              <View style={styles.punchTimeSection}>
                <Text style={styles.punchTimeLabel}>Punch In</Text>
                <Text style={styles.punchTimeValue}>{punchInTime}</Text>
              </View>
              <View style={styles.punchTimeDivider} />
              <View style={styles.punchTimeSection}>
                <Text style={styles.punchTimeLabel}>Punch Out</Text>
                <Text style={styles.punchTimeValue}>{punchOutTime}</Text>
              </View>
            </View>
          </View>

          {/* Punch Button */}
          <TouchableOpacity 
            style={[
              styles.punchButton, 
              { backgroundColor: buttonColor },
              status === 'Checked Out' && { opacity: 0.9 }
            ]}
            onPress={() => authenticateAndAction(buttonAction)}
            disabled={processing || status === 'Checked Out'}
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <ButtonIcon size={24} color="#ffffff" style={{ marginRight: 10 }} />
                <Text style={styles.punchButtonText}>{buttonText}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* This Week Stats */}
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <ClockIcon size={24} color="#111827" />
              </View>
              <Text style={styles.statValue}>{weeklyHours}</Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <CalendarDaysIcon size={24} color="#111827" />
              </View>
              <Text style={styles.statValue}>{presentDays}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <ArrowTrendingUpIcon size={24} color="#111827" style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
              <Text style={styles.statValue}>{absentDays}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={styles.quickActionCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Leave')}
            >
              <View style={styles.quickActionIconWrap}>
                <PaperAirplaneIcon size={28} color="#9CA3AF" style={{ transform: [{ rotate: '-45deg' }] }} />
              </View>
              <Text style={styles.quickActionTitle}>Apply Leave</Text>
              <Text style={styles.quickActionSub}>Request time off</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('HolidayCalendar')}
            >
              <View style={styles.quickActionIconWrap}>
                <CalendarDaysIcon size={28} color="#9CA3AF" />
              </View>
              <Text style={styles.quickActionTitle}>Holidays</Text>
              <Text style={styles.quickActionSub}>Upcoming schedule</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greetingSub: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  greetingMain: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  greetingDate: {
    fontSize: 15,
    color: '#64748B',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#37474F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  punchCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  punchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  punchCardDate: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
  },
  clockContainer: {
    marginBottom: 40,
  },
  shiftLabel: {
    color: '#9CA3AF',
    fontSize: 15,
    marginBottom: 8,
  },
  liveClock: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  punchTimesBox: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    padding: 20,
  },
  punchTimeSection: {
    flex: 1,
  },
  punchTimeLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  punchTimeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  punchTimeDivider: {
    width: 1,
    backgroundColor: '#4B5563',
    marginHorizontal: 16,
  },
  punchButton: {
    flexDirection: 'row',
    backgroundColor: '#2E4040',
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  punchButtonDisabled: {
    opacity: 0.6,
  },
  punchButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '31%',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconWrap: {
    marginBottom: 16,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  quickActionSub: {
    fontSize: 13,
    color: '#64748B',
  },
});

async function registerForPushNotificationsAsync() {
  if (!Notifications || Constants.appOwnership === 'expo') {
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId: 'attendance-app' })).data;
    } catch (e) {
      console.log('Push Token Error:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }
  return token;
}

export default DashboardScreen;
