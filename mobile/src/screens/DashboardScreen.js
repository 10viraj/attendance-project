import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ClockIcon, CalendarDaysIcon, CheckCircleIcon, FingerPrintIcon, StarIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
  const [attendancePercent, setAttendancePercent] = useState('0');
  const [weeklyHours, setWeeklyHours] = useState('0h 0m');
  const [shiftName, setShiftName] = useState('Loading...');
  const [shiftTime, setShiftTime] = useState('--:--');

  const [announcements, setAnnouncements] = useState([]);

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
        setStatus(statusRes.data.status || 'Not Checked In');

        // Fetch Announcements
        try {
          const annRes = await api.get('/announcements', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (annRes.data.success) {
            setAnnouncements(annRes.data.data);
          }
        } catch (annErr) {
          console.error('Error loading announcements:', annErr);
        }

        // Fetch Employee Stats
        try {
          const statsRes = await api.get('/attendance/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (statsRes.data.success) {
            setAttendancePercent(statsRes.data.data.attendancePercentage.toString());
            setWeeklyHours(statsRes.data.data.weeklyHoursFormatted);
            setShiftName(statsRes.data.data.shiftName);
            setShiftTime(statsRes.data.data.shiftTime);
          }
        } catch (statsErr) {
          console.error('Error loading stats:', statsErr);
        }
      }
    } catch (error) {
      if (!error.response || error.response.status !== 401) {
        console.error('Error loading dashboard data:', error);
      }
      setStatus('Error loading status');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Determine time of day for greeting
  const hour = new Date().getHours();
  let greeting = 'Good Evening';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
  } else if (hour >= 17 && hour < 20) {
    greeting = 'Good Evening';
  } else {
    greeting = 'Good Night';
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />
      {/* Background Decorator */}
      <LinearGradient
        colors={['#4f46e5', '#3b82f6', '#0ea5e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              {/* <Text style={styles.greetingSub}>{timeTheme.greeting},</Text> */}
              <Text style={styles.greetingMain}>
                {employee ? `${employee.firstName} ${employee.lastName}` : 'User'}
              </Text>
            </View>
          </View>

          {/* Quick Check-In Card */}
          <View style={[styles.primaryCard, { shadowColor: '#4f46e5' }]}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>Current Status</Text>
                <Text style={[styles.statusValue, { color: '#3b82f6' }]}>
                  {loading ? <ActivityIndicator color="#3b82f6" size="small" /> : status}
                </Text>
                <Text style={styles.shiftInfo}>
                  Shift: {shiftName} ({shiftTime})
                </Text>
              </View>
              <View style={[styles.iconBoxLight, { backgroundColor: '#e0f2fe' }]}>
                <ClockIcon color="#3b82f6" size={24} />
              </View>
            </View>

            {status !== 'Checked In' && status !== 'Checked Out' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4f46e5', '#3b82f6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <FingerPrintIcon color="#ffffff" size={20} />
                  <Text style={styles.actionButtonTextGradient}>Punch to Check In</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { marginRight: 8 }]}>
              <View style={[styles.iconBoxSoft, { backgroundColor: '#d1fae5' }]}>
                <CheckCircleIcon color="#10b981" size={22} />
              </View>
              <Text style={styles.statLabel}>ATTENDANCE</Text>
              <Text style={styles.statValue}>{attendancePercent}%</Text>
            </View>

            <View style={[styles.statCard, { marginLeft: 8 }]}>
              <View style={[styles.iconBoxSoft, { backgroundColor: '#dbeafe' }]}>
                <ClockIcon color="#3b82f6" size={22} />
              </View>
              <Text style={styles.statLabel}>HOURS THIS WEEK</Text>
              <Text style={styles.statValue}>{weeklyHours}</Text>
            </View>
          </View>

          {/* Announcements Card */}
          {announcements && announcements.length > 0 && (
            <View style={styles.announcementCard}>
              <View style={styles.announcementHeader}>
                <Text style={styles.sectionTitle}>Company Notice</Text>
              </View>
              {announcements.slice(0, 2).map((ann, idx) => (
                <View key={idx} style={styles.announcementItem}>
                  <Text style={styles.announcementTitle}>{ann.title}</Text>
                  <Text style={styles.announcementMessage}>{ann.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Leave')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBoxMedium, { backgroundColor: '#ffe4e6' }]}>
                <CalendarDaysIcon color="#e11d48" size={24} />
              </View>
              <Text style={styles.quickActionText}>Apply Leave</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('HolidayCalendar')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBoxMedium, { backgroundColor: '#ffedd5' }]}>
                <StarIcon color="#ea580c" size={24} />
              </View>
              <Text style={styles.quickActionText}>Holidays</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Attendance')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBoxMedium, { backgroundColor: '#f3e8ff' }]}>
                <FingerPrintIcon color="#9333ea" size={24} />
              </View>
              <Text style={styles.quickActionText}>Punch</Text>
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
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 20,
    color: '#bfdbfe', // primary-200
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greetingMain: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  primaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  shiftInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 6,
  },
  iconBoxLight: {
    padding: 14,
    borderRadius: 16,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20, // pill-like shape
  },
  actionButtonTextGradient: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBoxSoft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginHorizontal: 4, // Spacing between cards
  },
  iconBoxMedium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  announcementMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
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
