import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { UserIcon, PhoneIcon, MapPinIcon, EnvelopeIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const ProfileScreen = ({ navigation }) => {
  const [employee, setEmployee] = useState(null);
  const [user, setUser] = useState(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  
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
        setPhone(parsed.phone || '');
        if (parsed.address) {
          setStreet(parsed.address.street || '');
          setCity(parsed.address.city || '');
        }
      }
      
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading profile from storage', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const payload = {
        firstName,
        lastName,
        phone,
        address: { street, city }
      };

      const res = await api.put('/employees/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        await AsyncStorage.setItem('employeeInfo', JSON.stringify(res.data.data));
        setEmployee(res.data.data);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
    await AsyncStorage.removeItem('employeeInfo');
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4f46e5" barStyle="light-content" translucent={false} />
      
      {/* Premium Gradient Header Background */}
      <LinearGradient
        colors={['#4f46e5', '#3b82f6', '#0ea5e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header Profile Info */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.avatarInner}
              >
                <Text style={styles.avatarText}>
                  {employee?.firstName?.[0] || 'U'}
                </Text>
              </LinearGradient>
            </View>
            <Text style={styles.userName}>
              {employee ? `${employee.firstName} ${employee.lastName}` : 'User'}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.userRole}>
                {employee ? `${employee.employeeId} • ${employee.designation || 'Employee'}` : 'Employee'}
              </Text>
            </View>
          </View>

          {/* Form Container */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={[styles.inputWrapper, focusedInput === 'firstName' && styles.inputWrapperFocused]}>
                <UserIcon color={focusedInput === 'firstName' ? '#4f46e5' : '#94a3b8'} size={20} />
                <TextInput 
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="e.g. John"
                  placeholderTextColor="#cbd5e1"
                  onFocus={() => setFocusedInput('firstName')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {user?.role !== 'Admin' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={[styles.inputWrapper, focusedInput === 'lastName' && styles.inputWrapperFocused]}>
                  <UserIcon color={focusedInput === 'lastName' ? '#4f46e5' : '#94a3b8'} size={20} />
                  <TextInput 
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="e.g. Doe"
                    placeholderTextColor="#cbd5e1"
                    onFocus={() => setFocusedInput('lastName')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <EnvelopeIcon color="#94a3b8" size={20} />
                <TextInput 
                  style={[styles.input, { color: '#94a3b8' }]}
                  value={user?.email || ''}
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputWrapper, focusedInput === 'phone' && styles.inputWrapperFocused]}>
                <PhoneIcon color={focusedInput === 'phone' ? '#4f46e5' : '#94a3b8'} size={20} />
                <TextInput 
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (234) 567-8900"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Home Address</Text>
              <View style={[styles.inputWrapper, { marginBottom: 16 }, focusedInput === 'street' && styles.inputWrapperFocused]}>
                <MapPinIcon color={focusedInput === 'street' ? '#4f46e5' : '#94a3b8'} size={20} />
                <TextInput 
                  style={styles.input}
                  value={street}
                  onChangeText={setStreet}
                  placeholder="Street Address"
                  placeholderTextColor="#cbd5e1"
                  onFocus={() => setFocusedInput('street')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
              <View style={[styles.inputWrapper, focusedInput === 'city' && styles.inputWrapperFocused]}>
                <View style={{ width: 20 }} />
                <TextInput 
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="#cbd5e1"
                  onFocus={() => setFocusedInput('city')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleUpdate}
              disabled={saving}
              activeOpacity={0.8}
              style={{ marginTop: 16 }}
            >
              <LinearGradient
                colors={['#4f46e5', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Profile Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Log Out Securely</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9', // Very light slate
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 50,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    marginBottom: 16,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#4f46e5',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    padding: 28,
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 60,
  },
  inputWrapperFocused: {
    borderColor: '#4f46e5',
    backgroundColor: '#ffffff',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#f1f5f9',
    opacity: 0.7,
  },
  input: {
    flex: 1,
    marginLeft: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  saveButton: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#e11d48',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;
