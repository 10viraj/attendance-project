import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const AdminDailyReportScreen = ({ route, navigation }) => {
  // `initialTab` can be 'present', 'late', or 'leave' passed from navigation params
  const initialTab = route.params?.initialTab || 'present';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [reportData, setReportData] = useState({ present: [], late: [], leave: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDailyReport = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get('/analytics/daily-report', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDailyReport();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDailyReport();
  };

  const getFilteredData = () => {
    return reportData[activeTab] || [];
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const TabButton = ({ id, label, icon: Icon, count, activeColor }) => {
    const isActive = activeTab === id;
    return (
      <TouchableOpacity 
        style={[styles.tabButton, isActive && { borderBottomColor: activeColor }]} 
        onPress={() => setActiveTab(id)}
      >
        <Icon color={isActive ? activeColor : '#94a3b8'} size={20} />
        <Text style={[styles.tabLabel, isActive && { color: activeColor }]}>{label}</Text>
        {count !== undefined && (
          <View style={[styles.badge, isActive && { backgroundColor: activeColor }]}>
            <Text style={[styles.badgeText, isActive && { color: '#fff' }]}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmployeeCard = ({ item }) => {
    const emp = item.employee;
    if (!emp) return null; // Defensive check

    let primaryText = '';
    let secondaryText = '';

    if (activeTab === 'leave') {
      primaryText = `${item.type} Leave`;
      secondaryText = `Status: ${item.status}`;
    } else {
      primaryText = `Checked in at ${formatTime(item.checkIn?.time)}`;
      secondaryText = item.isLate ? 'Late Arrival' : 'On Time';
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{emp.firstName?.[0] || 'E'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName}>{emp.firstName} {emp.lastName || ''}</Text>
            <Text style={styles.employeeRole}>{emp.employeeId} • {emp.designation || 'Employee'}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.footerPrimary}>{primaryText}</Text>
          <Text style={[
            styles.footerSecondary, 
            activeTab === 'late' && { color: '#f59e0b' },
            activeTab === 'leave' && { color: '#e11d48' }
          ]}>
            {secondaryText}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Report</Text>
        <Text style={styles.headerSub}>Today's Attendance Overview</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TabButton 
          id="present" 
          label="Present" 
          icon={CheckCircleIcon} 
          count={reportData.present.length}
          activeColor="#10b981" 
        />
        <TabButton 
          id="late" 
          label="Late" 
          icon={ClockIcon} 
          count={reportData.late.length}
          activeColor="#f59e0b" 
        />
        <TabButton 
          id="leave" 
          label="On Leave" 
          icon={XCircleIcon} 
          count={reportData.leave.length}
          activeColor="#e11d48" 
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={getFilteredData()}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderEmployeeCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No employees found in this category.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 6,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  listContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  cardInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  footerSecondary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981', // Default for On Time
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default AdminDailyReportScreen;
