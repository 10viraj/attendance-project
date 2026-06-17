import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeftIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, BriefcaseIcon, CalendarDaysIcon, CurrencyDollarIcon, CheckBadgeIcon, ClockIcon, TrashIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../config/api';

const AdminEmployeeDetailScreen = ({ route, navigation }) => {
  const { employee } = route.params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await api.get(`/attendance/admin/employee/${employee._id}`, {
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
  }, [employee._id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to completely remove ${employee.firstName} ${employee.lastName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await api.delete(`/employees/${employee._id}`, {
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
          
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#e11d48" />
            ) : (
              <TrashIcon color="#e11d48" size={24} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {employee.profileImage ? (
                <UserCircleIcon color="#94a3b8" size={80} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.employeeName}>{employee.firstName} {employee.lastName}</Text>
            <Text style={styles.employeeId}>Employee ID: {employee.employeeId}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: employee.isActive ? '#ecfdf5' : '#fef2f2' }]}>
              <Text style={[styles.statusText, { color: employee.isActive ? '#10b981' : '#ef4444' }]}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Contact Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <DetailRow 
              icon={EnvelopeIcon} 
              label="Email Address" 
              value={employee.user?.email} 
            />
            <DetailRow 
              icon={PhoneIcon} 
              label="Phone Number" 
              value={employee.phone} 
            />
            <DetailRow 
              icon={MapPinIcon} 
              label="Address" 
              value={employee.address ? `${employee.address.street || ''}, ${employee.address.city || ''}` : null} 
            />
          </View>

          {/* Job Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Employment Details</Text>
            <DetailRow 
              icon={BriefcaseIcon} 
              label="Department" 
              value={employee.department?.name} 
            />
            <DetailRow 
              icon={CheckBadgeIcon} 
              label="Position" 
              value={employee.position} 
            />
            <DetailRow 
              icon={ClockIcon} 
              label="Assigned Shift" 
              value={employee.shift ? `${employee.shift.name} (${employee.shift.startTime} - ${employee.shift.endTime})` : null} 
            />
            <DetailRow 
              icon={CalendarDaysIcon} 
              label="Date of Joining" 
              value={formatDate(employee.dateOfJoining)} 
            />
            <DetailRow 
              icon={CurrencyDollarIcon} 
              label="Salary" 
              value={employee.salary ? `$${employee.salary.toLocaleString()}` : null} 
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
});

export default AdminEmployeeDetailScreen;
