import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, RectangleGroupIcon, UserIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const C = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  ink: '#0F172A',
  inkMuted: '#64748B',
  primary: '#3B82F6',
  danger: '#EF4444',
};

const AdminDepartmentsScreen = ({ navigation }) => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const [deptRes, empRes] = await Promise.all([
        api.get('/departments', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/employees', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (empRes.data.success) setEmployees(empRes.data.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (dept = null) => {
    if (dept) {
      setEditingId(dept._id);
      setName(dept.name);
      setDescription(dept.description || '');
      setManagerId(dept.manager?._id || '');
    } else {
      setEditingId(null);
      setName('');
      setDescription('');
      setManagerId('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Department name is required');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        name: name.trim(),
        description: description.trim(),
        manager: managerId || undefined
      };

      if (editingId) {
        await api.put(`/departments/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await api.post('/departments', payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save department');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this department?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await api.delete(`/departments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete');
          }
        }
      }
    ]);
  };

  const renderDept = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <RectangleGroupIcon color={C.primary} size={20} />
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
            <PencilIcon color={C.inkMuted} size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
            <TrashIcon color={C.danger} size={18} />
          </TouchableOpacity>
        </View>
      </View>
      {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
      
      <View style={styles.managerWrap}>
        <UserIcon color={C.inkMuted} size={16} />
        <Text style={styles.managerText}>
          Manager: {item.manager ? `${item.manager.firstName} ${item.manager.lastName}` : 'Unassigned'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Departments & Managers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <PlusIcon color="#FFF" size={20} />
          <Text style={styles.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={departments}
          keyExtractor={(item) => item._id}
          renderItem={renderDept}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No departments configured yet.</Text>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Department' : 'New Department'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XMarkIcon color={C.ink} size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Department Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Engineering" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Assign Manager</Text>
              <View style={styles.managerListWrap}>
                <FlatList
                  data={employees}
                  keyExtractor={e => e._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.managerBtn, managerId === item._id && styles.managerBtnActive]}
                      onPress={() => setManagerId(item._id)}
                    >
                      <Text style={[styles.managerBtnText, managerId === item._id && styles.managerBtnTextActive]}>
                        {item.firstName} {item.lastName}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{padding: 10, color: C.inkMuted}}>No employees available</Text>}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Department</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, backgroundColor: C.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.ink },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  listContent: { padding: 20, gap: 16 },
  card: { backgroundColor: C.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  cardDesc: { fontSize: 14, color: C.inkMuted, marginBottom: 12 },
  managerWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  managerText: { fontSize: 13, fontWeight: '600', color: C.inkMuted },
  emptyText: { textAlign: 'center', marginTop: 40, color: C.inkMuted },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: C.surface, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: C.bg },
  managerListWrap: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 8, backgroundColor: C.bg },
  managerBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  managerBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  managerBtnText: { color: C.inkMuted, fontWeight: '600' },
  managerBtnTextActive: { color: '#FFF' },
  saveBtn: { backgroundColor: C.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});

export default AdminDepartmentsScreen;
