import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BuildingOfficeIcon, RectangleGroupIcon, ClockIcon, UserPlusIcon,
  IdentificationIcon, ClipboardDocumentCheckIcon, ArrowRightOnRectangleIcon,
  CalendarDaysIcon, CheckBadgeIcon, DocumentArrowDownIcon, ChartBarIcon,
  XMarkIcon
} from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

const C = {
  bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0', borderLight: '#F1F5F9',
  ink: '#0F172A', inkMuted: '#64748B', primary: '#3B82F6', primarySoft: '#EFF6FF',
  success: '#10B981', successSoft: '#ECFDF5', warning: '#F59E0B', warningSoft: '#FFFBEB',
  purple: '#8B5CF6', purpleSoft: '#F5F3FF', pink: '#EC4899', pinkSoft: '#FDF2F8',
};

const WORKFLOW_STEPS = [
  { id: 1, title: 'Create Company', desc: 'Set up your company profile and details', icon: BuildingOfficeIcon, color: C.primary, bg: C.primarySoft, action: 'nav_AdminCompany' },
];

const AdminOrganizationScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'company', 'rules', 'payroll', 'login_info'
  const [orgData, setOrgData] = useState({});

  // Form State for Rules Modal
  const [ruleWorkHours, setRuleWorkHours] = useState('8');
  const [ruleGrace, setRuleGrace] = useState('15');
  const [ruleAnnual, setRuleAnnual] = useState('20');
  const [ruleSick, setRuleSick] = useState('10');

  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/organization', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const org = res.data.data;
        setOrgData(org);
        
        if (org.rules) {
          setRuleWorkHours(String(org.rules.standardWorkHours || 8));
          setRuleGrace(String(org.rules.gracePeriodMinutes || 15));
          setRuleAnnual(String(org.rules.annualLeaveLimit || 20));
          setRuleSick(String(org.rules.sickLeaveLimit || 10));
        }
      }
    } catch (error) {
      console.log('No organization found or created yet.');
    }
  };

  const saveOrganization = async (payload) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      await api.put('/organization', payload, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Organization settings saved successfully');
      fetchOrganization();
      setActiveModal(null);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action.startsWith('nav_')) {
      const screenName = action.replace('nav_', '');
      navigation.navigate(screenName);
    } else {
      setActiveModal(action);
    }
  };

  const downloadPayroll = async () => {
    const token = await AsyncStorage.getItem('userToken');
    const url = `${api.defaults.baseURL}/payroll/export?month=${payrollMonth}&year=${payrollYear}`;
    // For a real app, you would fetch the file and save it or just open in browser to trigger download
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Failed to open URL'));
    setActiveModal(null);
  };

  const renderModalContent = () => {
    if (activeModal === 'rules') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Attendance Rules</Text>
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.label}>Standard Hours</Text>
              <TextInput style={styles.input} value={ruleWorkHours} onChangeText={setRuleWorkHours} keyboardType="numeric" />
            </View>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.label}>Grace (Mins)</Text>
              <TextInput style={styles.input} value={ruleGrace} onChangeText={setRuleGrace} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.label}>Annual Leaves</Text>
              <TextInput style={styles.input} value={ruleAnnual} onChangeText={setRuleAnnual} keyboardType="numeric" />
            </View>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.label}>Sick Leaves</Text>
              <TextInput style={styles.input} value={ruleSick} onChangeText={setRuleSick} keyboardType="numeric" />
            </View>
          </View>
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={() => saveOrganization({ rules: { standardWorkHours: Number(ruleWorkHours), gracePeriodMinutes: Number(ruleGrace), annualLeaveLimit: Number(ruleAnnual), sickLeaveLimit: Number(ruleSick) } })}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Rules</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    if (activeModal === 'payroll') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Payroll Export</Text>
          <Text style={{color: C.inkMuted, marginBottom: 16}}>Generate a CSV of total hours worked, leaves, and absences for payroll processing.</Text>
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.label}>Month (1-12)</Text>
              <TextInput style={styles.input} value={String(payrollMonth)} onChangeText={t => setPayrollMonth(t)} keyboardType="numeric" />
            </View>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.label}>Year</Text>
              <TextInput style={styles.input} value={String(payrollYear)} onChangeText={t => setPayrollYear(t)} keyboardType="numeric" />
            </View>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={downloadPayroll}>
            <Text style={styles.saveBtnText}>Download CSV</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeModal === 'login_info') {
      return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Employee Login Guide</Text>
          <Text style={{color: C.inkMuted, marginBottom: 16, lineHeight: 22}}>
            1. Employees must download the mobile app.{"\n"}
            2. They log in using the email and password you set for them in the "Add Employees" step.{"\n"}
            3. They can optionally set up Biometric Login on their first sign-in.{"\n"}
            4. They will only see the Employee Dashboard, not the Admin controls.
          </Text>
          <TouchableOpacity style={[styles.saveBtn, {backgroundColor: C.border}]} onPress={() => setActiveModal(null)}>
            <Text style={[styles.saveBtnText, {color: C.ink}]}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Organization Setup</Text>
          <Text style={styles.headerSub}>End-to-end system workflow</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <BuildingOfficeIcon color={C.primary} size={48} strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>Welcome to AttendanceOS</Text>
          <Text style={styles.heroDesc}>
            Your journey to a streamlined attendance system starts here. 
            Let's begin by setting up your company profile and core details.
          </Text>
          
          <TouchableOpacity 
            style={styles.heroBtn} 
            activeOpacity={0.85} 
            onPress={() => handleAction('nav_AdminCompany')}
          >
            <Text style={styles.heroBtnText}>Create Company Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dynamic Modal */}
      <Modal visible={!!activeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setActiveModal(null)}>
              <XMarkIcon color={C.ink} size={24} />
            </TouchableOpacity>
            {renderModalContent()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 24, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 24, fontWeight: '700', color: C.ink },
  headerSub: { fontSize: 14, color: C.inkMuted, marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    marginTop: 40,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%'
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 12,
    textAlign: 'center'
  },
  heroDesc: {
    fontSize: 16,
    color: C.inkMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
    paddingHorizontal: 20
  },
  heroBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6
  },
  heroBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalWrapper: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
  closeBtn: { position: 'absolute', top: 24, right: 24, zIndex: 10 },
  modalContent: { marginTop: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 20 },
  formRow: { flexDirection: 'row', gap: 12 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: C.bg },
  saveBtn: { backgroundColor: C.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});

export default AdminOrganizationScreen;
