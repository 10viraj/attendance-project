import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const C = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#EAEDF2',
  ink: '#111827',
  inkMuted: '#6B7280',
  accent: '#4F46E5',
  red: '#DC2626',
};

const AdminShiftsScreen = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [gracePeriod, setGracePeriod] = useState('15');
  const [halfDayHours, setHalfDayHours] = useState('4');
  const [fullDayHours, setFullDayHours] = useState('8');
  const [employees, setEmployees] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);

  const fetchShiftsAndEmployees = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const [resShifts, resEmps] = await Promise.all([
          api.get('/shifts', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/employees', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (resShifts.data.success) {
          setShifts(resShifts.data.data);
        }
        if (resEmps.data.success) {
          setEmployees(resEmps.data.data);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchShiftsAndEmployees();
    }, [])
  );

  const handleSave = async () => {
    if (!name || !startTime || !endTime) {
      Alert.alert('Error', 'Please provide name, start time, and end time.');
      return;
    }
    setAdding(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        name,
        startTime,
        endTime,
        gracePeriod: Number(gracePeriod),
        halfDayHours: Number(halfDayHours),
        fullDayHours: Number(fullDayHours),
        employeeIds,
      };
      if (token) {
        const url = editingId ? `/shifts/${editingId}` : '/shifts';
        const method = editingId ? 'put' : 'post';
        const res = await api[method](url, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          Alert.alert('Success', `Shift ${editingId ? 'updated' : 'added'} successfully.`);
          closeModal();
          fetchShiftsAndEmployees();
        }
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save shift.');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (shift) => {
    setEditingId(shift._id);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setGracePeriod(String(shift.gracePeriod || 15));
    setHalfDayHours(String(shift.halfDayHours || 4));
    setFullDayHours(String(shift.fullDayHours || 8));
    setEmployeeIds(shift.employeeIds || []);
    setModalVisible(true);
  };

  const executeDelete = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.delete(`/shifts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        fetchShiftsAndEmployees();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete shift.');
    }
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this shift?')) {
        executeDelete(id);
      }
    } else {
      Alert.alert('Delete Shift', 'Are you sure you want to delete this shift?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => executeDelete(id) },
      ]);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setName('');
    setStartTime('');
    setEndTime('');
    setGracePeriod('15');
    setHalfDayHours('4');
    setFullDayHours('8');
    setEmployeeIds([]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>
            {item.startTime} - {item.endTime}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
            <PencilIcon color={C.accent} size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
            <TrashIcon color={C.red} size={20} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.detailText}>Grace Period: {item.gracePeriod} mins</Text>
        <Text style={styles.detailText}>Half Day: {item.halfDayHours} hrs</Text>
        <Text style={styles.detailText}>Full Day: {item.fullDayHours} hrs</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manage Shifts</Text>
          <Text style={styles.headerSubtitle}>Configure work schedules</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <PlusIcon color="#fff" size={20} />
          {Platform.OS === 'web' && <Text style={styles.addBtnText}>Add Shift</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No shifts found.</Text>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Shift' : 'Add Shift'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <XMarkIcon color={C.inkMuted} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Shift Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Morning Shift" />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Start Time (HH:MM)</Text>
                  <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" />
                </View>
                <View style={{ width: 12 }} />
                <View style={styles.flex1}>
                  <Text style={styles.label}>End Time (HH:MM)</Text>
                  <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="18:00" />
                </View>
              </View>

              <Text style={styles.label}>Grace Period (mins)</Text>
              <TextInput style={styles.input} value={gracePeriod} onChangeText={setGracePeriod} keyboardType="numeric" />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Half Day (hrs)</Text>
                  <TextInput style={styles.input} value={halfDayHours} onChangeText={setHalfDayHours} keyboardType="numeric" />
                </View>
                <View style={{ width: 12 }} />
                <View style={styles.flex1}>
                  <Text style={styles.label}>Full Day (hrs)</Text>
                  <TextInput style={styles.input} value={fullDayHours} onChangeText={setFullDayHours} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.label}>Assign Employees</Text>
              <ScrollView style={styles.employeesContainer} nestedScrollEnabled={true}>
                {employees.map(emp => {
                  const isSelected = employeeIds.includes(emp._id);
                  return (
                    <TouchableOpacity
                      key={emp._id}
                      style={[styles.employeeRow, isSelected && styles.employeeRowSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setEmployeeIds(prev => prev.filter(id => id !== emp._id));
                        } else {
                          setEmployeeIds(prev => [...prev, emp._id]);
                        }
                      }}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View>
                        <Text style={styles.employeeName}>{emp.firstName} {emp.lastName}</Text>
                        <Text style={styles.employeeId}>{emp.employeeId}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: C.surface, borderBottomWidth: 1, borderColor: C.border
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.inkMuted, marginTop: 4 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: C.surface, padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: C.ink },
  cardSubtitle: { fontSize: 14, color: C.accent, fontWeight: '600', marginTop: 4 },
  actions: { flexDirection: 'row' },
  iconBtn: { padding: 6, marginLeft: 4, backgroundColor: C.bg, borderRadius: 6 },
  cardBody: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' },
  detailText: { fontSize: 13, color: C.inkMuted, marginRight: 16, marginBottom: 4 },
  emptyText: { textAlign: 'center', color: C.inkMuted, marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: C.surface, width: '100%', maxWidth: 500, borderRadius: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.ink },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 8 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 16, color: C.ink },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20, borderTopWidth: 1, borderColor: C.border },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 12 },
  cancelBtnText: { color: C.inkMuted, fontWeight: 'bold' },
  saveBtn: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  employeesContainer: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, maxHeight: 150 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 6, marginBottom: 4 },
  employeeRowSelected: { backgroundColor: C.accent + '15' },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: C.inkMuted, borderRadius: 4, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: C.accent, borderColor: C.accent },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  employeeName: { fontSize: 13, fontWeight: '500', color: C.ink },
  employeeId: { fontSize: 11, color: C.inkMuted },
});

export default AdminShiftsScreen;
