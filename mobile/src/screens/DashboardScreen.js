import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClockIcon, CameraIcon, CalendarDaysIcon, CheckCircleIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../config/api';

const DashboardScreen = ({ navigation }) => {
  const [employee, setEmployee] = useState(null);
  const [status, setStatus] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [attendancePercent, setAttendancePercent] = useState('0');
  const [weeklyHours, setWeeklyHours] = useState('0h 0m');

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const employeeData = await AsyncStorage.getItem('employeeInfo');
      const token = await AsyncStorage.getItem('userToken');
      if (employeeData) setEmployee(JSON.parse(employeeData));

      if (token) {
        // Fetch Today's Status
        const statusRes = await api.get('/attendance/today', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus(statusRes.data.status || 'Not Checked In');

        // Fetch Employee Stats
        try {
          const statsRes = await api.get('/attendance/stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (statsRes.data.success) {
            setAttendancePercent(statsRes.data.data.attendancePercentage.toString());
            setWeeklyHours(statsRes.data.data.weeklyHoursFormatted);
          }
        } catch (statsErr) {
          console.error('Error loading stats:', statsErr);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2563eb" barStyle="light-content" translucent={false} />
      {/* Background Decorator */}
      <View style={styles.headerBackground} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingSub}>Good Morning</Text>
              <Text style={styles.greetingMain}>
                {employee ? `${employee.firstName} ${employee.lastName}` : 'User'}
              </Text>
            </View>
          </View>

          {/* Quick Check-In Card */}
          <View style={styles.primaryCard}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>Current Status</Text>
                <Text style={styles.statusValue}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : status}
                </Text>
              </View>
              <View style={styles.iconBoxLight}>
                <ClockIcon color="#fff" size={24} />
              </View>
            </View>

            {status !== 'Checked In' && status !== 'Checked Out' && (
              <TouchableOpacity
                style={styles.actionButtonLight}
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.8}
              >
                <CameraIcon color="#2563eb" size={20} />
                <Text style={styles.actionButtonTextPrimary}>Scan QR to Check In</Text>
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
              onPress={() => navigation.navigate('Attendance')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBoxMedium, { backgroundColor: '#fef3c7' }]}>
                <CameraIcon color="#d97706" size={24} />
              </View>
              <Text style={styles.quickActionText}>Face Scan</Text>
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
    height: 180,
    backgroundColor: '#2563eb', // primary-600
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
    backgroundColor: '#3b82f6', // primary-500
    borderRadius: 24,
    padding: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#eff6ff', // primary-50
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  iconBoxLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 16,
  },
  actionButtonLight: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionButtonTextPrimary: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
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
    marginHorizontal: 6, // Spacing between cards
  },
  iconBoxMedium: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
});

export default DashboardScreen;
