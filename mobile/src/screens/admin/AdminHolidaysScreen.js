import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDaysIcon, PlusIcon, XMarkIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const AdminHolidaysScreen = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('Company'); // Default
  const [description, setDescription] = useState('');

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await api.get('/holidays', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setHolidays(res.data.data);
        }
      }
    } catch (error) {
      console.error('Error loading holidays:', error);
      Alert.alert('Error', 'Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHolidays();
    }, [])
  );

  const handleAddHoliday = async () => {
    if (!name || !date) {
      Alert.alert('Error', 'Please provide a name and date (YYYY-MM-DD)');
      return;
    }

    setAdding(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await api.post('/holidays', {
          name, date, type, description
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.success) {
          Alert.alert('Success', 'Holiday added successfully.');
          setModalVisible(false);
          // Reset form
          setName('');
          setDate('');
          setType('Company');
          setDescription('');
          fetchHolidays();
        }
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add holiday.');
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.holidayName}>{item.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.dateRow}>
            <CalendarDaysIcon color="#64748b" size={18} />
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          </View>
          {item.description ? (
            <Text style={styles.reasonText}>{item.description}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Holidays</Text>
          <Text style={styles.headerSub}>Manage company and festival holidays</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <PlusIcon color="#ffffff" size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={holidays}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarDaysIcon color="#cbd5e1" size={64} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No holidays found.</Text>
            </View>
          }
        />
      )}

      {/* Add Holiday Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Holiday</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XMarkIcon color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Holiday Name</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. Diwali, Christmas"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput 
                style={styles.input}
                placeholder="2024-12-25"
                placeholderTextColor="#94a3b8"
                value={date}
                onChangeText={setDate}
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeSelector}>
                {['Company', 'Regional', 'Festival'].map(t => (
                  <TouchableOpacity 
                    key={t}
                    style={[styles.typeOption, type === t && styles.typeOptionActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeOptionText, type === t && styles.typeOptionTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Any additional details..."
                placeholderTextColor="#94a3b8"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleAddHoliday}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Holiday</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
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
    marginBottom: 12,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 10
  },
  typeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  cardBody: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 10,
    lineHeight: 20,
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeOptionTextActive: {
    color: '#2563eb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  }
});

export default AdminHolidaysScreen;
