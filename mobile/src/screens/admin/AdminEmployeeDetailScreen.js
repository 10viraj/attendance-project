import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeftIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, BriefcaseIcon, CalendarDaysIcon, CurrencyDollarIcon, CheckBadgeIcon, ClockIcon, TrashIcon, PencilIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../config/api';

const AdminEmployeeDetailScreen = ({ route, navigation }) => {
  const { employee } = route.params;
  const [employeeData, setEmployeeData] = useState(employee);
  const [isDeleting, setIsDeleting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Editing States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState(employee.firstName || '');
  const [editLastName, setEditLastName] = useState(employee.lastName || '');
  const [editPhone, setEditPhone] = useState(employee.phone || '');
  const [editDesignation, setEditDesignation] = useState(employee.designation || employee.position || '');
  const [editDept, setEditDept] = useState(employee.department?._id || '');
  const [departments, setDepartments] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await api.get(`/attendance/admin/employee/${employeeData._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(res.data.data || []);
      } catch (error) {
        console.error('Error fetching employee history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [employeeData._id]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        if (res.data && res.data.success) {
          setDepartments(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepts();
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
        department: editDept || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        Alert.alert('Success', 'Employee details updated successfully');
        setShowEditModal(false);
        const selectedDeptObj = departments.find(d => d._id === editDept);
        setEmployeeData(prev => ({
          ...prev,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          phone: editPhone.trim(),
          designation: editDesignation.trim(),
          position: editDesignation.trim(),
          department: selectedDeptObj ? { _id: editDept, name: selectedDeptObj.name } : prev.department
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
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.data.success) {
                Alert.alert('Success', 'Employee deleted successfully');
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete employee');
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Format Date safely
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const DetailRow = ({ icon: Icon, label, value }) => (
    <View style={styles.detailRow}>
      <View style={styles.iconBox}>
        <Icon color="#64748b" size={20} />
      </View>
      <View style={styles.detailTextContainer}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" translucent={false} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon color="#0f172a" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Profile</Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => setShowEditModal(true)}
              activeOpacity={0.7}
            >
              <PencilIcon color="#2563eb" size={22} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDelete}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#e11d48" />
              ) : (
                <TrashIcon color="#e11d48" size={22} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {employeeData.profileImage ? (
                <UserCircleIcon color="#94a3b8" size={80} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {employeeData.firstName?.[0]}{employeeData.lastName?.[0]}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.employeeName}>{employeeData.firstName} {employeeData.lastName}</Text>
            <Text style={styles.employeeId}>Employee ID: {employeeData.employeeId}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: employeeData.isActive ? '#ecfdf5' : '#fef2f2' }]}>
              <Text style={[styles.statusText, { color: employeeData.isActive ? '#10b981' : '#ef4444' }]}>
                {employeeData.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Contact Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <DetailRow 
              icon={EnvelopeIcon} 
              label="Email Address" 
              value={employeeData.user?.email} 
            />
            <DetailRow 
              icon={PhoneIcon} 
              label="Phone Number" 
              value={employeeData.phone} 
            />
            <DetailRow 
              icon={MapPinIcon} 
              label="Address" 
              value={employeeData.address ? `${employeeData.address.street || ''}, ${employeeData.address.city || ''}` : null} 
            />
          </View>

          {/* Job Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Employment Details</Text>
            <DetailRow 
              icon={BriefcaseIcon} 
              label="Department" 
              value={employeeData.department?.name} 
            />
            <DetailRow 
              icon={CheckBadgeIcon} 
              label="Position" 
              value={employeeData.designation || employeeData.position} 
            />
            <DetailRow 
              icon={ClockIcon} 
              label="Assigned Shift" 
              value={employeeData.shift ? `${employeeData.shift.name} (${employeeData.shift.startTime} - ${employeeData.shift.endTime})` : null} 
            />
            <DetailRow 
              icon={CalendarDaysIcon} 
              label="Date of Joining" 
              value={formatDate(employeeData.dateOfJoining)} 
            />
            <DetailRow 
              icon={CurrencyDollarIcon} 
              label="Salary" 
              value={employeeData.salary ? `$${employeeData.salary.toLocaleString()}` : null} 
            />
          </View>

          {/* Attendance History */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
            {loadingHistory ? (
              <ActivityIndicator color="#2563eb" />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records found.</Text>
            ) : (
              history.map((record) => (
                <View key={record._id} style={styles.historyRow}>
                  <View style={styles.historyDateCol}>
                    <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                    <Text style={[
                      styles.historyStatus, 
                      { color: record.status === 'Present' ? '#10b981' : '#f59e0b' }
                    ]}>{record.status}</Text>
                  </View>
                  <View style={styles.historyTimeCol}>
                    <Text style={styles.historyTime}>In: {record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</Text>
                    <Text style={styles.historyTime}>Out: {record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</Text>
                  </View>
                  <View style={styles.historyHoursCol}>
                    <Text style={styles.historyHours}>{record.workingHours ? `${record.workingHours.toFixed(1)}h` : '-'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Edit Employee Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Employee Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '90%' }}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="First Name"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Last Name"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone Number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Position / Designation</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDesignation}
                  onChangeText={setEditDesignation}
                  placeholder="e.g. Developer, Designer"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <View style={styles.pickerContainer}>
                  <FlatList
                    data={departments}
                    keyExtractor={(item) => item._id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 4 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.deptSelectorBtn,
                          editDept === item._id && styles.deptSelectorBtnActive
                        ]}
                        onPress={() => setEditDept(item._id)}
                      >
                        <Text style={[
                          styles.deptSelectorText,
                          editDept === item._id && styles.deptSelectorTextActive
                        ]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  initialsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  initialsText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2563eb',
  },
  employeeName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  emptyText: {
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyDateCol: {
    flex: 2,
  },
  historyTimeCol: {
    flex: 2,
  },
  historyHoursCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  historyTime: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  historyHours: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
  },
  editButton: {
    padding: 4,
    marginRight: 6,
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
    maxHeight: '90%',
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
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    color: '#0f172a',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptSelectorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  deptSelectorBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  deptSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  deptSelectorTextActive: {
    color: '#2563eb',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AdminEmployeeDetailScreen;
