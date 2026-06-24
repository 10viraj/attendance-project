import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FingerPrintIcon } from 'react-native-heroicons/solid';
import { BriefcaseIcon, EyeIcon, EyeSlashIcon, ChevronRightIcon } from 'react-native-heroicons/outline';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState('');

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordInputRef = useRef(null);

  useEffect(() => {
    checkSavedSession();
  }, []);

  const checkSavedSession = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        setHasSavedSession(true);
      }
    } catch (e) {
      console.error('Error checking session', e);
    }
  };

  const handleBiometricLogin = async () => {
    setFormError('');
    setBiometricLoading(true);
    try {
      const token = await AsyncStorage.getItem('biometricToken') || await AsyncStorage.getItem('userToken');
      if (!token) {
        setFormError('Please log in with email and password first to enable biometrics.');
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        setFormError('No biometric hardware detected. Falling back to auto-login...');
        await autoLogin();
        return;
      }

      if (!isEnrolled) {
        setFormError('No biometrics enrolled on this device. Falling back to auto-login...');
        await autoLogin();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Attendance App',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setFormError('Biometric success! Logging in...');
        // Restore session from biometric backups
        await AsyncStorage.setItem('userToken', token);
        const bUser = await AsyncStorage.getItem('biometricUserInfo');
        const bEmp = await AsyncStorage.getItem('biometricEmployeeInfo');
        if (bUser) await AsyncStorage.setItem('userInfo', bUser);
        if (bEmp) await AsyncStorage.setItem('employeeInfo', bEmp);

        await autoLogin();
      } else {
        setFormError(`Biometric cancelled or failed: ${result.error || 'Unknown'}`);
      }
    } catch (error) {
      console.error('Biometric error', error);
      setFormError(`Biometric error: ${error.message || 'Please try again.'}`);
    } finally {
      setBiometricLoading(false);
    }
  };

  const autoLogin = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo.role === 'Admin') {
          navigation.replace('AdminMain');
        } else {
          navigation.replace('Main');
        }
      } else {
        await switchAccount();
        setFormError('Session corrupted. Please log in again.');
      }
    } catch (error) {
      console.error('Auto login error', error);
      await switchAccount();
      setFormError('Failed to read session. Please log in again.');
    }
  };

  const validate = () => {
    const errors = { email: '', password: '' };
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleLogin = async () => {
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (response.data && response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userInfo', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('biometricToken', response.data.token);
        await AsyncStorage.setItem('biometricUserInfo', JSON.stringify(response.data.user));

        if (response.data.employee) {
          await AsyncStorage.setItem('employeeInfo', JSON.stringify(response.data.employee));
          await AsyncStorage.setItem('biometricEmployeeInfo', JSON.stringify(response.data.employee));
        }

        if (response.data.user.role === 'Admin') {
          navigation.replace('AdminMain');
        } else {
          navigation.replace('Main');
        }
      }
    } catch (error) {
      console.error('Login Error:', error.response?.data || error.message);
      setFormError(
        error.response?.data?.message || 'Invalid credentials or server error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const switchAccount = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
    await AsyncStorage.removeItem('employeeInfo');
    setHasSavedSession(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.iconBox}>
                <BriefcaseIcon color="#FFFFFF" size={24} />
              </View>
              <Text style={styles.logoText}>Corporate</Text>
            </View>

            {/* Welcome Text */}
            <Text style={styles.titleText}>Welcome back</Text>
            <Text style={styles.subtitleText}>Sign in to mark your attendance</Text>

            {/* Form Inputs */}
            <View style={styles.formContainer}>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused, fieldErrors.email && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="demo@corporate.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                </View>
                {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Password</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused, fieldErrors.password && styles.inputWrapperError]}>
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    returnKeyType="done"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    {showPassword ? (
                      <EyeIcon size={20} color="#475569" />
                    ) : (
                      <EyeSlashIcon size={20} color="#475569" />
                    )}
                  </TouchableOpacity>
                </View>
                {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
              </View>

              {/* Form Error */}
              {formError ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 12 }]}>{formError}</Text> : null}

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Biometric Card */}
            <TouchableOpacity
              style={styles.biometricCard}
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
              activeOpacity={0.7}
            >
              <View style={styles.biometricIconBox}>
                <FingerPrintIcon size={24} color="#37474F" />
              </View>
              <View style={styles.biometricTextContent}>
                <Text style={styles.biometricTitle}>Biometric Login</Text>
                <Text style={styles.biometricSub}>Use Face ID or Fingerprint</Text>
              </View>
              {biometricLoading ? (
                <ActivityIndicator color="#475569" size="small" />
              ) : (
                <ChevronRightIcon size={20} color="#64748B" />
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    flexGrow: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#37474F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  titleText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitleText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 40,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: '#37474F',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  signInButton: {
    backgroundColor: '#37474F',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748B',
    fontSize: 14,
  },
  biometricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
    marginBottom: 32,
  },
  biometricIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  biometricTextContent: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  biometricSub: {
    fontSize: 14,
    color: '#64748B',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  footerLink: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;