import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  FlatList,
  Platform,
  Animated,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  ClockIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChartBarIcon,
} from 'react-native-heroicons/outline';
import { CheckCircleIcon, XCircleIcon } from 'react-native-heroicons/solid';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../config/api';
import socket from '../../config/socket';

const { width } = Dimensions.get('window');

// ---------- Minimalist Executive Grayscale Tokens ----------
const COLORS = {
  bg: '#F9FAFB',           // Crisp ultra-light gray background
  card: '#FFFFFF',         // Pure white cards
  border: '#E5E7EB',       // Crisp neutral border
  borderLight: '#F3F4F6',  // Subtle separator line
  text: '#111827',         // Deep charcoal / near-black text
  subtext: '#4B5563',      // Slate gray for secondary text
  muted: '#9CA3AF',        // Muted gray for timestamps and labels
  primary: '#111827',      // Executive Black for primary actions
  primarySoft: '#F3F4F6',  // Light gray hover/fill state
  danger: '#4B5563',       // Subdued slate for destructive actions
  dangerSoft: '#F3F4F6',   // Soft gray fill
  success: '#111827',      // High contrast dark for positive status
  successSoft: '#F3F4F6',  // Soft gray fill
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const CustomDropdown = ({ label, items, selectedValue, onValueChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = items.find(i => i._id === selectedValue);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.textInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={() => setIsOpen(true)}
      >
        <Text style={{ color: selectedItem ? COLORS.text : COLORS.muted, fontSize: 14 }}>
          {selectedItem ? selectedItem.name : placeholder}
        </Text>
        <ChevronRightIcon color={COLORS.muted} size={18} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}
          onPress={() => setIsOpen(false)}
          activeOpacity={1}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 12, maxHeight: 400, width: '100%', maxWidth: 360, alignSelf: 'center', overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text }}>Select {label}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <XMarkIcon color={COLORS.muted} size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {items.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.muted }}>No items found</Text>
                </View>
              ) : null}
              {items.map(item => (
                <TouchableOpacity
                  key={item._id}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}
                  onPress={() => {
                    onValueChange(item._id);
                    setIsOpen(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: selectedValue === item._id ? COLORS.primary : COLORS.text, fontWeight: selectedValue === item._id ? '600' : '400' }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const AdminEmployeeDetailScreen = ({ route, navigation }) => {
  const employee = route?.params?.employee || {};
  const [employeeData, setEmployeeData] = useState(employee);
  const [isDeleting, setIsDeleting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // Animations
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMonthPickerModal, setShowMonthPickerModal] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Editing form state
  const [editFirstName, setEditFirstName] = useState(employee.firstName || '');
  const [editLastName, setEditLastName] = useState(employee.lastName || '');
  const [editPhone, setEditPhone] = useState(employee.phone || '');
  const [editEmail, setEditEmail] = useState(employee.user?.email || '');
  const [editDesignation, setEditDesignation] = useState(employee.designation || employee.position || '');
  const [editDept, setEditDept] = useState(employee.department?._id || '');
  const [editShift, setEditShift] = useState(employee.shift?._id || '');
  const [editCompany, setEditCompany] = useState(employee.organization?._id || '');
  const [editPassword, setEditPassword] = useState('');
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (employee?._id && employee._id !== employeeData?._id) {
      setEmployeeData(employee);
      setEditFirstName(employee.firstName || '');
      setEditLastName(employee.lastName || '');
      setEditPhone(employee.phone || '');
      setEditEmail(employee.user?.email || '');
      setEditDesignation(employee.designation || employee.position || '');
      setEditDept(employee.department?._id || '');
      setEditShift(employee.shift?._id || '');
      setEditCompany(employee.organization?._id || '');
      setEditPassword('');

      fade.setValue(0);
      slide.setValue(12);
    }

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [employee?._id, fade, slide]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!employeeData._id) return;
      setLoadingHistory(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await api.get(
          `/attendance/admin/employee/${employeeData._id}?month=${selectedMonth}&year=${selectedYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHistory(res.data.data || []);
      } catch (error) {
        console.error('Error fetching employee history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();

    const handleAttendanceUpdate = (data) => {
      if (data.employeeId === employeeData.employeeId || data.employeeId === employeeData._id) {
        fetchHistory();
      }
    };

    socket.on('attendanceUpdate', handleAttendanceUpdate);
    return () => socket.off('attendanceUpdate', handleAttendanceUpdate);
  }, [employeeData._id, employeeData.employeeId, selectedMonth, selectedYear]);

  // Set default selected day when month changes
  useEffect(() => {
    const today = new Date();
    if (today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const [deptRes, shiftRes, compRes] = await Promise.all([
          api.get('/departments', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          api.get('/shifts', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          api.get('/organization', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
        ]);
        if (deptRes.data?.success) setDepartments(deptRes.data.data);
        if (shiftRes.data?.success) setShifts(shiftRes.data.data);
        if (compRes.data?.success) setCompanies(compRes.data.data);
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };
    fetchFormData();
  }, []);

  const handleUpdate = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      Alert.alert('Validation Error', 'First and Last names are required');
      return;
    }
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.put(
        `/employees/${employeeData._id}`,
        {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          designation: editDesignation.trim(),
          department: editDept || undefined,
          shift: editShift || undefined,
          organization: editCompany || undefined,
          password: editPassword.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        Alert.alert('Success', 'Employee details updated successfully');
        setShowEditModal(false);
        setEditPassword('');
        const selectedDeptObj = departments.find((d) => d._id === editDept);
        const selectedShiftObj = shifts.find((s) => s._id === editShift);
        const selectedCompObj = companies.find((c) => c._id === editCompany);
        setEmployeeData((prev) => ({
          ...prev,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          phone: editPhone.trim(),
          user: { ...prev.user, email: editEmail.trim() },
          designation: editDesignation.trim(),
          position: editDesignation.trim(),
          department: selectedDeptObj ? { _id: editDept, name: selectedDeptObj.name } : prev.department,
          organization: selectedCompObj ? { _id: editCompany, name: selectedCompObj.name } : prev.organization,
          shift: selectedShiftObj
            ? {
              _id: editShift,
              name: selectedShiftObj.name,
              startTime: selectedShiftObj.startTime,
              endTime: selectedShiftObj.endTime,
            }
            : prev.shift,
        }));
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update employee details');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to completely remove ${employeeData.firstName} ${employeeData.lastName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await api.delete(`/employees/${employeeData._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.data.success) {
                Alert.alert('Success', 'Employee deleted successfully');
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete employee');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (t) => (t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');

  const stats = useMemo(() => {
    const present = history.filter((h) => h.status === 'Present').length;
    const absent = history.filter((h) => h.status === 'Absent').length;
    const totalHours = history.reduce((sum, h) => sum + (h.workingHours || 0), 0);
    return { present, absent, avgHours: history.length ? (totalHours / history.length).toFixed(1) : '0.0' };
  }, [history]);

  // =========================================================================
  // ROCK-SOLID WEEKS CHUNKING LOGIC (Guarantees exactly 7 columns per row)
  // =========================================================================
  const calendarWeeks = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 is Sunday

    const historyMap = {};
    history.forEach((h) => {
      if (h.date) {
        const d = new Date(h.date);
        if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear) {
          historyMap[d.getDate()] = h;
        }
      }
    });

    const days = [];
    // Add empty placeholders for starting day offset (Su to 1st of month)
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ empty: true, key: `start-empty-${i}` });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        record: historyMap[day] || null,
        key: `day-${day}`,
      });
    }

    // Pad the end of the last row so it equals a multiple of 7
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let i = 0; i < remainingSlots; i++) {
      days.push({ empty: true, key: `end-empty-${i}` });
    }

    // Chunk array into rows of 7
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [selectedMonth, selectedYear, history]);

  // Find record for currently clicked day in calendar
  const selectedDayRecord = useMemo(() => {
    for (const week of calendarWeeks) {
      for (const item of week) {
        if (!item.empty && item.day === selectedDay) {
          return item.record || null;
        }
      }
    }
    return null;
  }, [calendarWeeks, selectedDay]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const DetailRow = ({ icon: Icon, label, value, onPress }) => {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper style={styles.detailRow} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.iconBox}>
          <Icon color={COLORS.text} size={18} strokeWidth={2} />
        </View>
        <View style={styles.detailTextContainer}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {value || 'Not provided'}
          </Text>
        </View>
        {onPress && <ChevronRightIcon color={COLORS.muted} size={18} />}
      </Wrapper>
    );
  };

  if (!employeeData || !employeeData._id) return null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.card} barStyle="dark-content" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Navigation Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('AdminEmployees')} activeOpacity={0.7}>
            <ChevronLeftIcon color={COLORS.text} size={20} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Employee Profile</Text>
            <Text style={styles.headerSubtitle}>{employeeData.employeeId}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowEditModal(true)} activeOpacity={0.7}>
              <PencilIcon color={COLORS.text} size={16} strokeWidth={2.2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <TrashIcon color={COLORS.text} size={16} strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>

            {/* Hero Profile Card */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#111827', '#1F2937', '#374151']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileBanner}
              />

              <View style={styles.avatarContainer}>
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {employeeData.firstName?.[0]}
                    {employeeData.lastName?.[0]}
                  </Text>
                </View>
                {employeeData.isActive ? (
                  <View style={[styles.avatarBadge, { backgroundColor: '#111827' }]}>
                    <CheckBadgeIcon color="#FFF" size={14} />
                  </View>
                ) : (
                  <View style={[styles.avatarBadge, { backgroundColor: '#6B7280' }]}>
                    <XMarkIcon color="#FFF" size={12} strokeWidth={3} />
                  </View>
                )}
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.employeeName}>
                  {employeeData.firstName} {employeeData.lastName}
                </Text>
                <Text style={styles.employeeRole}>
                  {employeeData.designation || employeeData.position || 'No designation'}
                  {employeeData.department?.name ? ` • ${employeeData.department.name}` : ''}
                </Text>

                <View style={styles.statusPill}>
                  <View style={[styles.statusDot, { backgroundColor: employeeData.isActive ? '#111827' : '#9CA3AF' }]} />
                  <Text style={styles.statusText}>
                    {employeeData.isActive ? 'Active Employee' : 'Inactive Account'}
                  </Text>
                </View>

                {/* Quick Actions Bar */}
                <View style={styles.quickActionsBar}>
                  <TouchableOpacity
                    style={[styles.quickActionBtn, !employeeData.user?.email && styles.quickActionBtnDisabled]}
                    onPress={() => employeeData.user?.email && Linking.openURL(`mailto:${employeeData.user.email}`)}
                    disabled={!employeeData.user?.email}
                    activeOpacity={0.7}
                  >
                    <EnvelopeIcon color={employeeData.user?.email ? COLORS.text : COLORS.muted} size={18} />
                    <Text style={[styles.quickActionText, !employeeData.user?.email && styles.quickActionTextDisabled]}>
                      Send Email
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.actionDivider} />

                  <TouchableOpacity
                    style={[styles.quickActionBtn, !employeeData.phone && styles.quickActionBtnDisabled]}
                    onPress={() => employeeData.phone && Linking.openURL(`tel:${employeeData.phone}`)}
                    disabled={!employeeData.phone}
                    activeOpacity={0.7}
                  >
                    <PhoneIcon color={employeeData.phone ? COLORS.text : COLORS.muted} size={18} />
                    <Text style={[styles.quickActionText, !employeeData.phone && styles.quickActionTextDisabled]}>
                      Call Phone
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Attendance Analytics Header Bar */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeading}>Monthly Performance</Text>

              {/* ======================================================== */}
              {/* EXACT PILL DESIGN: <   Jul 2026 ▼   > */}
              {/* ======================================================== */}

              {/* ======================================================== */}
            </View>



            {/* Information Grids */}
            <View style={styles.gridContainer}>
              <View style={[styles.card, styles.gridItem]}>
                <Text style={styles.cardTitle}>Contact Details</Text>
                <DetailRow icon={EnvelopeIcon} label="Email Address" value={employeeData.user?.email} />
                <DetailRow icon={PhoneIcon} label="Phone Number" value={employeeData.phone} />
                <DetailRow
                  icon={MapPinIcon}
                  label="Physical Address"
                  value={
                    employeeData.address
                      ? `${employeeData.address.street || ''}, ${employeeData.address.city || ''}`
                      : null
                  }
                />
              </View>

              <View style={[styles.card, styles.gridItem]}>
                <Text style={styles.cardTitle}>Employment Profile</Text>
                <DetailRow icon={BuildingOffice2Icon} label="Company" value={employeeData.organization?.name} />
                <DetailRow icon={BriefcaseIcon} label="Department" value={employeeData.department?.name} />
                <DetailRow icon={CheckBadgeIcon} label="Designation" value={employeeData.designation || employeeData.position} />
                <DetailRow
                  icon={ClockIcon}
                  label="Assigned Shift"
                  value={
                    employeeData.shift
                      ? `${employeeData.shift.name} (${employeeData.shift.startTime} - ${employeeData.shift.endTime})`
                      : null
                  }
                />
                <DetailRow icon={CalendarDaysIcon} label="Date of Joining" value={formatDate(employeeData.dateOfJoining)} />
                <DetailRow icon={CurrencyDollarIcon} label="Base Salary" value={employeeData.salary ? `$${employeeData.salary.toLocaleString()}` : null} />
              </View>
            </View>

            {/* ======================================================== */}
            {/* PERFECT RESPONSIVE CALENDAR WITH BORDER SYSTEM */}
            {/* ======================================================== */}
            <View style={styles.card}>
              <View style={[styles.cardHeaderRow, { flexWrap: 'wrap', gap: 12 }]}>
                <View>
                  <Text style={styles.cardTitle}>Attendance Logs</Text>
                  <Text style={styles.cardSubtitle}>Interactive monthly grid and shift inspections</Text>
                </View>
                <View style={styles.monthPillContainer}>
                  <TouchableOpacity onPress={handlePrevMonth} style={styles.pillArrowBtn} activeOpacity={0.6}>
                    <ChevronLeftIcon size={16} strokeWidth={2.8} color={COLORS.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pillCenterBtn}
                    onPress={() => {
                      setPickerYear(selectedYear);
                      setShowMonthPickerModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pillText}>
                      {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={styles.pillTriangle}>▼</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleNextMonth} style={styles.pillArrowBtn} activeOpacity={0.6}>
                    <ChevronRightIcon size={16} strokeWidth={2.8} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendPresent]} />
                    <Text style={styles.legendText}>Present</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendAbsent]} />
                    <Text style={styles.legendText}>Absent</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.legendWeekday]} />
                    <Text style={styles.legendText}>Weekday</Text>
                  </View>
                </View>
              </View>

              {/* Metric Cards Grid */}
              <View style={[styles.metricsGrid, { marginBottom: 24 }]}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIconWrap}>
                    <CheckCircleIcon color={COLORS.text} size={20} />
                  </View>
                  <Text style={styles.metricValue}>{stats.present}</Text>
                  <Text style={styles.metricLabel}>Days Present</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIconWrap}>
                    <XCircleIcon color={COLORS.subtext} size={20} />
                  </View>
                  <Text style={styles.metricValue}>{stats.absent}</Text>
                  <Text style={styles.metricLabel}>Days Absent</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIconWrap}>
                    <ChartBarIcon color={COLORS.text} size={20} />
                  </View>
                  <Text style={styles.metricValue}>{stats.avgHours}h</Text>
                  <Text style={styles.metricLabel}>Daily Average</Text>
                </View>
              </View>

              {loadingHistory ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={COLORS.text} size="large" />
                  <Text style={styles.loadingText}>Loading calendar data...</Text>
                </View>
              ) : (
                <View>
                  {/* Days of Week Header */}
                  <View style={styles.weekDaysRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
                      <View key={idx} style={styles.weekDayHeaderCell}>
                        <Text style={styles.weekDayText}>{day}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Calendar Grid Cells (Rendered Week-by-Week) */}
                  <View style={styles.calendarGrid}>
                    {calendarWeeks.map((week, weekIdx) => (
                      <View key={`week-${weekIdx}`} style={styles.weekRow}>
                        {week.map((item) => {
                          if (item.empty) {
                            return <View key={item.key} style={styles.calendarCellEmpty} />;
                          }

                          const isSelected = item.day === selectedDay;
                          const isPresent = item.record?.status === 'Present';
                          const isAbsent = item.record?.status === 'Absent';
                          const isWeekday = !isPresent && !isAbsent;

                          return (
                            <TouchableOpacity
                              key={item.key}
                              style={[
                                styles.calendarCell,
                                isWeekday && styles.cellWeekday,
                                isPresent && styles.cellPresent,
                                isAbsent && styles.cellAbsent,
                                isSelected && styles.cellSelected,
                              ]}
                              onPress={() => setSelectedDay(item.day)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.cellDayText,
                                  isSelected && styles.cellTextSelected,
                                ]}
                              >
                                {item.day}
                              </Text>
                              {item.record && (
                                <View
                                  style={[
                                    styles.cellStatusDot,
                                    { backgroundColor: isPresent ? '#10B981' : '#EF4444' },
                                  ]}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  {/* Interactive Selected Day Detail Breakdown */}
                  <View style={styles.dayDetailCard}>
                    <View style={styles.dayDetailHeader}>
                      <Text style={styles.dayDetailTitle}>
                        {new Date(selectedYear, selectedMonth - 1, selectedDay).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <View
                        style={[
                          styles.detailStatusBadge,
                          {
                            backgroundColor:
                              selectedDayRecord?.status === 'Present'
                                ? '#ECFDF5'
                                : selectedDayRecord?.status === 'Absent'
                                  ? '#FEF2F2'
                                  : '#F3F4F6',
                            borderColor:
                              selectedDayRecord?.status === 'Present'
                                ? '#10B981'
                                : selectedDayRecord?.status === 'Absent'
                                  ? '#EF4444'
                                  : '#E5E7EB',
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.detailStatusText,
                            {
                              color:
                                selectedDayRecord?.status === 'Present'
                                  ? '#065F46'
                                  : selectedDayRecord?.status === 'Absent'
                                    ? '#991B1B'
                                    : '#4B5563',
                            },
                          ]}
                        >
                          {selectedDayRecord?.status ? selectedDayRecord.status.toUpperCase() : 'WEEKDAY / NO RECORD'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dayDetailStatsRow}>
                      <View style={styles.detailStatBlock}>
                        <Text style={styles.detailStatLabel}>CHECK IN</Text>
                        <Text style={styles.detailStatValue}>
                          {formatTime(selectedDayRecord?.checkIn?.time)}
                        </Text>
                      </View>

                      <View style={styles.detailDivider} />

                      <View style={styles.detailStatBlock}>
                        <Text style={styles.detailStatLabel}>CHECK OUT</Text>
                        <Text style={styles.detailStatValue}>
                          {formatTime(selectedDayRecord?.checkOut?.time)}
                        </Text>
                      </View>

                      <View style={styles.detailDivider} />

                      <View style={styles.detailStatBlock}>
                        <Text style={styles.detailStatLabel}>TOTAL HOURS</Text>
                        <Text style={styles.detailStatValue}>
                          {selectedDayRecord?.workingHours
                            ? `${selectedDayRecord.workingHours.toFixed(1)}h`
                            : '--'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* ======================================================== */}
      {/* MONTH & YEAR PICKER MODAL */}
      {/* ======================================================== */}
      <Modal visible={showMonthPickerModal} transparent animationType="fade" onRequestClose={() => setShowMonthPickerModal(false)}>
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Month & Year</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMonthPickerModal(false)}>
                <XMarkIcon color={COLORS.subtext} size={18} />
              </TouchableOpacity>
            </View>

            {/* Year Selector Control */}
            <View style={styles.yearSelectorRow}>
              <TouchableOpacity style={styles.yearArrowBtn} onPress={() => setPickerYear(y => y - 1)}>
                <ChevronLeftIcon size={18} color={COLORS.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{pickerYear}</Text>
              <TouchableOpacity style={styles.yearArrowBtn} onPress={() => setPickerYear(y => y + 1)}>
                <ChevronRightIcon size={18} color={COLORS.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* 3x4 Grid of Months */}
            <View style={styles.monthsGrid}>
              {MONTH_NAMES.map((mName, idx) => {
                const mNumber = idx + 1;
                const isSelectedMonth = mNumber === selectedMonth && pickerYear === selectedYear;
                return (
                  <TouchableOpacity
                    key={mName}
                    style={[styles.monthGridItem, isSelectedMonth && styles.monthGridItemActive]}
                    onPress={() => {
                      setSelectedMonth(mNumber);
                      setSelectedYear(pickerYear);
                      setShowMonthPickerModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.monthGridText, isSelectedMonth && styles.monthGridTextActive]}>
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.currentMonthBtn}
              onPress={() => {
                const now = new Date();
                setSelectedMonth(now.getMonth() + 1);
                setSelectedYear(now.getFullYear());
                setShowMonthPickerModal(false);
              }}
            >
              <Text style={styles.currentMonthBtnText}>Jump to Current Month</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modern Bottom Sheet Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Employee Profile</Text>
                <Text style={styles.modalSubtitle}>Update personal, role, and security details</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowEditModal(false)}>
                <XMarkIcon color={COLORS.subtext} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalFormContent}>
              <Text style={styles.formSectionHeading}>Personal Information</Text>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                    placeholder="First Name"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editLastName}
                    onChangeText={setEditLastName}
                    placeholder="Last Name"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="john@example.com"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Text style={styles.formSectionHeading}>Role & Allocation</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Designation / Position</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDesignation}
                  onChangeText={setEditDesignation}
                  placeholder="e.g. Senior Software Engineer"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              <CustomDropdown
                label="Company"
                items={companies}
                selectedValue={editCompany}
                onValueChange={setEditCompany}
                placeholder="Select a company..."
              />

              <CustomDropdown
                label="Department"
                items={departments}
                selectedValue={editDept}
                onValueChange={setEditDept}
                placeholder="Select a department..."
              />

              <CustomDropdown
                label="Assigned Shift"
                items={shifts.map(s => ({ _id: s._id, name: `${s.name} (${s.startTime}-${s.endTime})` }))}
                selectedValue={editShift}
                onValueChange={setEditShift}
                placeholder="Select a shift..."
              />

              <Text style={styles.formSectionHeading}>Security & Authentication</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPassword}
                  onChangeText={setEditPassword}
                  placeholder="Leave blank to keep current password"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry
                />
                <Text style={styles.inputHint}>Only fill this out if you wish to reset the employee's login password.</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdate}
                disabled={isUpdating}
                activeOpacity={0.85}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.subtext, fontWeight: '500', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  scrollContent: { padding: 20, paddingBottom: 40, gap: 20 },

  // Hero Profile Card
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  profileBanner: { height: 110, width: '100%', position: 'absolute', top: 0 },
  avatarContainer: {
    marginTop: 50,
    alignSelf: 'center',
    padding: 5,
    backgroundColor: COLORS.card,
    borderRadius: 55,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  initialsAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontSize: 32, fontWeight: '700', color: COLORS.text, letterSpacing: 1 },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  profileInfo: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  employeeName: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  employeeRole: { fontSize: 14, color: COLORS.subtext, fontWeight: '500', marginBottom: 14, textAlign: 'center' },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.text },

  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  quickActionBtnDisabled: { opacity: 0.5 },
  quickActionText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  quickActionTextDisabled: { color: COLORS.muted },
  actionDivider: { width: 1, height: 20, backgroundColor: COLORS.border },

  // Section Headers
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  // ==========================================
  // EXACT PILL DESIGN: <   Jul 2026 ▼   >
  // ==========================================
  monthPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  pillArrowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  pillTriangle: {
    fontSize: 10,
    color: COLORS.text,
    marginLeft: 6,
  },
  // ==========================================

  // Metric Cards
  metricsGrid: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.text,
    alignItems: 'flex-start',
  },
  metricIconWrap: { marginBottom: 10 },
  metricValue: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  metricLabel: { fontSize: 11, fontWeight: '600', color: COLORS.subtext, textTransform: 'uppercase' },

  // Cards & Grid
  gridContainer: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16 },
  gridItem: { flex: 1 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: COLORS.subtext, marginBottom: 16 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 12,
  },

  // Detail Rows
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailTextContainer: { flex: 1 },
  detailLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '500', marginBottom: 2 },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  // ==========================================
  // RESPONSIVE CALENDAR GRID STYLES (FLEX ROW)
  // ==========================================
  calendarLegend: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendBox: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5 },
  legendPresent: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  legendAbsent: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  legendWeekday: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  legendText: { fontSize: 11, fontWeight: '600', color: COLORS.subtext },

  loadingContainer: { padding: 30, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: COLORS.subtext, fontWeight: '500' },

  weekDaysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    width: '100%',
  },
  weekDayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  calendarGrid: {
    flexDirection: 'column',
    gap: 6,
    marginBottom: 20,
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  calendarCellEmpty: {
    flex: 1,
    height: 48,
  },
  calendarCell: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellWeekday: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cellPresent: {
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  cellAbsent: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  cellDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cellTextSelected: {
    fontWeight: '800',
  },
  cellStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
  },

  // Daily Detail Breakdown Card Below Calendar
  dayDetailCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 10,
  },
  dayDetailTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dayDetailStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  detailStatBlock: {
    alignItems: 'center',
    flex: 1,
  },
  detailStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  // ==========================================
  // MONTH PICKER MODAL STYLES
  // ==========================================
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerModalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  yearSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yearArrowBtn: {
    padding: 4,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  monthGridItem: {
    width: '30.5%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthGridItemActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  monthGridText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.subtext,
  },
  monthGridTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  currentMonthBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  currentMonthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Bottom Sheet Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.6)' },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  closeBtn: {
    padding: 6,
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalFormContent: { padding: 24, paddingBottom: 40, gap: 16 },
  formSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  formRow: { flexDirection: 'row', gap: 12 },
  formGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  inputHint: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  textInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  chipList: { gap: 8, paddingVertical: 4 },
  chipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipBtnActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.subtext },
  chipTextActive: { color: '#FFFFFF' },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
  },
  saveButton: {
    backgroundColor: COLORS.text,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

export default AdminEmployeeDetailScreen;