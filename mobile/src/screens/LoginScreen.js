import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FingerPrintIcon, KeyIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon } from 'react-native-heroicons/solid';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styled } from 'nativewind';
import api from '../config/api';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

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

  // Only detect that a saved session exists. Do NOT trigger the biometric
  // prompt automatically — let the user see the "locked" state and tap to
  // unlock themselves. Auto-firing a system biometric sheet before the
  // screen has rendered is disorienting and feels involuntary.
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
    setBiometricLoading(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // If no biometrics available, fall back to auto-login since they
      // already have a valid token.
      if (!hasHardware || !isEnrolled) {
        await autoLogin();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Attendance App',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        await autoLogin();
      }
    } catch (error) {
      console.error('Biometric error', error);
      setFormError('Biometric authentication failed. Please try again.');
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

        if (response.data.employee) {
          await AsyncStorage.setItem('employeeInfo', JSON.stringify(response.data.employee));
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
    <StyledView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center px-6"
        >
          <StyledView className="items-center mb-10">
            <StyledView className="w-16 h-16 bg-blue-500/15 rounded-2xl items-center justify-center mb-5">
              <FingerPrintIcon size={32} color="#85B7EB" />
            </StyledView>
            <StyledText className="text-white font-medium text-2xl text-center">
              {hasSavedSession ? 'App is locked' : 'Welcome back'}
            </StyledText>
            <StyledText className="text-slate-400 mt-2 text-sm text-center">
              {hasSavedSession ? 'Authenticate to continue' : 'Mark your attendance smartly'}
            </StyledText>
          </StyledView>

          <StyledView className="w-full max-w-sm mx-auto">
            {hasSavedSession ? (
              <StyledView className="items-center">
                <StyledTouchableOpacity
                  className="w-full bg-blue-500 py-3.5 rounded-xl flex-row justify-center items-center active:bg-blue-600 mb-4"
                  onPress={handleBiometricLogin}
                  disabled={biometricLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Unlock with biometrics"
                >
                  {biometricLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FingerPrintIcon size={18} color="#fff" />
                      <StyledText className="text-white font-medium text-base ml-2">
                        Unlock with biometrics
                      </StyledText>
                    </>
                  )}
                </StyledTouchableOpacity>

                {formError ? (
                  <StyledText className="text-red-400 text-sm text-center mb-3">{formError}</StyledText>
                ) : null}

                <StyledTouchableOpacity onPress={switchAccount} accessibilityRole="button">
                  <StyledText className="text-blue-400 font-medium text-sm">
                    Log in with a different account
                  </StyledText>
                </StyledTouchableOpacity>
              </StyledView>
            ) : (
              <>
                <StyledView className="mb-1">
                  <StyledText className="text-slate-400 text-xs mb-1.5 ml-1">Email address</StyledText>
                  <StyledView
                    className={`flex-row items-center bg-white/5 px-4 py-3 rounded-xl border ${fieldErrors.email
                        ? 'border-red-500/60'
                        : emailFocused
                          ? 'border-blue-400/60'
                          : 'border-white/10'
                      }`}
                  >
                    <EnvelopeIcon size={18} color="#64748b" />
                    <StyledTextInput
                      className="flex-1 ml-3 text-white text-sm"
                      placeholder="you@company.com"
                      placeholderTextColor="#64748b"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      returnKeyType="next"
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                  </StyledView>
                  {fieldErrors.email ? (
                    <StyledText className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.email}</StyledText>
                  ) : null}
                </StyledView>

                <StyledView className="mt-3 mb-1">
                  <StyledText className="text-slate-400 text-xs mb-1.5 ml-1">Password</StyledText>
                  <StyledView
                    className={`flex-row items-center bg-white/5 px-4 py-3 rounded-xl border ${fieldErrors.password
                        ? 'border-red-500/60'
                        : passwordFocused
                          ? 'border-blue-400/60'
                          : 'border-white/10'
                      }`}
                  >
                    <KeyIcon size={18} color="#64748b" />
                    <StyledTextInput
                      ref={passwordInputRef}
                      className="flex-1 ml-3 text-white text-sm"
                      placeholder="••••••••"
                      placeholderTextColor="#64748b"
                      autoCapitalize="none"
                      autoComplete="password"
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      onSubmitEditing={handleLogin}
                    />
                    <StyledTouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showPassword ? (
                        <EyeSlashIcon size={18} color="#64748b" />
                      ) : (
                        <EyeIcon size={18} color="#64748b" />
                      )}
                    </StyledTouchableOpacity>
                  </StyledView>
                  {fieldErrors.password ? (
                    <StyledText className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.password}</StyledText>
                  ) : null}
                </StyledView>

                <StyledView className="items-end mt-1 mb-5">
                  <StyledTouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    accessibilityRole="button"
                  >
                    <StyledText className="text-blue-400 text-xs font-medium">Forgot password?</StyledText>
                  </StyledTouchableOpacity>
                </StyledView>

                {formError ? (
                  <StyledText className="text-red-400 text-sm text-center mb-3">{formError}</StyledText>
                ) : null}

                <StyledTouchableOpacity
                  className="w-full bg-blue-500 py-3.5 rounded-xl flex-row justify-center items-center active:bg-blue-600"
                  onPress={handleLogin}
                  disabled={loading}
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <StyledText className="text-white font-medium text-base">Log in</StyledText>
                  )}
                </StyledTouchableOpacity>

                <StyledView className="flex-row items-center my-5">
                  <StyledView className="flex-1 h-px bg-white/10" />
                  <StyledText className="text-slate-500 text-xs mx-3">or</StyledText>
                  <StyledView className="flex-1 h-px bg-white/10" />
                </StyledView>

                <StyledTouchableOpacity
                  className="w-full flex-row items-center justify-center py-3 rounded-xl border border-white/10 active:bg-white/5"
                  onPress={handleBiometricLogin}
                  accessibilityRole="button"
                >
                  <FingerPrintIcon size={18} color="#85B7EB" />
                  <StyledText className="text-slate-300 font-medium text-sm ml-2">
                    Use biometrics instead
                  </StyledText>
                </StyledTouchableOpacity>

                <StyledView className="flex-row justify-center items-center mt-7">
                  <StyledText className="text-slate-400 text-sm">Don't have an account? </StyledText>
                  <StyledTouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <StyledText className="text-blue-400 font-medium text-sm">Sign up</StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
              </>
            )}
          </StyledView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </StyledView>
  );
};

export default LoginScreen;