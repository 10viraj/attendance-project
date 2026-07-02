import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert, TextInput, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDaysIcon, PlusIcon, XMarkIcon, BriefcaseIcon, SunIcon, FaceSmileIcon, MinusCircleIcon, ChevronLeftIcon, ChevronRightIcon, DocumentArrowDownIcon } from 'react-native-heroicons/outline';
import { PaperAirplaneIcon } from 'react-native-heroicons/solid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../config/api';

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'Unpaid'];

const LeaveScreen = () => {
  const [activeTab, setActiveTab] = useState('Leave');
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isApplyModalVisible, setApplyModalVisible] = useState(false);
  const [editLeaveId, setEditLeaveId] = useState(null);

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

  const resetForm = () => {
    setType('Casual');
    setStartDate('');
    setEndDate('');
    setReason('');
    setEditLeaveId(null);
    setApplyModalVisible(false);
  };

  const handleEditClick = (record) => {
    setEditLeaveId(record._id);
    setType(record.type);
    setStartDate(new Date(record.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(record.endDate).toISOString().split('T')[0]);
    setReason(record.reason || '');
    setApplyModalVisible(true);
  };

  const handleDeleteClick = (recordId) => {
    Alert.alert(
      'Delete Leave',
      'Are you sure you want to delete this leave request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await api.delete(`/leaves/${recordId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.data.success) {
                Alert.alert('Success', 'Leave request deleted');
                loadData();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete leave');
            }
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (balances) {
      const typeKey = type.toLowerCase();
      const limit = balances[typeKey].total;
      let used = balances[typeKey].used;
      const requestedDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

      if (editLeaveId) {
        const originalLeave = records.find(r => r._id === editLeaveId);
        if (originalLeave && originalLeave.type === type) {
          const originalDays = Math.ceil((new Date(originalLeave.endDate) - new Date(originalLeave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          used -= originalDays;
        }
      }

      if (limit !== 'N/A' && used + requestedDays > limit) {
        Alert.alert('Limit Exceeded', `You cannot apply for this leave. You only have ${limit - used} ${type} leave(s) remaining.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = { type, startDate, endDate, reason };

      let res;
      if (editLeaveId) {
        res = await api.put(`/leaves/${editLeaveId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await api.post('/leaves', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (res.data.success) {
        Alert.alert('Success', editLeaveId ? 'Application updated successfully!' : 'Application submitted successfully!');
        resetForm();
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
    if (balances && balances[typeKey]) {
      const { total, used } = balances[typeKey];
      if (total === 'N/A') return '∞';
      return Math.max(0, total - used);
    }
    return 0;
  };

  const getLeaveIcon = (typeName, isActive) => {
    const color = isActive ? '#FFFFFF' : '#64748B';
    if (typeName === 'Sick') return <BriefcaseIcon color={color} size={24} />;
    if (typeName === 'Casual') return <FaceSmileIcon color={color} size={24} />;
    if (typeName === 'Earned') return <SunIcon color={color} size={24} />;
    if (typeName === 'Unpaid') return <MinusCircleIcon color={color} size={24} />;
    return null;
  };

  const getLeaveDotColor = (typeName) => {
    if (typeName === 'Sick') return '#9F1239';
    if (typeName === 'Casual') return '#9A3412';
    if (typeName === 'Earned') return '#166534';
    if (typeName === 'Unpaid') return '#334155';
    return '#64748B';
  };

  const getFilteredRecords = () => {
    if (filter === 'All') return records;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return records.filter(record => {
      const startDate = new Date(record.startDate);
      const endDate = new Date(record.endDate);

      if (filter === 'Month') {
        const targetMonth = selectedMonth.getMonth();
        const targetYear = selectedMonth.getFullYear();
        const startInMonth = startDate.getMonth() === targetMonth && startDate.getFullYear() === targetYear;
        const endInMonth = endDate.getMonth() === targetMonth && endDate.getFullYear() === targetYear;
        return startInMonth || endInMonth;
      }
      if (filter === 'Week') {
        return (startDate <= endOfWeek && endDate >= startOfWeek);
      }
      return true;
    });
  };

  const filteredRecords = getFilteredRecords();

  const exportToCSV = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/leaves/report', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        let csvContent = 'Emp ID,Name,CL Left,SL Left,EL Left,Used,Total,Status,Recent Leave Type,Recent Leave Reason\n';
        res.data.data.forEach(row => {
          const type = (row.lastLeaveType || '');
          const reason = (row.lastLeaveReason || '').replace(/,/g, ' ');
          csvContent += `${row.empId},${row.name},${row.clLeft},${row.slLeft},${row.elLeft},${row.used},${row.total},${row.status},${type},${reason}\n`;
        });

        const fileUri = FileSystem.documentDirectory + 'EmployeeLeaveBalanceReport.csv';
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Sharing not available', 'Cannot share the CSV on this device');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate Employee Leave Balance Report');
    }
  }; const exportToPDF = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/leaves/report', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.data.success) {
        return Alert.alert('Error', 'Failed to fetch report data');
      }

      const empRecordsMap = {};
      filteredRecords.forEach(record => {
        const empId = (record.employee && record.employee.employeeId) || 'N/A';
        if (!empRecordsMap[empId]) empRecordsMap[empId] = [];
        empRecordsMap[empId].push(record);
      });

      const now = new Date();
      const reportPeriod = `Jan ${now.getFullYear()} - Dec ${now.getFullYear()}`;
      const generatedOn = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let pagesHtml = '';

      res.data.data.forEach((emp, index) => {
        const records = empRecordsMap[emp.empId] || [];

        let historyRows = '';
        records.forEach(record => {
          const type = record.type || '';
          const start = new Date(record.startDate).toLocaleDateString();
          const end = new Date(record.endDate).toLocaleDateString();
          const days = Math.ceil((new Date(record.endDate) - new Date(record.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          const status = record.status || '';
          const reason = record.reason || '';

          historyRows += `
            <tr>
              <td>${emp.empId}</td>
              <td>${emp.name}</td>
              <td>${type}</td>
              <td>${days}</td>
              <td>${start}</td>
              <td>${end}</td>
              <td>${reason}</td>
              <td>${status}</td>
            </tr>
          `;
        });

        if (historyRows === '') {
          historyRows = `<tr><td colspan="8" style="text-align: center;">No leaves found for the selected period.</td></tr>`;
        }

        const pageBreak = index < res.data.data.length - 1 ? '<div class="page-break"></div>' : '';

        pagesHtml += `
          <div class="report-container">
            <div class="header">
              <h2>ABC TECHNOLOGIES PVT. LTD.</h2>
              <h3>EMPLOYEE LEAVE BALANCE REPORT</h3>
            </div>
            
            <table class="info-table">
              <tr><td class="label">Employee ID</td><td>: ${emp.empId}</td></tr>
              <tr><td class="label">Employee Name</td><td>: ${emp.name}</td></tr>
              <tr><td class="label">Department</td><td>: ${emp.department}</td></tr>
              <tr><td class="label">Designation</td><td>: ${emp.designation}</td></tr>
              <tr><td class="label">Report Period</td><td>: ${reportPeriod}</td></tr>
              <tr><td class="label">Generated On</td><td>: ${generatedOn}</td></tr>
            </table>

            <div class="section-title">LEAVE BALANCE SUMMARY</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Allocated</th>
                  <th>Used</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Casual Leave</td>
                  <td>${emp.clAllocated}</td>
                  <td>${emp.clUsed}</td>
                  <td>${emp.clLeft}</td>
                </tr>
                <tr>
                  <td>Sick Leave</td>
                  <td>${emp.slAllocated}</td>
                  <td>${emp.slUsed}</td>
                  <td>${emp.slLeft}</td>
                </tr>
                <tr>
                  <td>Earned Leave</td>
                  <td>${emp.elAllocated}</td>
                  <td>${emp.elUsed}</td>
                  <td>${emp.elLeft}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL</td>
                  <td>${emp.total}</td>
                  <td>${emp.used}</td>
                  <td>${emp.clLeft + emp.slLeft + emp.elLeft}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">LEAVE HISTORY</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Leave Type</th>
                  <th>Days</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>

            <div class="summary-box">
              <p>Total Leave Allocated : ${emp.total} Days</p>
              <p>Total Leave Used      : ${emp.used} Days</p>
              <p>Total Leave Remaining : ${emp.clLeft + emp.slLeft + emp.elLeft} Days</p>
            </div>

            <div class="notes-box">
              <p style="margin: 0 0 5px 0;">Notes:</p>
              <p>• CL = Casual Leave</p>
              <p>• SL = Sick Leave</p>
              <p>• EL = Earned Leave</p>
              <p>• This is a computer-generated report.</p>
            </div>
          </div>
          ${pageBreak}
        `;
      });

      const html = `
        <html>
          <head>
            <style>
              body { font-family: monospace, Consolas, Courier New; font-size: 12px; color: #333; line-height: 1.4; padding: 20px; }
              .page-break { page-break-after: always; }
              .report-container { border: 1px dashed #666; padding: 20px; margin-bottom: 20px; }
              .header { text-align: center; border-bottom: 1px dashed #666; padding-bottom: 10px; margin-bottom: 15px; }
              .header h2, .header h3 { margin: 5px 0; font-weight: normal; }
              .info-table { margin-bottom: 25px; }
              .info-table td { padding: 3px 0; }
              .info-table .label { width: 140px; }
              .section-title { text-align: center; border-top: 1px dashed #666; border-bottom: 1px dashed #666; padding: 5px 0; margin: 20px 0 10px 0; }
              .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
              .data-table th, .data-table td { border-bottom: 1px dashed #999; padding: 8px 4px; text-align: left; }
              .data-table th { font-weight: normal; }
              .data-table .total-row td { border-top: 1px dashed #666; border-bottom: 1px dashed #666; }
              .summary-box { border: 1px dashed #666; padding: 15px; margin-bottom: 25px; }
              .summary-box p { margin: 5px 0; }
              .notes-box { border: 1px dashed #666; padding: 15px; margin-bottom: 30px; }
              .notes-box p { margin: 3px 0; }
              .signatures p { margin: 25px 0; }
            </style>
          </head>
          <body>
            ${pagesHtml}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Sharing not available', 'Cannot share the PDF on this device');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const handleExport = () => {
    Alert.alert(
      'Export Leave Report',
      'Choose format to export',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV (Excel)', onPress: exportToCSV },
        { text: 'PDF', onPress: exportToPDF }
      ]
    );
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

          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableCellHeader, { flex: 1.5, textAlign: 'left' }]}>Leave Type</Text>
              <Text style={styles.tableCellHeader}>Total</Text>
              <Text style={styles.tableCellHeader}>Used</Text>
              <Text style={styles.tableCellHeader}>Left</Text>
            </View>

            {['Casual', 'Sick', 'Earned', 'Unpaid'].map((t, idx) => {
              const b = balances ? balances[t.toLowerCase()] : null;
              const total = b ? b.total : '-';
              const used = b ? b.used : '-';
              const remaining = b ? (b.total === 'N/A' ? 'N/A' : Math.max(0, b.total - b.used)) : '-';
              return (
                <View key={t} style={[styles.tableRow, idx === 3 && { borderBottomWidth: 0 }]}>
                  <Text style={[styles.tableCell, styles.tableCellType, { flex: 1.5 }]}>{t}</Text>
                  <Text style={styles.tableCell}>{total}</Text>
                  <Text style={styles.tableCell}>{used}</Text>
                  <Text style={[styles.tableCell, styles.tableCellBold]}>{remaining}</Text>
                </View>
              );
            })}
          </View>

          {/* RECENT REQUESTS */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.sectionTitleLabel, { marginBottom: 0, marginRight: 12 }]}>RECENT REQUESTS</Text>
              <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
                <DocumentArrowDownIcon size={20} color="#10B981" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
              {['All', 'Week', 'Month'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {filter === 'Month' && (
            <View style={styles.monthSelectorRow}>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(selectedMonth);
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedMonth(newDate);
              }} style={styles.monthArrow}>
                <ChevronLeftIcon size={20} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.monthSelectorText}>
                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity onPress={() => {
                const newDate = new Date(selectedMonth);
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedMonth(newDate);
              }} style={styles.monthArrow}>
                <ChevronRightIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#37474F" style={{ marginTop: 20 }} />
          ) : filteredRecords.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.airplaneIconWrap}>
                <PaperAirplaneIcon color="#64748B" size={48} style={{ transform: [{ rotate: '-45deg' }] }} />
              </View>
              <Text style={styles.emptyStateTitle}>No {filter !== 'All Time' ? filter.toLowerCase() : 'active'} leave requests</Text>
              <Text style={styles.emptyStateSub}>Tap Apply to request time off</Text>
            </View>
          ) : (
            filteredRecords.map((record) => {
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
                  <View style={styles.historyRightCol}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(record.status) }]}>{record.status.toUpperCase()}</Text>
                    </View>
                    {record.status === 'Pending' && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity onPress={() => handleEditClick(record)} style={styles.actionBtn}>
                          <Text style={styles.actionBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteClick(record._id)} style={[styles.actionBtn, styles.actionBtnDelete]}>
                          <Text style={styles.actionBtnTextDelete}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
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
        onRequestClose={resetForm}
      >
        <SafeAreaView style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={resetForm} style={styles.modalCloseBtn}>
                <XMarkIcon color="#0F172A" size={20} />
              </TouchableOpacity>
              <Text style={styles.modalTitleCentered}>{editLeaveId ? 'Update Leave' : 'Apply Leave'}</Text>
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
                  <Text style={styles.modalSubmitBtnText}>{editLeaveId ? 'Update Request' : 'Submit Request'}</Text>
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
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
  },
  tableCellType: {
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'left',
  },
  tableCellBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#0F172A',
  },
  monthSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthArrow: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  monthSelectorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  exportButton: {
    padding: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
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
  historyRightCol: {
    alignItems: 'flex-end',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginLeft: 8,
  },
  actionBtnDelete: {
    backgroundColor: '#FFE4E6',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#37474F',
  },
  actionBtnTextDelete: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E11D48',
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
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
