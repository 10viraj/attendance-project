import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, FlatList,
  Platform, Animated, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeftIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon, MapPinIcon,
  BriefcaseIcon, CalendarDaysIcon, CurrencyDollarIcon, CheckBadgeIcon,
  ClockIcon, TrashIcon, PencilIcon, XMarkIcon, ChevronRightIcon,
} from 'react-native-heroicons/outline';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../config/api';
import socket from '../../config/socket';

// ---------- Design tokens (keep everything derived from one palette) ----------
const COLORS = {
  bg: '#f6f7fb',
  card: '#ffffff',
  border: '#eef0f5',
  text: '#0f172a',
  subtext: '#64748b',
  muted: '#94a3b8',
  primary: '#4f46e5',
  primarySoft: '#eef2ff',
  danger: '#e11d48',
  dangerSoft: '#fff1f2',
  success: '#10b981',
  successSoft: '#ecfdf5',
  warning: '#f59e0b',
  warningSoft: '#fffbeb',
};

const AdminEmployeeDetailScreen = ({ route, navigation }) => {
  const employee = route?.params?.employee || {};
  const [employeeData, setEmployeeData] = useState(employee);
  const [isDeleting, setIsDeleting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Animation
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (employee?._id && employee._id !== employeeData?._id) {
      setEmployeeData(employee);
      setEditFirstName(employee.firstName || '');
      setEditLastName(employee.lastName || '');
      setEditPhone(employee.phone || '');
      setEditDesignation(employee.designation || employee.position || '');
      setEditDept(employee.department?._id || '');
      setEditShift(employee.shift?._id || '');
      setEditPassword('');
      setHistoryExpanded(false);

      fade.setValue(0);
      slide.setValue(16);
    }

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [employee?._id, fade, slide]);

  // Editing state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState(employee.firstName || '');
  const [editLastName, setEditLastName] = useState(employee.lastName || '');
  const [editPhone, setEditPhone] = useState(employee.phone || '');
  const [editDesignation, setEditDesignation] = useState(employee.designation || employee.position || '');
  const [editDept, setEditDept] = useState(employee.department?._id || '');
  const [editShift, setEditShift] = useState(employee.shift?._id || '');
  const [editPassword, setEditPassword] = useState('');
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!employeeData._id) return;
      setLoadingHistory(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await api.get(`/attendance/admin/employee/${employeeData._id}?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHistory(res.data.data || []);
      } catch (error) {
        console.error('Error fetching employee history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();

    const handleAttendanceUpdate = (data) => {
      // If the update is for the employee currently being viewed, refresh history
      if (data.employeeId === employeeData.employeeId || data.employeeId === employeeData._id) {
        fetchHistory();
      }
    };

    socket.on('attendanceUpdate', handleAttendanceUpdate);

    return () => {
      socket.off('attendanceUpdate', handleAttendanceUpdate);
    };
  }, [employeeData._id, employeeData.employeeId, selectedMonth, selectedYear]);
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const [deptRes, shiftRes] = await Promise.all([
          api.get('/departments', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
          api.get('/shifts', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
        ]);
        if (deptRes.data?.success) setDepartments(deptRes.data.data);
        if (shiftRes.data?.success) setShifts(shiftRes.data.data);
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
      const res = await api.put(`/employees/${employeeData._id}`, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim(),
        designation: editDesignation.trim(),
        department: editDept || undefined,
        password: editPassword.trim() || undefined,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        Alert.alert('Success', 'Employee details updated successfully');
        setShowEditModal(false);
        setEditPassword('');
        const selectedDeptObj = departments.find((d) => d._id === editDept);
        const selectedShiftObj = shifts.find((s) => s._id === editShift);
        setEmployeeData((prev) => ({
          ...prev,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          phone: editPhone.trim(),
          designation: editDesignation.trim(),
          position: editDesignation.trim(),
          department: selectedDeptObj ? { _id: editDept, name: selectedDeptObj.name } : prev.department,
          shift: selectedShiftObj
            ? { _id: editShift, name: selectedShiftObj.name, startTime: selectedShiftObj.startTime, endTime: selectedShiftObj.endTime }
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
      ],
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (t) => (t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');

  // Quick attendance stats derived from history
  const stats = useMemo(() => {
    const present = history.filter((h) => h.status === 'Present').length;
    const absent = history.filter((h) => h.status === 'Absent').length;
    const totalHours = history.reduce((sum, h) => sum + (h.workingHours || 0), 0);
    return { present, absent, avgHours: history.length ? (totalHours / history.length).toFixed(1) : '0.0' };
  }, [history]);

  const visibleHistory = historyExpanded ? history : history.slice(0, 4);

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

  const DetailRow = ({ icon: Icon, label, value, color = COLORS.primary, bg = COLORS.primarySoft, onPress }) => {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper style={styles.detailRow} onPress={onPress} activeOpacity={0.6}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Icon color={color} size={19} strokeWidth={2} />
        </View>
        <View style={styles.detailTextContainer}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{value || 'Not provided'}</Text>
        </View>
        {onPress && <ChevronRightIcon color={COLORS.muted} size={16} />}
      </Wrapper>
    );
  };

  const StatChip = ({ value, label, color }) => (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (!employeeData || !employeeData._id) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.bg} barStyle="dark-content" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('AdminEmployees')} activeOpacity={0.7}>
            <ChevronLeftIcon color={COLORS.text} size={20} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Profile Overview</Text>
            <Text style={styles.headerSubtitle}>{employeeData.employeeId}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionPill} onPress={() => setShowEditModal(true)} activeOpacity={0.7}>
              <PencilIcon color={COLORS.primary} size={15} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionPill, styles.actionPillDanger]}
              onPress={handleDelete}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <TrashIcon color={COLORS.danger} size={15} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>

            {/* Profile card */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileBanner}
              />

              <View style={styles.avatarWrapper}>
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {employeeData.firstName?.[0]}{employeeData.lastName?.[0]}
                  </Text>
                </View>
                {employeeData.isActive && (
                  <View style={styles.avatarBadge}>
                    <CheckBadgeIcon color="#fff" size={14} strokeWidth={2.5} />
                  </View>
                )}
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.employeeName}>{employeeData.firstName} {employeeData.lastName}</Text>
                <Text style={styles.employeeRole}>
                  {employeeData.designation || employeeData.position || 'No position set'}
                  {employeeData.department?.name ? ` · ${employeeData.department.name}` : ''}
                </Text>

                <View style={[styles.statusBadge, employeeData.isActive ? styles.statusActive : styles.statusInactive]}>
                  <View style={[styles.statusDot, employeeData.isActive ? styles.dotActive : styles.dotInactive]} />
                  <Text style={[styles.statusText, employeeData.isActive ? styles.textActive : styles.textInactive]}>
                    {employeeData.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>

                {/* Quick contact actions */}
                <View style={styles.quickActions}>
                  {!!employeeData.user?.email && (
                    <TouchableOpacity
                      style={styles.quickActionBtn}
                      onPress={() => Linking.openURL(`mailto:${employeeData.user.email}`)}
                      activeOpacity={0.7}
                    >
                      <EnvelopeIcon color={COLORS.primary} size={16} strokeWidth={2.2} />
                      <Text style={styles.quickActionText}>Email</Text>
                    </TouchableOpacity>
                  )}
                  {!!employeeData.phone && (
                    <TouchableOpacity
                      style={styles.quickActionBtn}
                      onPress={() => Linking.openURL(`tel:${employeeData.phone}`)}
                      activeOpacity={0.7}
                    >
                      <PhoneIcon color={COLORS.success} size={16} strokeWidth={2.2} />
                      <Text style={[styles.quickActionText, { color: COLORS.success }]}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Month Filter */}
            <View style={styles.monthFilterContainer}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.monthBtn} activeOpacity={0.6}>
                <ChevronLeftIcon size={18} strokeWidth={3} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.monthBtn} activeOpacity={0.6}>
                <ChevronRightIcon size={18} strokeWidth={3} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Attendance quick stats */}
            <View style={styles.statsRow}>
              <StatChip value={stats.present} label="Present" color={COLORS.success} />
              <View style={styles.statDivider} />
              <StatChip value={stats.absent} label="Absent" color={COLORS.danger} />
              <View style={styles.statDivider} />
              <StatChip value={`${stats.avgHours}h`} label="Avg / day" color={COLORS.primary} />
            </View>

            {/* Contact + Employment */}
            <View style={styles.gridContainer}>
              <View style={[styles.sectionCard, styles.gridItem]}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <DetailRow
                  icon={EnvelopeIcon}
                  label="Email Address"
                  value={employeeData.user?.email}
                  color="#3b82f6"
                  bg="#eff6ff"
                />
                <DetailRow
                  icon={PhoneIcon}
                  label="Phone Number"
                  value={employeeData.phone}
                  color={COLORS.success}
                  bg={COLORS.successSoft}
                />
                <View style={[styles.detailRow, { marginBottom: 0 }]}>
                  <View style={[styles.iconBox, { backgroundColor: COLORS.warningSoft }]}>
                    <MapPinIcon color={COLORS.warning} size={19} strokeWidth={2} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {employeeData.address
                        ? `${employeeData.address.street || ''}, ${employeeData.address.city || ''}`
                        : 'Not provided'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.sectionCard, styles.gridItem]}>
                <Text style={styles.sectionTitle}>Employment Details</Text>
                <DetailRow icon={BriefcaseIcon} label="Department" value={employeeData.department?.name} color="#8b5cf6" bg="#f5f3ff" />
                <DetailRow icon={CheckBadgeIcon} label="Position" value={employeeData.designation || employeeData.position} color="#ec4899" bg="#fdf2f8" />
                <DetailRow
                  icon={ClockIcon}
                  label="Assigned Shift"
                  value={employeeData.shift ? `${employeeData.shift.name} (${employeeData.shift.startTime} - ${employeeData.shift.endTime})` : null}
                  color="#06b6d4"
                  bg="#ecfeff"
                />
                <DetailRow icon={CalendarDaysIcon} label="Date of Joining" value={formatDate(employeeData.dateOfJoining)} color="#6366f1" bg="#eef2ff" />
                <View style={[styles.detailRow, { marginBottom: 0 }]}>
                  <View style={[styles.iconBox, { backgroundColor: '#f0fdfa' }]}>
                    <CurrencyDollarIcon color="#14b8a6" size={19} strokeWidth={2} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Salary</Text>
                    <Text style={styles.detailValue}>
                      {employeeData.salary ? `$${employeeData.salary.toLocaleString()}` : 'Not provided'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Attendance History */}
            <View style={styles.sectionCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Recent Attendance</Text>
                {history.length > 4 && (
                  <TouchableOpacity onPress={() => setHistoryExpanded((v) => !v)}>
                    <Text style={styles.historyToggle}>{historyExpanded ? 'Show less' : `View all (${history.length})`}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingHistory ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
              ) : history.length === 0 ? (
                <View style={styles.emptyState}>
                  <ClockIcon color={COLORS.muted} size={28} strokeWidth={1.5} />
                  <Text style={styles.emptyText}>No attendance records found.</Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {visibleHistory.map((record) => {
                    const isPresent = record.status === 'Present';
                    const isAbsent = record.status === 'Absent';
                    const statusColor = isPresent ? COLORS.success : isAbsent ? COLORS.danger : COLORS.warning;
                    const statusBg = isPresent ? COLORS.successSoft : isAbsent ? COLORS.dangerSoft : COLORS.warningSoft;

                    return (
                      <View key={record._id} style={styles.historyRow}>
                        <View style={[styles.historyStatusBar, { backgroundColor: statusColor }]} />
                        <View style={styles.historyDateCol}>
                          <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                            <Text style={[styles.statusPillText, { color: statusColor }]}>{record.status}</Text>
                          </View>
                        </View>
                        <View style={styles.historyTimeCol}>
                          <View style={styles.timeBlock}>
                            <Text style={styles.timeLabel}>In</Text>
                            <Text style={styles.timeValue}>{formatTime(record.checkIn?.time)}</Text>
                          </View>
                          <View style={styles.timeBlock}>
                            <Text style={styles.timeLabel}>Out</Text>
                            <Text style={styles.timeValue}>{formatTime(record.checkOut?.time)}</Text>
                          </View>
                        </View>
                        <View style={styles.historyHoursCol}>
                          <Text style={styles.historyHours}>{record.workingHours ? `${record.workingHours.toFixed(1)}h` : '-'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Employee Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Employee</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowEditModal(false)}>
                <XMarkIcon color={COLORS.subtext} size={18} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '92%' }}>
              <Text style={styles.formSectionTitle}>Basic Info</Text>
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

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone Number"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.formSectionTitle}>Role</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Position / Designation</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDesignation}
                  onChangeText={setEditDesignation}
                  placeholder="e.g. Developer, Designer"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <FlatList
                  data={departments}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 4 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.chipBtn, editDept === item._id && styles.chipBtnActive]}
                      onPress={() => setEditDept(item._id)}
                    >
                      <Text style={[styles.chipText, editDept === item._id && styles.chipTextActive]}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <Text style={styles.formSectionTitle}>Security</Text>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Update Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPassword}
                  onChangeText={setEditPassword}
                  placeholder="Leave blank to keep current password"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={isUpdating} activeOpacity={0.85}>
                {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
              </TouchableOpacity>
              <View style={{ height: 12 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: COLORS.bg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, zIndex: 10,
  },
  backButton: {
    padding: 9, backgroundColor: COLORS.card, borderRadius: 12,
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionPill: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  actionPillDanger: { backgroundColor: COLORS.dangerSoft },

  scrollContent: { padding: 20, paddingBottom: 60, gap: 16 },

  profileCard: {
    backgroundColor: COLORS.card, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
    marginBottom: 16,
  },
  profileBanner: { height: 96, width: '100%', position: 'absolute', top: 0 },
  avatarWrapper: { marginTop: 40, alignSelf: 'center', padding: 4, backgroundColor: COLORS.card, borderRadius: 60, position: 'relative' },
  initialsAvatar: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0e7ff',
  },
  initialsText: { fontSize: 30, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  avatarBadge: {
    position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.card,
  },
  profileInfo: { alignItems: 'center', padding: 20, paddingTop: 12, paddingBottom: 24 },
  employeeName: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4, letterSpacing: -0.5 },
  employeeRole: { fontSize: 13, color: COLORS.subtext, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, marginBottom: 16 },
  statusActive: { backgroundColor: COLORS.successSoft, borderWidth: 1, borderColor: '#d1fae5' },
  statusInactive: { backgroundColor: COLORS.dangerSoft, borderWidth: 1, borderColor: '#fee2e2' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { backgroundColor: COLORS.success },
  dotInactive: { backgroundColor: COLORS.danger },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  textActive: { color: '#059669' },
  textInactive: { color: '#dc2626' },

  quickActions: { flexDirection: 'row', gap: 10 },
  quickActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 14, backgroundColor: COLORS.primarySoft,
  },
  quickActionText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 20,
    paddingVertical: 16, marginBottom: 16,
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
  },
  statChip: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  gridContainer: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16 },
  gridItem: { flex: 1 },

  sectionCard: {
    backgroundColor: COLORS.card, borderRadius: 22, padding: 20, marginBottom: 16,
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 16, letterSpacing: -0.2 },

  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  detailTextContainer: { flex: 1 },
  detailLabel: { fontSize: 10.5, color: COLORS.subtext, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14.5, color: '#1e293b', fontWeight: '600' },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  historyToggle: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary },
  historyList: { gap: 10 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 16, paddingLeft: 0,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  historyStatusBar: { width: 4, alignSelf: 'stretch', marginRight: 16, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  historyDateCol: { width: 140 },
  historyDate: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyTimeCol: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 40 },
  timeBlock: { alignItems: 'center', minWidth: 60 },
  timeLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  timeValue: { fontSize: 14, color: '#334155', fontWeight: '600' },
  historyHoursCol: { width: 80, alignItems: 'flex-end' },
  historyHours: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  emptyState: { alignItems: 'center', padding: 28, gap: 8 },
  emptyText: { color: COLORS.muted, fontWeight: '500', fontSize: 13 },

  // Edit Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  modalContent: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, maxHeight: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10,
  },
  modalGrabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  formSectionTitle: {
    fontSize: 11.5, fontWeight: '800', color: COLORS.muted, textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 10, marginTop: 4,
  },
  formRow: { flexDirection: 'row', gap: 12 },
  formGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
  textInput: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 16, height: 50, fontSize: 15, color: COLORS.text, fontWeight: '500',
  },
  chipBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.bg,
    marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipBtnActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: COLORS.primary },
  saveButton: {
    backgroundColor: COLORS.primary, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4,
  },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  monthFilterContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginBottom: 12, paddingVertical: 10,
    backgroundColor: COLORS.card, borderRadius: 16,
    shadowColor: COLORS.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: COLORS.border
  },
  monthBtn: { padding: 8, backgroundColor: COLORS.primarySoft, borderRadius: 10 },
  monthText: { fontSize: 16, fontWeight: '700', color: COLORS.text, width: 140, textAlign: 'center' },
});

export default AdminEmployeeDetailScreen;