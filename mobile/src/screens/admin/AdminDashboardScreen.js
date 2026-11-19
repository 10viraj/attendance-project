import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, Dimensions, Modal, FlatList, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UsersIcon, CheckCircleIcon, XCircleIcon, ClockIcon, UserGroupIcon,
  CalendarIcon, ArrowTrendingUpIcon, PlusIcon, BriefcaseIcon,
  BuildingOffice2Icon, MagnifyingGlassIcon, ChevronRightIcon, CheckIcon, XMarkIcon
} from 'react-native-heroicons/outline';
import { UsersIcon as UsersSolid, UserGroupIcon as UserGroupSolid } from 'react-native-heroicons/solid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';
import socket from '../../config/socket';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
  const [admin, setAdmin] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Organization Filter States
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');

  // Department Management States
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptsList, setDeptsList] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await api.get('/organization', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success && res.data.data) {
          setOrganizations(res.data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchDepartments = async () => {
    setDeptLoading(true);
    try {
      const response = await api.get('/departments');
      if (response.data && response.data.success) {
        setDeptsList(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setDeptLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      Alert.alert('Validation Error', 'Department name is required');
      return;
    }
    setDeptSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await api.post(
        '/departments',
        { name: newDeptName.trim(), description: newDeptDesc.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.success) {
        setNewDeptName('');
        setNewDeptDesc('');
        Alert.alert('Success', `Department "${response.data.data.name}" created successfully!`);
        await fetchDepartments();
        await loadDashboardData(selectedOrgId);
      }
    } catch (error) {
      console.error('Create Department Error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create department');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const loadDashboardData = async (orgId = selectedOrgId) => {
    setLoading(true);
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const token = await AsyncStorage.getItem('userToken');
      if (userInfo) setAdmin(JSON.parse(userInfo));

      if (token) {
        const url = orgId && orgId !== 'all' ? `/analytics?organization=${orgId}` : '/analytics';
        const res = await api.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setAnalytics(res.data.data);
        }
      }
    } catch (error) {
      console.error('Error loading admin analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrganizations();
      loadDashboardData(selectedOrgId);
      
      const handleAttendanceUpdate = () => {
        loadDashboardData(selectedOrgId);
      };
      
      socket.on('attendanceUpdate', handleAttendanceUpdate);
      
      return () => {
        socket.off('attendanceUpdate', handleAttendanceUpdate);
      };
    }, [selectedOrgId])
  );

  const selectedOrgObj = organizations.find(o => o._id === selectedOrgId);

  const filteredEmployees = (analytics?.employees || []).filter(emp => {
    if (!searchEmployeeQuery.trim()) return true;
    const q = searchEmployeeQuery.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.todayStatus?.toLowerCase().includes(q)
    );
  });

  const StatCard = ({ title, value, icon: Icon, bgColor, iconColor, trend, onPress }) => (
    <TouchableOpacity
      style={styles.statCard}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statCardHeader}>
        <View style={styles.statTextContainer}>
          <Text style={styles.statLabel}>{title}</Text>
          <Text style={styles.statValue}>{loading ? '-' : value}</Text>
        </View>
        <View style={[styles.iconBoxSoft, { backgroundColor: bgColor }]}>
          <Icon color={iconColor} size={24} />
        </View>
      </View>
      {trend && (
        <View style={styles.trendRow}>
          <ArrowTrendingUpIcon color="#10b981" size={14} />
          <Text style={styles.trendText}>
            <Text style={styles.trendHighlight}>{trend}</Text> vs last week
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header Section */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingMain}>Dashboard Overview</Text>
              <Text style={styles.greetingSub}>
                Welcome back, {admin ? admin.firstName : 'Administrator'}
              </Text>
            </View>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{admin?.firstName?.[0] || 'A'}</Text>
            </View>
          </View>

          {/* Organization Selector Bar */}
          <View style={styles.orgSelectorCard}>
            <View style={styles.orgSelectorInfo}>
              <View style={styles.orgBadgeIcon}>
                <BuildingOffice2Icon color="#2563eb" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgSelectorSub}>ORGANIZATION</Text>
                <Text style={styles.orgSelectorName} numberOfLines={1}>
                  {selectedOrgId === 'all'
                    ? 'All Organizations'
                    : (selectedOrgObj?.name || 'Selected Organization')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.changeOrgBtn}
              activeOpacity={0.8}
              onPress={() => setShowOrgModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Select Organization"
            >
              <Text style={styles.changeOrgBtnText}>
                {selectedOrgId === 'all' ? 'Select Organization ▾' : `${selectedOrgObj?.name?.trim() || 'Org'} ▾`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Primary Action Row */}
          <View style={styles.actionRow}>
            <Text style={styles.sectionTitle}>Today's Metrics</Text>
            <TouchableOpacity
              style={styles.reportButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminMonthlyReport')}
            >
              <Text style={styles.reportButtonText}>Monthly Report</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Fetching analytics...</Text>
            </View>
          ) : analytics ? (
            <>
              {/* Main Overview Card */}
              <View style={styles.primaryCard}>
                <View style={styles.primaryCardContent}>
                  <View>
                    <Text style={styles.primaryLabel}>Overall Attendance</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
                      <Text style={styles.primaryValue}>{analytics.attendancePercentage}</Text>
                      <Text style={styles.primaryPercent}>%</Text>
                    </View>
                  </View>
                  <View style={styles.circularProgress}>
                    <Text style={styles.circularProgressText}>{analytics.attendancePercentage}%</Text>
                  </View>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${analytics.attendancePercentage}%` }]} />
                </View>
                <Text style={styles.progressSubText}>
                  {Number(analytics.attendancePercentage) > 50
                    ? 'Looking good! Most of your team is present today.'
                    : 'Check the attendance list below for employee details.'}
                </Text>
              </View>

              {/* Grid of Stats */}
              <View style={styles.statsGrid}>
                {/* Total Employees */}
                <StatCard
                  title="Total Employees"
                  value={analytics.totalEmployees}
                  icon={UsersSolid}
                  bgColor="#eff6ff"
                  iconColor="#3b82f6"
                  trend="+2.5%"
                  onPress={() => navigation.navigate('AdminEmployees')}
                />

                {/* Present Today */}
                <StatCard
                  title="Present Today"
                  value={analytics.presentToday}
                  icon={CheckCircleIcon}
                  bgColor="#ecfdf5"
                  iconColor="#10b981"
                  trend="+5%"
                  onPress={() => navigation.navigate('AdminDailyReport', { initialTab: 'present' })}
                />
              </View>

              <View style={styles.statsGrid}>
                {/* Late Arrivals */}
                <StatCard
                  title="Late Arrivals"
                  value={analytics.lateToday}
                  icon={ClockIcon}
                  bgColor="#fffbeb"
                  iconColor="#f59e0b"
                  onPress={() => navigation.navigate('AdminDailyReport', { initialTab: 'late' })}
                />

                {/* On Leave (Absent) */}
                <StatCard
                  title="On Leave"
                  value={analytics.absentToday}
                  icon={XCircleIcon}
                  bgColor="#fff1f2"
                  iconColor="#e11d48"
                  onPress={() => navigation.navigate('AdminDailyReport', { initialTab: 'leave' })}
                />
              </View>

              {/* Department Overview */}
              <View style={styles.wideCard}>
                <View style={styles.wideCardHeader}>
                  <Text style={styles.sectionTitle}>Departments</Text>
                  <Text style={styles.wideCardValue}>{analytics.totalDepartments}</Text>
                </View>
                <Text style={styles.wideCardSub}>
                  {selectedOrgId === 'all'
                    ? 'Active departments across all organizations'
                    : `Active departments in ${selectedOrgObj?.name || 'this organization'}`}
                </Text>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => {
                    setShowDeptModal(true);
                    fetchDepartments();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Manage Departments"
                >
                  <Text style={styles.manageButtonText}>Manage Departments</Text>
                </TouchableOpacity>
              </View>

              {/* Employee Attendance List Card */}
              <View style={styles.wideCard}>
                <View style={styles.wideCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.sectionTitle}>
                        {selectedOrgId === 'all'
                          ? 'All Employees Attendance'
                          : `${selectedOrgObj?.name?.trim() || 'Organization'} Employees`}
                      </Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{filteredEmployees.length}</Text>
                      </View>
                    </View>
                    <Text style={styles.wideCardSub}>
                      Live attendance status & details for today
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.manageEmployeesBtn}
                    onPress={() => navigation.navigate('AdminEmployees')}
                  >
                    <Text style={styles.manageEmployeesBtnText}>All Employees →</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <MagnifyingGlassIcon color="#94a3b8" size={18} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, ID, or department..."
                    placeholderTextColor="#94a3b8"
                    value={searchEmployeeQuery}
                    onChangeText={setSearchEmployeeQuery}
                  />
                  {searchEmployeeQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchEmployeeQuery('')}>
                      <XMarkIcon color="#94a3b8" size={16} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Employees Table / Rows */}
                {filteredEmployees.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <UsersIcon color="#cbd5e1" size={40} />
                    <Text style={styles.emptyTitle}>No Employees Found</Text>
                    <Text style={styles.emptySub}>
                      {selectedOrgId === 'all'
                        ? 'No active employees registered yet.'
                        : `No active employees assigned to ${selectedOrgObj?.name?.trim() || 'this organization'}.`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.employeeRowsContainer}>
                    {filteredEmployees.map((emp) => {
                      const isPresent = emp.todayStatus === 'Present';
                      const isLate = emp.todayStatus === 'Late';
                      const isHalfDay = emp.todayStatus === 'Half-Day';
                      const isLeave = emp.todayStatus === 'On Leave';

                      return (
                        <TouchableOpacity
                          key={emp._id}
                          style={styles.employeeRow}
                          activeOpacity={0.7}
                          onPress={() => navigation.navigate('AdminEmployeeDetail', { employee: emp })}
                        >
                          {/* Avatar Circle */}
                          <View style={styles.empAvatarCircle}>
                            <Text style={styles.empAvatarText}>
                              {emp.firstName?.[0] || emp.name?.[0] || 'E'}
                            </Text>
                          </View>

                          {/* Info */}
                          <View style={styles.empDetails}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.empNameText}>{emp.name}</Text>
                              <View style={styles.empIdPill}>
                                <Text style={styles.empIdPillText}>{emp.employeeId}</Text>
                              </View>
                            </View>
                            <Text style={styles.empMetaText}>
                              {emp.department} • {emp.designation}
                              {selectedOrgId === 'all' && emp.organization ? ` • ${emp.organization}` : ''}
                            </Text>
                          </View>

                          {/* Status Badge */}
                          <View style={styles.empStatusBlock}>
                            <View style={[
                              styles.statusBadge,
                              isPresent && styles.badgePresent,
                              isLate && styles.badgeLate,
                              isHalfDay && styles.badgeHalfDay,
                              isLeave && styles.badgeLeave,
                              (!isPresent && !isLate && !isHalfDay && !isLeave) && styles.badgeAbsent,
                            ]}>
                              <Text style={[
                                styles.statusBadgeText,
                                isPresent && styles.textPresent,
                                isLate && styles.textLate,
                                isHalfDay && styles.textHalfDay,
                                isLeave && styles.textLeave,
                                (!isPresent && !isLate && !isHalfDay && !isLeave) && styles.textAbsent,
                              ]}>
                                ● {emp.todayStatus}
                              </Text>
                            </View>

                            {emp.checkInTime ? (
                              <Text style={styles.checkInTimeText}>
                                In: {new Date(emp.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            ) : null}
                          </View>

                          <ChevronRightIcon color="#cbd5e1" size={18} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

            </>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.errorText}>Could not load dashboard data.</Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Select Organization Modal */}
      <Modal
        visible={showOrgModal}
        transparent={true}
        animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
        onRequestClose={() => setShowOrgModal(false)}
      >
        <TouchableOpacity
          style={Platform.OS === 'web' ? styles.webModalOverlay : styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOrgModal(false)}
        >
          <View
            style={Platform.OS === 'web' ? styles.webModalContent : styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <BuildingOffice2Icon color="#2563eb" size={24} />
                <Text style={styles.modalTitle}>Select Organization</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOrgModal(false)}>
                <XMarkIcon color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Filter dashboard metrics, overall attendance, and employee list by organization.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Option: All Organizations */}
              <TouchableOpacity
                style={[
                  styles.orgOptionItem,
                  selectedOrgId === 'all' && styles.orgOptionSelected
                ]}
                onPress={() => {
                  setSelectedOrgId('all');
                  setShowOrgModal(false);
                  loadDashboardData('all');
                }}
              >
                <View style={[
                  styles.orgOptionIconBox,
                  selectedOrgId === 'all' && styles.orgOptionIconBoxSelected
                ]}>
                  <BuildingOffice2Icon color={selectedOrgId === 'all' ? '#2563eb' : '#64748b'} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.orgOptionTitle,
                    selectedOrgId === 'all' && styles.orgOptionTitleSelected
                  ]}>
                    All Organizations
                  </Text>
                  <Text style={styles.orgOptionSub}>Company-wide consolidated view</Text>
                </View>
                {selectedOrgId === 'all' && (
                  <CheckIcon color="#2563eb" size={20} />
                )}
              </TouchableOpacity>

              {/* Individual Organizations */}
              {organizations.map(org => {
                const isSelected = selectedOrgId === org._id;
                return (
                  <TouchableOpacity
                    key={org._id}
                    style={[
                      styles.orgOptionItem,
                      isSelected && styles.orgOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedOrgId(org._id);
                      setShowOrgModal(false);
                      loadDashboardData(org._id);
                    }}
                  >
                    <View style={[
                      styles.orgOptionIconBox,
                      isSelected && styles.orgOptionIconBoxSelected
                    ]}>
                      <BriefcaseIcon color={isSelected ? '#2563eb' : '#64748b'} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.orgOptionTitle,
                        isSelected && styles.orgOptionTitleSelected
                      ]}>
                        {org.name}
                      </Text>
                      <Text style={styles.orgOptionSub}>
                        {org.industry ? `${org.industry} • ` : ''}
                        {org.city || org.country || 'Active Organization'}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckIcon color="#2563eb" size={20} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {organizations.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>No organizations created yet.</Text>
                </View>
              )}
            </ScrollView>

            {/* Quick Link to Manage Organizations */}
            <TouchableOpacity
              style={styles.manageOrgShortcut}
              onPress={() => {
                setShowOrgModal(false);
                navigation.navigate('AdminCompany');
              }}
            >
              <PlusIcon color="#2563eb" size={18} />
              <Text style={styles.manageOrgShortcutText}>Create / Manage Organizations</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Manage Departments Modal */}
      <Modal
        visible={showDeptModal}
        transparent={true}
        animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
        onRequestClose={() => setShowDeptModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={Platform.OS === 'web' ? styles.webModalOverlay : styles.modalOverlay}
        >
          <View style={Platform.OS === 'web' ? styles.webModalContent : styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Departments</Text>
              <TouchableOpacity onPress={() => setShowDeptModal(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Create New Department Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Create New Department</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Department Name (e.g. Engineering)"
                placeholderTextColor="#94a3b8"
                value={newDeptName}
                onChangeText={setNewDeptName}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Description (Optional)"
                placeholderTextColor="#94a3b8"
                value={newDeptDesc}
                onChangeText={setNewDeptDesc}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleCreateDepartment}
                disabled={deptSubmitting}
              >
                {deptSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.addButtonText}>Add Department</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing Departments List */}
            <Text style={styles.listHeader}>Existing Departments ({deptsList.length})</Text>
            {deptLoading ? (
              <ActivityIndicator color="#2563eb" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={deptsList}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View style={styles.deptItem}>
                    <View style={styles.deptIconBox}>
                      <UserGroupSolid color="#2563eb" size={20} />
                    </View>
                    <View style={styles.deptInfo}>
                      <Text style={styles.deptName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.deptDesc}>{item.description}</Text>
                      ) : null}
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyListText}>No departments found.</Text>
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  greetingMain: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  orgSelectorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orgSelectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orgBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgSelectorSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  orgSelectorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  changeOrgBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  changeOrgBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  reportButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  reportButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  primaryCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  primaryValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 46,
  },
  primaryPercent: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    marginLeft: 2,
  },
  circularProgress: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    borderWidth: 4,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressSubText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 4,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  iconBoxSoft: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  trendText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
    fontWeight: '500',
  },
  trendHighlight: {
    color: '#10b981',
    fontWeight: '700',
  },
  wideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 4,
    marginBottom: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  wideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wideCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  wideCardSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  manageButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  manageEmployeesBtn: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  manageEmployeesBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  employeeRowsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  empAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
  },
  empDetails: {
    flex: 1,
  },
  empNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  empIdPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  empIdPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  empMetaText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  empStatusBlock: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePresent: { backgroundColor: '#ecfdf5' },
  badgeLate: { backgroundColor: '#fffbeb' },
  badgeHalfDay: { backgroundColor: '#fef3c7' },
  badgeLeave: { backgroundColor: '#fff1f2' },
  badgeAbsent: { backgroundColor: '#f1f5f9' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  textPresent: { color: '#059669' },
  textLate: { color: '#d97706' },
  textHalfDay: { color: '#b45309' },
  textLeave: { color: '#e11d48' },
  textAbsent: { color: '#64748b' },
  checkInTimeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  orgOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  orgOptionSelected: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  orgOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgOptionIconBoxSelected: {
    backgroundColor: '#dbeafe',
  },
  orgOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  orgOptionTitleSelected: {
    color: '#1d4ed8',
  },
  orgOptionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  manageOrgShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
    gap: 6,
  },
  manageOrgShortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#2563eb',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  deptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  deptIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  deptDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyListText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  webModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  webModalContent: {
    backgroundColor: '#ffffff',
    width: 450,
    height: '100%',
    padding: 24,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
});

export default AdminDashboardScreen;
