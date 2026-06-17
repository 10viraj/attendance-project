import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from 'react-native-heroicons/solid';
import api from '../config/api';

const AttendanceHistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/attendance/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const date = new Date(item.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const checkInTime = item.checkIn?.time ? new Date(item.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const checkOutTime = item.checkOut?.time ? new Date(item.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    
    let StatusIcon = CheckCircleIcon;
    let statusColor = '#10b981'; // emerald-500
    
    if (item.status === 'Absent') {
      StatusIcon = XCircleIcon;
      statusColor = '#ef4444'; // red-500
    } else if (item.status === 'Half-Day' || item.isLate) {
      StatusIcon = ClockIcon;
      statusColor = '#f59e0b'; // amber-500
    }

    return (
      <View style={styles.historyCard}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{date}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <StatusIcon size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeValue}>{checkInTime}</Text>
            <Text style={styles.methodText}>{item.checkIn?.verificationMethod || '-'}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeValue}>{checkOutTime}</Text>
            <Text style={styles.methodText}>{item.checkOut?.verificationMethod || '-'}</Text>
          </View>
        </View>

        {/* Breaks and Activity Section */}
        {item.breaks && item.breaks.length > 0 && (
          <View style={styles.breaksContainer}>
            <Text style={styles.breaksTitle}>Break Activity</Text>
            {item.breaks.map((b, index) => {
              const bStart = b.startTime ? new Date(b.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
              const bEnd = b.endTime ? new Date(b.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Ongoing';
              
              return (
                <View key={index} style={styles.breakRow}>
                  <View style={styles.breakDot} />
                  <Text style={styles.breakText}>
                    Break {index + 1}: <Text style={styles.breakTimeHighlight}>{bStart} - {bEnd}</Text>
                  </Text>
                  {b.durationMinutes && (
                    <Text style={styles.breakDuration}>({b.durationMinutes} min)</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {item.workingHours > 0 && (
          <View style={styles.workingHoursContainer}>
            <Text style={styles.workingHoursText}>
              Total Worked: <Text style={styles.workingHoursHighlight}>{item.workingHours.toFixed(1)} hrs</Text>
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2563eb" barStyle="light-content" translucent={false} />
      
      <View style={styles.headerBackground} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.greetingMain}>Attendance History</Text>
        </View>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records found.</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
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
    height: 140,
    backgroundColor: '#2563eb',
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
  greetingMain: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 2,
  },
  methodText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  timeDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
  breaksContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  breaksTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginRight: 8,
  },
  breakText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  breakTimeHighlight: {
    color: '#334155',
    fontWeight: '600',
  },
  breakDuration: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  workingHoursContainer: {
    marginTop: 12,
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  workingHoursText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  workingHoursHighlight: {
    fontWeight: '700',
    color: '#2563eb',
  }
});

export default AttendanceHistoryScreen;
