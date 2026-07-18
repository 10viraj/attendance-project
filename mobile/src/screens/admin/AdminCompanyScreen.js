import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BuildingOfficeIcon, UserIcon, MapPinIcon, ClockIcon, PlusIcon, PencilIcon, ChevronLeftIcon, TrashIcon, PhoneIcon, EnvelopeIcon } from 'react-native-heroicons/outline';
import api from '../../config/api';

const C = {
  bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0', borderLight: '#F1F5F9',
  ink: '#0F172A', inkMuted: '#64748B', primary: '#3B82F6', primarySoft: '#DBEAFE',
  danger: '#EF4444', dangerSoft: '#FEE2E2',
};

const FormSection = ({ title, icon: Icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon color={C.primary} size={20} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>
      {children}
    </View>
  </View>
);

const InputField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  </View>
);

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || '-'}</Text>
  </View>
);

const AdminCompanyScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    name: '', logo: '', industry: '', email: '', phone: '',
    address: '', city: '', state: '', country: '', zipCode: '',
    website: '', taxId: '', timezone: 'UTC', workingDays: 'Monday-Friday',
    officeStartTime: '09:00', officeEndTime: '17:00',
    adminName: '', adminEmail: '', adminPhone: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/organization', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success && res.data.data) {
        setOrganizations(res.data.data);
      }
    } catch (error) {
      console.log('Error fetching organizations', error);
    } finally {
      setFetching(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsEditing(true);
  };

  const handleEdit = (org) => {
    setEditingId(org._id);
    setFormData({
      name: org.name || '',
      logo: org.logo || '', industry: org.industry || '',
      email: org.email || '', phone: org.phone || '', address: org.address || '',
      city: org.city || '', state: org.state || '', country: org.country || '',
      zipCode: org.zipCode || '', website: org.website || '', taxId: org.taxId || '',
      timezone: org.timezone || 'UTC', workingDays: Array.isArray(org.workingDays) ? org.workingDays.join(', ') : (org.workingDays || 'Monday-Friday'),
      officeStartTime: org.officeStartTime || '09:00', officeEndTime: org.officeEndTime || '17:00',
      adminName: org.adminName || '', adminEmail: org.adminEmail || '', adminPhone: org.adminPhone || ''
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this company?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            await api.delete(`/organization/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            await fetchOrganizations();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete company');
          } finally {
            setLoading(false);
          }
        } 
      }
    ]);
  };

  const handleSave = async () => {
    if (!formData.name) {
      return Alert.alert('Validation Error', 'Company Name is required.');
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const payload = { ...formData };
      if (typeof payload.workingDays === 'string') {
        payload.workingDays = payload.workingDays.split(',').map(d => d.trim());
      }

      if (editingId) {
        await api.put(`/organization/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await api.post('/organization', payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      await fetchOrganizations();
      setIsEditing(false); // Switch back to view mode
      Alert.alert('Success', 'Company details saved successfully');
    } catch (error) {
      console.log('Save Error:', error.response ? error.response.data : error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save company details');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // ==== VIEW MODE ====
  if (!isEditing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.navigate('AdminOrganization')} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeftIcon color={C.ink} size={24} strokeWidth={2.5} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Companies</Text>
              <Text style={styles.headerSubtitle}>Manage registered organizations</Text>
            </View>
          </View>
          {organizations.length > 0 && (
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleAddNew} activeOpacity={0.85}>
              <PlusIcon color="#FFF" size={18} strokeWidth={2.5} />
              <Text style={styles.headerActionText}>Add Company</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {organizations.length === 0 ? (
            <View style={styles.emptyState}>
              <BuildingOfficeIcon color={C.inkMuted} size={48} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No Companies Registered</Text>
              <Text style={styles.emptySub}>Register a company to enable full system functionality.</Text>
              
              <TouchableOpacity style={styles.addBtn} onPress={handleAddNew}>
                <PlusIcon color="#FFF" size={20} />
                <Text style={styles.addBtnText}>Add Company</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {organizations.map(org => (
                <View key={org._id} style={[styles.card, { borderLeftColor: C.primary, borderLeftWidth: 4 }]}>
                  {/* Header: Initial, Name, Pill */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.initialCircle}>
                        <Text style={styles.initialText}>{org.name ? org.name.charAt(0).toUpperCase() : 'C'}</Text>
                      </View>
                      <Text style={styles.cardTitle}>{org.name}</Text>
                    </View>
                    <View style={styles.statusPill}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Active</Text>
                    </View>
                  </View>

                  {/* Gray Info Box */}
                  <View style={styles.grayInfoBox}>
                    <View style={styles.infoBoxCol}>
                      <Text style={styles.infoLabel}>INDUSTRY</Text>
                      <Text style={styles.infoValue}>{org.industry || 'Not set'}</Text>
                    </View>
                    <View style={styles.infoBoxCol}>
                      <Text style={styles.infoLabel}>CONTACT</Text>
                      <Text style={styles.infoValue}>{org.phone || 'Not set'}</Text>
                    </View>
                    <View style={styles.infoBoxCol}>
                      <Text style={styles.infoLabel}>EMAIL</Text>
                      <Text style={styles.infoValue}>{org.email || 'Not set'}</Text>
                    </View>
                  </View>

                  {/* System Admin Section */}
                  <View style={styles.adminSection}>
                    <Text style={styles.infoLabel}>SYSTEM ADMIN</Text>
                    <Text style={styles.adminName}>{org.adminName || 'Not assigned'}</Text>
                    {org.adminEmail ? <Text style={styles.adminEmail}>{org.adminEmail}</Text> : null}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity onPress={() => handleDelete(org._id)} style={[styles.footerBtn, styles.deleteBtn]} activeOpacity={0.8}>
                      <TrashIcon color={C.danger} size={16} strokeWidth={2.5} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleEdit(org)} style={[styles.footerBtn, styles.editBtn]} activeOpacity={0.8}>
                      <PencilIcon color="#FFF" size={16} strokeWidth={2.5} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==== EDIT/FORM MODE ====
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.backBtn}>
            <ChevronLeftIcon color={C.ink} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingId ? 'Edit Company' : 'Add Company'}</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save Company</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FormSection title="Basic Details" icon={BuildingOfficeIcon}>
            <InputField label="Company Name *" value={formData.name} onChangeText={t => updateField('name', t)} placeholder="Acme Corp" />
            <InputField label="Company Logo URL (optional)" value={formData.logo} onChangeText={t => updateField('logo', t)} placeholder="https://..." />
            <InputField label="Industry Type" value={formData.industry} onChangeText={t => updateField('industry', t)} placeholder="e.g. Technology" />
            <InputField label="Company Email" value={formData.email} onChangeText={t => updateField('email', t)} keyboardType="email-address" />
            <InputField label="Company Phone Number" value={formData.phone} onChangeText={t => updateField('phone', t)} keyboardType="phone-pad" />
            <InputField label="Company Website (optional)" value={formData.website} onChangeText={t => updateField('website', t)} keyboardType="url" />
            <InputField label="GST Number / Tax ID (optional)" value={formData.taxId} onChangeText={t => updateField('taxId', t)} />
          </FormSection>

          <FormSection title="Location Details" icon={MapPinIcon}>
            <InputField label="Company Address" value={formData.address} onChangeText={t => updateField('address', t)} multiline />
            <View style={styles.row}>
              <View style={styles.col}><InputField label="City" value={formData.city} onChangeText={t => updateField('city', t)} /></View>
              <View style={styles.col}><InputField label="State" value={formData.state} onChangeText={t => updateField('state', t)} /></View>
            </View>
            <View style={styles.row}>
              <View style={styles.col}><InputField label="Country" value={formData.country} onChangeText={t => updateField('country', t)} /></View>
              <View style={styles.col}><InputField label="ZIP / Postal Code" value={formData.zipCode} onChangeText={t => updateField('zipCode', t)} /></View>
            </View>
          </FormSection>

          <FormSection title="Operational Details" icon={ClockIcon}>
            <InputField label="Time Zone" value={formData.timezone} onChangeText={t => updateField('timezone', t)} placeholder="e.g. UTC, Asia/Kolkata" />
            <InputField label="Working Days" value={formData.workingDays} onChangeText={t => updateField('workingDays', t)} placeholder="e.g. Monday-Friday" />
            <View style={styles.row}>
              <View style={styles.col}><InputField label="Office Start Time" value={formData.officeStartTime} onChangeText={t => updateField('officeStartTime', t)} placeholder="09:00" /></View>
              <View style={styles.col}><InputField label="Office End Time" value={formData.officeEndTime} onChangeText={t => updateField('officeEndTime', t)} placeholder="17:00" /></View>
            </View>
          </FormSection>

          <FormSection title="Admin Contact Details" icon={UserIcon}>
            <InputField label="Company Admin Name" value={formData.adminName} onChangeText={t => updateField('adminName', t)} placeholder="Primary contact name" />
            <InputField label="Admin Email" value={formData.adminEmail} onChangeText={t => updateField('adminEmail', t)} keyboardType="email-address" />
            <InputField label="Admin Phone Number" value={formData.adminPhone} onChangeText={t => updateField('adminPhone', t)} keyboardType="phone-pad" />
          </FormSection>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { padding: 24, backgroundColor: C.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.borderLight },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.borderLight },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.inkMuted, marginTop: 2, fontWeight: '500' },
  headerActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  headerActionText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  
  saveBtn: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: C.inkMuted, fontWeight: '700', fontSize: 15 },
  
  scrollContent: { flexGrow: 1 },
  listContainer: { padding: 24, maxWidth: 1300, alignSelf: 'center', width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 8 },
  emptySub: { fontSize: 15, color: C.inkMuted, textAlign: 'center', paddingHorizontal: 20, marginBottom: 32, lineHeight: 24 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14, gap: 10, shadowColor: C.primary, shadowOffset: {width:0,height:6}, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  section: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.borderLight, marginBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset:{width:0, height:4}, shadowOpacity: 0.02, shadowRadius: 12, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.borderLight, backgroundColor: '#FAFAFA' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginLeft: 10 },
  sectionBody: { padding: 24 },
  
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: C.inkMuted, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#FAFAFA', color: C.ink },
  
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  detailLabel: { fontSize: 14, color: C.inkMuted, flex: 1, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '700', color: C.ink, flex: 2, textAlign: 'right' },
  
  row: { flexDirection: 'row', marginHorizontal: -8 },
  col: { flex: 1, paddingHorizontal: 8 },
  
  card: { width: 380, maxWidth: '100%', backgroundColor: '#FFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 20 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  initialCircle: { width: 44, height: 44, borderRadius: 16, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  initialText: { fontSize: 20, fontWeight: '800', color: C.primary },
  cardTitle: { fontSize: 18, fontWeight: '700', color: C.ink, flex: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  
  grayInfoBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, marginHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  infoBoxCol: { flex: 1, minWidth: 100 },
  infoLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  infoValue: { fontSize: 15, fontWeight: '600', color: C.ink },
  
  adminSection: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  adminName: { fontSize: 15, fontWeight: '600', color: C.ink },
  adminEmail: { fontSize: 14, color: C.inkMuted, marginTop: 4 },
  
  cardFooter: { flexDirection: 'row', padding: 24, gap: 12, paddingTop: 16 },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  deleteBtn: { backgroundColor: '#FFF1F2' },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#BE123C' },
  editBtn: { backgroundColor: C.primary, shadowColor: C.primary, shadowOffset:{width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  editBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

export default AdminCompanyScreen;
