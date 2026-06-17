import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeftIcon, ChevronRightIcon, DocumentArrowDownIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api from '../../config/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const AdminMonthlyReportScreen = ({ navigation }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEmpId, setExpandedEmpId] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadMonthlyReport = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get(`/analytics/monthly-report?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (error) {
      console.error('Error loading monthly report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMonthlyReport();
    }, [selectedMonth, selectedYear])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMonthlyReport();
  };

  const handlePrevMonth = () => {
    setLoading(true);
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    setLoading(true);
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleExportCSV = async () => {
    if (reportData.length === 0) {
      alert('No data to export!');
      return;
    }

    try {
      const headers = ['Employee Name', 'Employee ID', 'Designation', 'Present Days', 'Late Days', 'Absent Days', 'Total Hours'];
      const csvRows = [headers.join(',')];
      
      reportData.forEach(emp => {
        const row = [
          `"${emp.firstName} ${emp.lastName || ''}"`,
          `"${emp.employeeId}"`,
          `"${emp.designation || ''}"`,
          emp.presentDays,
          emp.lateDays,
          emp.absentDays !== undefined ? emp.absentDays : emp.leaveDays,
          emp.totalWorkingHours
        ];
        csvRows.push(row.join(','));
      });
      
      const csvString = csvRows.join('\n');
      const filename = `Monthly_Report_${MONTHS[selectedMonth - 1]}_${selectedYear}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        alert('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const renderEmployeeCard = ({ item }) => {
    const isExpanded = expandedEmpId === item._id;
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => setExpandedEmpId(isExpanded ? null : item._id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.firstName?.[0] || 'E'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName}>{item.firstName} {item.lastName || ''}</Text>
            <Text style={styles.employeeRole}>{item.employeeId} • {item.designation || 'Employee'}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.presentDays}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{item.lateDays}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#e11d48' }]}>{item.absentDays !== undefined ? item.absentDays : item.leaveDays}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{item.totalWorkingHours}h</Text>
            <Text style={styles.statLabel}>Total Hrs</Text>
          </View>
        </View>

        {isExpanded && item.dailyBreakdown && (
          <View style={styles.expandedSection}>
            <Text style={styles.expandedTitle}>Daily Breakdown</Text>
            <View style={styles.daysGrid}>
              {item.dailyBreakdown.map((day, idx) => {
                let bgColor = '#f8fafc';
                let textColor = '#64748b';
                
                if (day.status === 'Present') { bgColor = '#d1fae5'; textColor = '#047857'; }
                else if (day.status === 'Late') { bgColor = '#fef3c7'; textColor = '#b45309'; }
                else if (day.status === 'Half-Day') { bgColor = '#ffedd5'; textColor = '#c2410c'; }
                else if (day.status === 'On Leave') { bgColor = '#ffe4e6'; textColor = '#be123c'; }
                else if (day.status === 'Absent') { bgColor = '#fee2e2'; textColor = '#b91c1c'; }

                return (
                  <View key={idx} style={styles.dayItem}>
                    <Text style={styles.dayNumber}>{day.day}</Text>
                    <View style={[styles.dayStatusBadge, { backgroundColor: bgColor }]}>
                      <Text style={[styles.dayStatusText, { color: textColor }]}>
                        {day.status === '-' ? '-' : day.status.slice(0, 3)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Report</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <DocumentArrowDownIcon color="#2563eb" size={20} />
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Month Picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
          <ChevronLeftIcon color="#64748b" size={24} />
        </TouchableOpacity>
        
        <View style={styles.monthLabelContainer}>
          <Text style={styles.monthLabelText}>{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
        </View>

        <TouchableOpacity 
          onPress={handleNextMonth} 
          style={styles.monthNavBtn}
          disabled={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()}
        >
          <ChevronRightIcon color={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear() ? '#cbd5e1' : '#64748b'} size={24} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={reportData}
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
                No attendance records found for this month.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exportBtnText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  monthNavBtn: {
    padding: 8,
  },
  monthLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
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
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981', // Default for Present
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
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
  expandedSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  expandedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  dayItem: {
    width: '14.28%', // 7 days per row
    paddingHorizontal: 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  dayStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dayStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

export default AdminMonthlyReportScreen;
