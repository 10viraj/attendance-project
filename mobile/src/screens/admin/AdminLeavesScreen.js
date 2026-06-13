import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const AdminLeavesScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await api.get('/leaves', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setLeaves(res.data.data);
        }
      }
    } catch (error) {
      console.error('Error loading leaves:', error);
      Alert.alert('Error', 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLeaves();
    }, [])
  );

  const handleUpdateStatus = async (id, status) => {
    Alert.alert(
      `Confirm ${status}`,
      `Are you sure you want to ${status.toLowerCase()} this leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setProcessingId(id);
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (token) {
                const res = await api.put(`/leaves/${id}/status`, {
                  status: status,
                  managerRemark: `Automatically ${status.toLowerCase()} via Mobile App`
                }, {
                  headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.success) {
                  Alert.alert('Success', `Leave request has been ${status.toLowerCase()}.`);
                  fetchLeaves(); // Refresh the list
                }
              }
            } catch (error) {
              console.error(`Error updating leave status to ${status}:`, error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to update leave status.');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderItem = ({ item }) => {
    let StatusIcon = ClockIcon;
    let statusColor = '#f59e0b'; // amber for Pending
    let statusBg = '#fffbeb';

    if (item.status === 'Approved') {
      StatusIcon = CheckCircleIcon;
      statusColor = '#10b981';
      statusBg = '#ecfdf5';
    } else if (item.status === 'Rejected') {
      StatusIcon = XCircleIcon;
      statusColor = '#ef4444';
      statusBg = '#fef2f2';
    }

    const isPending = item.status === 'Pending';
    const isProcessing = processingId === item._id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>
              {item.employee?.firstName} {item.employee?.lastName}
            </Text>
            <Text style={styles.leaveType}>{item.type} Leave</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <StatusIcon color={statusColor} size={16} />
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.dateRow}>
            <CalendarDaysIcon color="#94a3b8" size={18} />
            <Text style={styles.dateText}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          </View>
          <Text style={styles.reasonText} numberOfLines={3}>
            <Text style={{ fontWeight: '600' }}>Reason:</Text> {item.reason}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={() => handleUpdateStatus(item._id, 'Rejected')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]} 
              onPress={() => handleUpdateStatus(item._id, 'Approved')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.approveButtonText}>Approve</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave Approvals</Text>
      </View>

      {loading && !leaves.length ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarDaysIcon color="#cbd5e1" size={64} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No leave requests found.</Text>
            </View>
          }
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  leaveType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  cardBody: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#fff1f2',
    marginRight: 8,
  },
  rejectButtonText: {
    color: '#e11d48',
    fontSize: 15,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: '#2563eb',
    marginLeft: 8,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AdminLeavesScreen;
