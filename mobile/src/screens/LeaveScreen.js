import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDaysIcon, PlusIcon, XMarkIcon, BriefcaseIcon, SunIcon, FaceSmileIcon } from 'react-native-heroicons/outline';
import { PaperAirplaneIcon } from 'react-native-heroicons/solid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../config/api';

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned'];

const LeaveScreen = () => {
  const [activeTab, setActiveTab] = useState('Leave');
  const [records, setRecords] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isApplyModalVisible, setApplyModalVisible] = useState(false);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get('/leaves', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data.data || []);

      const balRes = await api.get('/leaves/balances', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalances(balRes.data.data);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
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
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (balances) {
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
      const payload = { type, startDate, endDate, reason };

      const res = await api.post('/leaves', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Alert.alert('Success', 'Application submitted successfully!');
        setStartDate('');
        setEndDate('');
        setReason('');
        setApplyModalVisible(false);
        loadData();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return '#10b981';
      case 'Rejected': return '#e11d48';
      default: return '#f59e0b';
    }
  };

  // Calculate balances using requested limits minus actual usage
  const getDaysLeft = (typeKey) => {
    let limit = 0;
    if (typeKey === 'sick') limit = 5;
    if (typeKey === 'casual') limit = 5;
    if (typeKey === 'earned') limit = 10;

    let used = 0;
    if (balances && balances[typeKey]) {
      used = balances[typeKey].used || 0;
    }

    return Math.max(0, limit - used);
  };

  const getLeaveIcon = (typeName, isActive) => {
    const color = isActive ? '#FFFFFF' : '#64748B';
    if (typeName === 'Sick') return <BriefcaseIcon color={color} size={24} />;
    if (typeName === 'Casual') return <FaceSmileIcon color={color} size={24} />;
    if (typeName === 'Earned') return <SunIcon color={color} size={24} />;
    return null;
  };

  const getLeaveDotColor = (typeName) => {
    if (typeName === 'Sick') return '#9F1239';
    if (typeName === 'Casual') return '#9A3412';
    if (typeName === 'Earned') return '#166534';
    return '#64748B';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <SafeAreaView style={styles.safeArea}>

        {/* Header Section */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Leaves</Text>
            <Text style={styles.headerSubtitle}>Manage your time off</Text>
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            activeOpacity={0.8}
            onPress={() => setApplyModalVisible(true)}
          >
            <PlusIcon color="#FFFFFF" size={20} style={{ marginRight: 6 }} />
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* LEAVE BALANCE */}
          <Text style={styles.sectionTitleLabel}>LEAVE BALANCE</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceContainer}>
            {/* Sick Leave Card */}
            <View style={styles.balanceCard}>
              <View style={[styles.badgePill, { backgroundColor: '#FFE4E6' }]}>
                <Text style={[styles.badgeText, { color: '#9F1239' }]}>Sick</Text>
              </View>
              <Text style={styles.balanceValue}>{getDaysLeft('sick')}</Text>
              <Text style={styles.balanceSub}>days left</Text>
            </View>

            {/* Casual Leave Card */}
            <View style={styles.balanceCard}>
              <View style={[styles.badgePill, { backgroundColor: '#FFEDD5' }]}>
                <Text style={[styles.badgeText, { color: '#9A3412' }]}>Casual</Text>
              </View>
              <Text style={styles.balanceValue}>{getDaysLeft('casual')}</Text>
              <Text style={styles.balanceSub}>days left</Text>
            </View>

            {/* Earned Leave Card */}
            <View style={styles.balanceCard}>
              <View style={[styles.badgePill, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.badgeText, { color: '#166534' }]}>Earned</Text>
              </View>
              <Text style={styles.balanceValue}>{getDaysLeft('earned')}</Text>
              <Text style={styles.balanceSub}>days left</Text>
            </View>
          </ScrollView>

          {/* RECENT REQUESTS */}
          <Text style={styles.sectionTitleLabel}>RECENT REQUESTS</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#37474F" style={{ marginTop: 20 }} />
          ) : records.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.airplaneIconWrap}>
                <PaperAirplaneIcon color="#64748B" size={48} style={{ transform: [{ rotate: '-45deg' }] }} />
              </View>
              <Text style={styles.emptyStateTitle}>No active leave requests</Text>
              <Text style={styles.emptyStateSub}>Tap Apply to request time off</Text>
            </View>
          ) : (
            records.map((record) => {
              const startStr = new Date(record.startDate).toISOString().split('T')[0];
              const endStr = new Date(record.endDate).toISOString().split('T')[0];
              const days = Math.ceil((new Date(record.endDate) - new Date(record.startDate)) / (1000 * 60 * 60 * 24)) + 1;
              
              return (
                <View key={record._id} style={styles.historyCard}>
                  <View style={[styles.historyDot, { backgroundColor: getLeaveDotColor(record.type) }]} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyType}>{record.type} Leave</Text>
                    <Text style={styles.historyDates}>
                      {startStr} → {endStr} • {days}d
                    </Text>
                    {record.reason && (
                      <Text style={styles.historyReason} numberOfLines={2}>
                        {record.reason}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(record.status) }]}>{record.status.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Application Form Modal */}
      <Modal
        visible={isApplyModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <SafeAreaView style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={() => setApplyModalVisible(false)} style={styles.modalCloseBtn}>
                <XMarkIcon color="#0F172A" size={20} />
              </TouchableOpacity>
              <Text style={styles.modalTitleCentered}>Apply Leave</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalFormContent}>

              {/* Leave Type Cards */}
              <Text style={styles.modalInputLabel}>Leave Type</Text>
              <View style={styles.typeCardRow}>
                {LEAVE_TYPES.map((t) => {
                  const isActive = type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeCard, isActive && styles.typeCardActive]}
                      onPress={() => setType(t)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.typeIconBg, isActive && styles.typeIconBgActive]}>
                        {getLeaveIcon(t, isActive)}
                      </View>
                      <Text style={[styles.typeCardText, isActive && styles.typeCardTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Start Date */}
              <Text style={styles.modalInputLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.fullInput}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.inputText}>
                  {startDate || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display="default"
                  onChange={onStartChange}
                  minimumDate={new Date()}
                />
              )}

              {/* End Date */}
              <Text style={styles.modalInputLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.fullInput}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.inputText}>
                  {endDate || 'YYYY-MM-DD'}
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

              {/* Reason */}
              <Text style={styles.modalInputLabel}>Reason</Text>
              <TextInput
                style={styles.reasonTextArea}
                placeholder="Why are you requesting this leave?"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={reason}
                onChangeText={setReason}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>

            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#37474F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionTitleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 16,
  },
  balanceContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingRight: 24,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: 150,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -1,
  },
  balanceSub: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  airplaneIconWrap: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyStateSub: {
    fontSize: 15,
    color: '#64748B',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 16,
  },
  historyContent: {
    flex: 1,
    marginRight: 16,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  historyDates: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historyReason: {
    fontSize: 14,
    color: '#475569',
  },

  // FULL SCREEN MODAL STYLES
  fullModalOverlay: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  fullModalContent: {
    flex: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitleCentered: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalFormContent: {
    padding: 24,
    paddingBottom: 40,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  typeCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  typeCardActive: {
    borderColor: '#B45309', // Brown/Orange border
    borderWidth: 2,
  },
  typeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeIconBgActive: {
    backgroundColor: '#B45309', // Brown/Orange fill
  },
  typeCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  typeCardTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  fullInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
    marginBottom: 24,
  },
  inputText: {
    fontSize: 16,
    color: '#0F172A',
  },
  reasonTextArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 32,
  },
  modalSubmitBtn: {
    backgroundColor: '#37474F',
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LeaveScreen;
