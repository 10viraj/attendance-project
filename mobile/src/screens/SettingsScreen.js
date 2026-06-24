import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  ChevronLeftIcon 
} from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const SettingsScreen = ({ navigation }) => {
  const [employee, setEmployee] = useState(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const employeeData = await AsyncStorage.getItem('employeeInfo');
      const userData = await AsyncStorage.getItem('userInfo');

      if (employeeData) {
        const parsed = JSON.parse(employeeData);
        setEmployee(parsed);
        setFirstName(parsed.firstName || '');
        setLastName(parsed.lastName || '');
      }

      if (userData) {
        const parsedUser = JSON.parse(userData);
        setEmail(parsedUser.email || '');
      }
    } catch (error) {
      console.error('Error loading profile from storage', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!firstName || !email) {
      Alert.alert('Error', 'First Name and Email are required');
      return;
    }

    if (newPassword && !currentPassword) {
      Alert.alert('Error', 'Please enter your current password to set a new password');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      let profileUpdated = false;
      let passwordUpdated = false;

      // Update Profile (Name & Email)
      const profilePayload = { firstName, lastName, email };
      const profileRes = await api.put('/employees/profile', profilePayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (profileRes.data.success) {
        await AsyncStorage.setItem('employeeInfo', JSON.stringify(profileRes.data.data));
        if (profileRes.data.user) {
          await AsyncStorage.setItem('userInfo', JSON.stringify(profileRes.data.user));
        }
        profileUpdated = true;
      }

      // Update Password if provided
      if (currentPassword && newPassword) {
        const passRes = await api.put('/auth/password', { currentPassword, newPassword }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (passRes.data.success) {
          passwordUpdated = true;
          setCurrentPassword('');
          setNewPassword('');
        }
      }

      if (profileUpdated && passwordUpdated) {
        Alert.alert('Success', 'Profile and password updated successfully!');
      } else if (profileUpdated) {
        Alert.alert('Success', 'Profile updated successfully!');
      }

    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#37474F" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button & Page Title */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeftIcon color="#0F172A" size={24} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Settings</Text>
          
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={[styles.inputWrapper, focusedInput === 'firstName' && styles.inputWrapperFocused]}>
                <UserIcon color={focusedInput === 'firstName' ? '#0F172A' : '#94A3B8'} size={20} />
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor="#CBD5E1"
                  returnKeyType="next"
                  onFocus={() => setFocusedInput('firstName')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={[styles.inputWrapper, focusedInput === 'lastName' && styles.inputWrapperFocused]}>
                <UserIcon color={focusedInput === 'lastName' ? '#0F172A' : '#94A3B8'} size={20} />
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor="#CBD5E1"
                  returnKeyType="next"
                  onFocus={() => setFocusedInput('lastName')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputWrapperFocused]}>
                <EnvelopeIcon color={focusedInput === 'email' ? '#0F172A' : '#94A3B8'} size={20} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@company.com"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={[styles.inputWrapper, focusedInput === 'currentPassword' && styles.inputWrapperFocused]}>
                <LockClosedIcon color={focusedInput === 'currentPassword' ? '#0F172A' : '#94A3B8'} size={20} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#CBD5E1"
                  secureTextEntry
                  returnKeyType="next"
                  onFocus={() => setFocusedInput('currentPassword')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={[styles.inputWrapper, focusedInput === 'newPassword' && styles.inputWrapperFocused]}>
                <LockClosedIcon color={focusedInput === 'newPassword' ? '#0F172A' : '#94A3B8'} size={20} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#CBD5E1"
                  secureTextEntry
                  returnKeyType="done"
                  onFocus={() => setFocusedInput('newPassword')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleUpdate}
            disabled={saving}
            activeOpacity={0.8}
            style={styles.saveBtn}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    letterSpacing: -1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: '#37474F',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#37474F',
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SettingsScreen;
