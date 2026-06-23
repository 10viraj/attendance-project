import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from 'react-native-heroicons/solid';
import api from '../config/api';

const { width } = Dimensions.get('window');

const HistoryItem = ({ item, index }) => {
  const dateStr = new Date(item.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const checkInTime = item.checkIn?.time ? new Date(item.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const checkOutTime = item.checkOut?.time ? new Date(item.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  
  let StatusIcon = CheckCircleIcon;
  let statusColor = '#10b981'; // emerald-500
  let statusBg = '#d1fae5'; // emerald-100
  
  if (item.status === 'Absent') {
    StatusIcon = XCircleIcon;
    statusColor = '#ef4444'; // red-500
    statusBg = '#fee2e2'; // red-100
  } else if (item.status === 'Half-Day' || item.isLate) {
    StatusIcon = ClockIcon;
    statusColor = '#f59e0b'; // amber-500
    statusBg = '#fef3c7'; // amber-100
  } else if (item.status === 'Week-Off') {
    StatusIcon = CalendarDaysIcon;
    statusColor = '#64748b'; // slate-500
    statusBg = '#f1f5f9'; // slate-100
  }

  return (
    <View style={styles.timelineRow}>
      <View style={styles.cardWrapper}>
        {/* Timeline Dot positioned on the border */}
        <View style={[styles.timelineDot, { borderColor: statusColor, backgroundColor: statusBg }]} />
        
        {/* Card Content */}
        <View style={styles.historyCard}>
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <StatusIcon size={14} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {(item.status === 'Half-Day' || (item.status === 'Present' && item.isLate)) ? 'Half Day' : item.status}
              </Text>
            </View>
          </View>

          {item.status !== 'Absent' && item.status !== 'Week-Off' ? (
            <>
              <View style={styles.timeContainer}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Check In</Text>
                  <Text style={styles.timeValue}>{checkInTime}</Text>
                </View>
                <View style={styles.timeDivider}>
                  <View style={styles.timeDividerDot} />
                  <View style={styles.timeDividerDot} />
                  <View style={styles.timeDividerDot} />
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Check Out</Text>
                  <Text style={styles.timeValue}>{checkOutTime}</Text>
                </View>
              </View>

              {/* Breaks Section */}
              {item.breaks && item.breaks.length > 0 && (
                <View style={styles.breaksContainer}>
                  <View style={styles.breaksHeader}>
                    <ClockIcon size={14} color="#64748b" />
                    <Text style={styles.breaksTitle}>Break Activity</Text>
                  </View>
                  {item.breaks.map((b, i) => {
                    const bStart = b.startTime ? new Date(b.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                    const bEnd = b.endTime ? new Date(b.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Ongoing';
                    return (
                      <View key={i} style={styles.breakRow}>
                        <Text style={styles.breakText}>
                          Break {i + 1}: <Text style={styles.breakHighlight}>{bStart} - {bEnd}</Text>
                        </Text>
                        {b.durationMinutes && (
                          <Text style={styles.breakDuration}>{b.durationMinutes}m</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Working Hours Footer */}
              {item.workingHours > 0 && (
                <View style={styles.cardFooter}>
                  <ChartBarIcon size={16} color="#4f46e5" />
                  <Text style={styles.footerText}>
                    Total Time: <Text style={styles.footerHighlight}>{item.workingHours.toFixed(1)} hrs</Text>
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.absentContainer}>
              <Text style={styles.absentMessage}>
                {item.status === 'Week-Off' 
                  ? 'No attendance required for weekends.' 
                  : 'You did not punch in on this day.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const AttendanceHistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, halfDay: 0 });

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const employeeData = await AsyncStorage.getItem('employeeInfo');
      const emp = employeeData ? JSON.parse(employeeData) : null;
      
      const res = await api.get('/attendance/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const dbData = res.data.data;
        
        // Fill gaps for last 30 days
        const filledData = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let limitDate = thirtyDaysAgo;
        if (emp?.dateOfJoining) {
          const jd = new Date(emp.dateOfJoining);
          if (!isNaN(jd.getTime())) {
            jd.setHours(0,0,0,0);
            limitDate = new Date(Math.max(thirtyDaysAgo.getTime(), jd.getTime()));
          }
        }
        
        for (let d = new Date(today); d >= limitDate; d.setDate(d.getDate() - 1)) {
          const record = dbData.find(h => {
            const hDate = new Date(h.date);
            return hDate.getFullYear() === d.getFullYear() && 
                   hDate.getMonth() === d.getMonth() && 
                   hDate.getDate() === d.getDate();
          });

          if (record) {
            filledData.push(record);
          } else {
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            filledData.push({
              _id: 'gap_' + d.getTime(),
              date: new Date(d).toISOString(),
              status: isWeekend ? 'Week-Off' : 'Absent',
              isLate: false,
              workingHours: 0
            });
          }
        }

        setHistory(filledData);
        calculateStats(filledData);
      }
    } catch (error) {
      if (!error.response || error.response.status !== 401) {
        console.error('Error fetching history:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    let present = 0, absent = 0, halfDay = 0;
    data.forEach(item => {
      if (item.status === 'Absent') {
        absent++;
      } else if (item.status === 'Half-Day' || item.isLate) {
        halfDay++;
      } else if (item.status === 'Present' || item.status === 'Checked In' || item.status === 'Checked Out') {
        present++;
      }
    });
    setStats({ present, absent, halfDay });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />
      
      {/* Premium Header Background */}
      <LinearGradient 
        colors={['#4f46e5', '#3b82f6', '#0ea5e9']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.headerBackground} 
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Attendance History</Text>
          <Text style={styles.headerSubtitle}>Overview of your recent activity</Text>
        </View>

        {/* At-A-Glance Stats Overlapping Header */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#d1fae5' }]}>
              <CheckCircleIcon size={20} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#fef3c7' }]}>
              <ClockIcon size={20} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{stats.halfDay}</Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#fee2e2' }]}>
              <XCircleIcon size={20} color="#ef4444" />
            </View>
            <Text style={styles.statValue}>{stats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CalendarDaysIcon size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySubtitle}>Your attendance records will appear here once you start punching in.</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item._id}
              renderItem={({ item, index }) => <HistoryItem item={item} index={index} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
            />
          )}
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
    height: 240,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  safeArea: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    marginTop: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    zIndex: 10,
  },
  statBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    width: (width - 60) / 3,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  cardWrapper: {
    flex: 1,
    marginLeft: 12,
    paddingLeft: 24,
    paddingBottom: 24,
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
  },
  timelineDot: {
    position: 'absolute',
    left: -9, // 16px width dot, 2px border. Centers the dot on the border.
    top: 24, // Aligns with the date header inside the card
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 2,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  timeBox: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '700',
  },
  timeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 24,
    marginHorizontal: 12,
  },
  timeDividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  breaksContainer: {
    marginTop: 4,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  breaksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breaksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  breakText: {
    fontSize: 12,
    color: '#475569',
  },
  breakHighlight: {
    color: '#1e293b',
    fontWeight: '600',
  },
  breakDuration: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#3730a3',
    fontWeight: '500',
    marginLeft: 8,
  },
  footerHighlight: {
    fontWeight: '700',
    color: '#312e81',
  },
  loader: {
    marginTop: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  absentContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  absentMessage: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  }
});

export default AttendanceHistoryScreen;
