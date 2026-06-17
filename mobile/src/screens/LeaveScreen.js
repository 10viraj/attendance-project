import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDaysIcon, DocumentTextIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../config/api';

const LEAVE_TYPES = ['Casual', 'Sick', 'Earned'];

const LeaveScreen = () => {
  const [activeTab, setActiveTab] = useState('Leave');
  const [records, setRecords] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // DatePicker State
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  const loadData = async (tab) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const endpoint = tab === 'Leave' ? '/leaves' : '/wfh';
      const res = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data.data || []);

      if (tab === 'Leave') {
        const balRes = await api.get('/leaves/balances', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBalances(balRes.data.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(activeTab);
    }, [activeTab])
  );

  const onStartChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setTempStartDate(selectedDate);
      setStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onEndChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setTempEndDate(selectedDate);
      setEndDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all fields (Dates format: YYYY-MM-DD)');
      return;
    }

    if (activeTab === 'Leave' && balances && type !== 'Earned') {
      const typeKey = type.toLowerCase();
      const limit = balances[typeKey].total;
      const used = balances[typeKey].used;
      const requestedDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      if (used + requestedDays > limit) {
        Alert.alert('Limit Exceeded', `You cannot apply for this leave. You only have ${limit - used} ${type} leave(s) remaining this month.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = activeTab === 'Leave' ? { type, startDate, endDate, reason } : { startDate, endDate, reason };
      const endpoint = activeTab === 'Leave' ? '/leaves' : '/wfh';
      
      const res = await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Alert.alert('Success', `${activeTab} application submitted successfully!`);
        setStartDate('');
        setEndDate('');
        setReason('');
        loadData(activeTab);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return '#10b981'; // emerald-500
      case 'Rejected': return '#e11d48'; // rose-600
      default: return '#f59e0b'; // amber-500
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2563eb" barStyle="light-content" translucent={false} />
      <View style={styles.headerBackground} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Requests</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Leave' && styles.tabButtonActive]}
            onPress={() => setActiveTab('Leave')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'Leave' && styles.tabTextActive]}>Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'WFH' && styles.tabButtonActive]}
            onPress={() => setActiveTab('WFH')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'WFH' && styles.tabTextActive]}>Work From Home</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Leave Balances */}
          {activeTab === 'Leave' && balances && (
            <View style={styles.balanceContainer}>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceValue}>{Math.max(0, balances.casual.total - balances.casual.used)}</Text>
                <Text style={styles.balanceLabel}>Casual Left</Text>
                <Text style={styles.balanceSub}>of {balances.casual.total}/mo</Text>
              </View>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceValue}>{Math.max(0, balances.sick.total - balances.sick.used)}</Text>
                <Text style={styles.balanceLabel}>Sick Left</Text>
                <Text style={styles.balanceSub}>of {balances.sick.total}/mo</Text>
              </View>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceValue}>{balances.earned.used}</Text>
                <Text style={styles.balanceLabel}>Earned/Cut</Text>
                <Text style={styles.balanceSub}>Used this mo</Text>
              </View>
            </View>
          )}

          {/* Apply Form Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Apply for {activeTab}</Text>
            
            {activeTab === 'Leave' && (
              <>
                <Text style={styles.inputLabel}>Leave Type</Text>
                <View style={styles.typeContainer}>
                  {LEAVE_TYPES.map((t) => (
                    <TouchableOpacity 
                      key={t}
                      style={[styles.typeButton, type === t && styles.typeButtonActive]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TouchableOpacity 
                  style={[styles.input, { justifyContent: 'center' }]} 
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={{ color: startDate ? '#334155' : '#94a3b8' }}>
                    {startDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={tempStartDate}
                    mode="date"
                    display="default"
                    onChange={onStartChange}
                  />
                )}
              </View>
              
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TouchableOpacity 
                  style={[styles.input, { justifyContent: 'center' }]} 
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={{ color: endDate ? '#334155' : '#94a3b8' }}>
                    {endDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={tempEndDate}
                    mode="date"
                    display="default"
                    onChange={onEndChange}
                    minimumDate={tempStartDate}
                  />
                )}
              </View>
            </View>

            <Text style={styles.inputLabel}>Reason</Text>
            <View style={styles.textAreaWrapper}>
              <DocumentTextIcon color="#64748b" size={20} style={styles.textAreaIcon} />
              <TextInput 
                style={styles.textArea}
                placeholder="Briefly explain your reason..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Leave History */}
          <Text style={styles.historyTitle}>My {activeTab} History</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
          ) : records.length === 0 ? (
            <Text style={styles.emptyText}>You haven't applied for any {activeTab.toLowerCase()} yet.</Text>
          ) : (
            records.map((record) => (
              <View key={record._id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyIconBox}>
                    <CalendarDaysIcon color="#2563eb" size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.historyType}>{activeTab === 'Leave' ? `${record.type} Leave` : 'WFH Request'}</Text>
                    <Text style={styles.historyDates}>
                      {new Date(record.startDate).toLocaleDateString()} - {new Date(record.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(record.status) }]}>{record.status}</Text>
                  </View>
                </View>
                {record.reason && (
                  <Text style={styles.historyReason} numberOfLines={2}>
                    "{record.reason}"
                  </Text>
                )}
                {record.managerRemark && (
                  <View style={styles.remarkBox}>
                    <Text style={styles.remarkText}>HR: {record.managerRemark}</Text>
                  </View>
                )}
              </View>
            ))
          )}

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
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: '#bfdbfe',
    fontWeight: '600',
    fontSize: 15,
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563eb',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
  balanceSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  typeTextActive: {
    color: '#2563eb',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInput: {
    width: '48%',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#334155',
  },
  textAreaWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    marginBottom: 24,
  },
  textAreaIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#334155',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  historyDates: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyReason: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
  },
  remarkBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  remarkText: {
    fontSize: 13,
    color: '#e11d48',
    fontWeight: '500',
  },
});

export default LeaveScreen;
