import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, Dimensions, Modal, FlatList, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UsersIcon, CheckCircleIcon, XCircleIcon, ClockIcon, UserGroupIcon, CalendarIcon, ArrowTrendingUpIcon, PlusIcon, BriefcaseIcon } from 'react-native-heroicons/outline';
import { UsersIcon as UsersSolid, UserGroupIcon as UserGroupSolid } from 'react-native-heroicons/solid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
  const [admin, setAdmin] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Department Management States
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptsList, setDeptsList] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptSubmitting, setDeptSubmitting] = useState(false);

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
        await loadDashboardData(); // Refresh count on dashboard
      }
    } catch (error) {
      console.error('Create Department Error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create department');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const token = await AsyncStorage.getItem('userToken');
      if (userInfo) setAdmin(JSON.parse(userInfo));

      if (token) {
        // Fetch dashboard statistics
        const res = await api.get('/analytics', {
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
      loadDashboardData();
    }, [])
  );

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
              {/* Main Main Overview Chart / Card */}
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
                <Text style={styles.progressSubText}>Looking good! Most of your team is present today.</Text>
              </View>

              {/* Grid of Stats matching Web UI */}
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
                <Text style={styles.wideCardSub}>Active departments in the organization</Text>
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

            </>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.errorText}>Could not load dashboard data.</Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

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
                style={[styles.textInput, { height: 50, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Description (optional)"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                value={newDeptDesc}
                onChangeText={setNewDeptDesc}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleCreateDepartment}
                disabled={deptSubmitting}
              >
                {deptSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.addButtonText}>Add Department</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* List of Current Departments */}
            <Text style={styles.listHeader}>Existing Departments ({deptsList.length})</Text>
            {deptLoading ? (
              <ActivityIndicator color="#2563eb" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={deptsList}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={styles.deptItem}>
                    <View style={styles.deptIconBox}>
                      <BriefcaseIcon color="#2563eb" size={20} />
                    </View>
                    <View style={styles.deptInfo}>
                      <Text style={styles.deptName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.deptDesc} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyListText}>No departments configured yet.</Text>
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
    marginBottom: 24,
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
    backgroundColor: '#10b981', // emerald-500
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
