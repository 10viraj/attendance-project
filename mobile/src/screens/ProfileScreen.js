import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { UserIcon, PhoneIcon, MapPinIcon, EnvelopeIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const THEMES = {
  night: {
    greeting: 'Good Night',
    colors: ['#312e81', '#4f46e5'], // Night indigo
    shadow: '#3730a3'
  },
  morning: {
    greeting: 'Good Morning',
    colors: ['#f59e0b', '#fbbf24'], // Morning amber/yellow
    shadow: '#d97706'
  },
  afternoon: {
    greeting: 'Good Afternoon',
    colors: ['#0ea5e9', '#38bdf8'], // Afternoon sky blue
    shadow: '#0284c7'
  },
  evening: {
    greeting: 'Good Evening',
    colors: ['#f43f5e', '#fb923c'], // Sunset rose/orange
    shadow: '#e11d48'
  }
};

const ProfileScreen = ({ navigation }) => {
  const [employee, setEmployee] = useState(null);
  const [user, setUser] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
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
        setPhone(parsed.phone || '');
        if (parsed.address) {
          setStreet(parsed.address.street || '');
          setCity(parsed.address.city || '');
        }
      }

      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setEmail(parsedUser.email || '');
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
        email,
        phone,
        address: { street, city }
      };

      const res = await api.put('/employees/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        await AsyncStorage.setItem('employeeInfo', JSON.stringify(res.data.data));
        setEmployee(res.data.data);

        if (res.data.user) {
          await AsyncStorage.setItem('userInfo', JSON.stringify(res.data.user));
          setUser(res.data.user);
        }

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

  // Determine time of day
  const hour = new Date().getHours();
  let timeTheme = THEMES.night;

  if (hour >= 5 && hour < 12) {
    timeTheme = THEMES.morning;
  } else if (hour >= 12 && hour < 17) {
    timeTheme = THEMES.afternoon;
  } else if (hour >= 17 && hour < 20) {
    timeTheme = THEMES.evening;
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4f46e5" barStyle="light-content" translucent={false} />

      {/* Vibrant Modern Gradient Header */}
      <LinearGradient
        colors={timeTheme.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* Header Profile Info */}
          <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { shadowColor: timeTheme.shadow }]}>
              <View style={styles.avatarInner}>
                <Text style={[styles.avatarText, { color: timeTheme.colors[0] }]}>
                  {employee?.firstName?.[0] || 'U'}
                </Text>
              </View>
            </View>
            <Text style={styles.greetingText}>
              {timeTheme.greeting},
            </Text>
            <Text style={styles.userName}>
              {employee ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'User'}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.userRole}>
                {employee ? `${employee.employeeId} • ${employee.designation || 'Employee'}` : 'Employee'}
              </Text>
            </View>
          </View>

          {/* Editable Form Container */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

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
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onFocus={() => setFocusedInput('firstName')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputWrapperFocused]}>
                <EnvelopeIcon color={focusedInput === 'email' ? '#4f46e5' : '#94a3b8'} size={20} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. john@company.com"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputWrapper, focusedInput === 'phone' && styles.inputWrapperFocused]}>
                <PhoneIcon color={focusedInput === 'phone' ? '#4f46e5' : '#94a3b8'} size={20} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (234) 567-8900"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="numeric"
                  maxLength={15}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View> */}

            {/* <View style={styles.inputGroup}>
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
            </View> */}

            <TouchableOpacity
              onPress={handleUpdate}
              disabled={saving}
              activeOpacity={0.8}
              style={{ marginTop: 24 }}
            >
              <LinearGradient
                colors={timeTheme.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.saveButton, { shadowColor: timeTheme.shadow }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
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
    backgroundColor: '#f8fafc',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 44,
    fontWeight: '800',
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
  },
  userRole: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: '#9333ea',
    backgroundColor: '#ffffff',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    opacity: 0.6,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  saveButton: {
    height: 56,
    borderRadius: 28, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    height: 56,
    borderRadius: 28, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f43f5e',
  },
  logoutButtonText: {
    color: '#f43f5e',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;
