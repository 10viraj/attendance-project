import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FingerPrintIcon, KeyIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon } from 'react-native-heroicons/solid';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
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

  // return (
  //   <LinearGradient colors={['#4f46e5', '#3b82f6', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
  //     <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
  //     <SafeAreaView className="flex-1">
  //       <KeyboardAvoidingView
  //         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  //         className="flex-1 justify-center px-6"
  //       >
  //         <View className="items-center mb-10">
  //           <View className="w-16 h-16 bg-blue-500/15 rounded-2xl items-center justify-center mb-5">
  //             <FingerPrintIcon size={32} color="#85B7EB" />
  //           </View>
  //           <Text className="text-white font-medium text-2xl text-center">
  //             {hasSavedSession ? 'App is locked' : 'Welcome back'}
  //           </Text>
  //           <Text className="text-slate-400 mt-2 text-sm text-center">
  //             {hasSavedSession ? 'Authenticate to continue' : 'Mark your attendance smartly'}
  //           </Text>
  //         </View>

  //         <View className="w-full max-w-sm mx-auto">
  //           {hasSavedSession ? (
  //             <View className="items-center">
  //               <TouchableOpacity
  //                 className="w-full bg-blue-500 py-3.5 rounded-xl flex-row justify-center items-center active:bg-blue-600 mb-4"
  //                 onPress={handleBiometricLogin}
  //                 disabled={biometricLoading}
  //                 accessibilityRole="button"
  //                 accessibilityLabel="Unlock with biometrics"
  //               >
  //                 {biometricLoading ? (
  //                   <ActivityIndicator color="#fff" />
  //                 ) : (
  //                   <>
  //                     <FingerPrintIcon size={18} color="#fff" />
  //                     <Text className="text-white font-medium text-base ml-2">
  //                       Unlock with biometrics
  //                     </Text>
  //                   </>
  //                 )}
  //               </TouchableOpacity>

  //               {formError ? (
  //                 <Text className="text-red-400 text-sm text-center mb-3">{formError}</Text>
  //               ) : null}

  //               <TouchableOpacity onPress={switchAccount} accessibilityRole="button">
  //                 <Text className="text-blue-400 font-medium text-sm">
  //                   Log in with a different account
  //                 </Text>
  //               </TouchableOpacity>
  //             </View>
  //           ) : (
  //             <>
  //               <View className="mb-1">
  //                 <Text className="text-slate-400 text-xs mb-1.5 ml-1">Email address</Text>
  //                 <View
  //                   className={`flex-row items-center bg-white/5 px-4 py-3 rounded-xl border ${fieldErrors.email
  //                       ? 'border-red-500/60'
  //                       : emailFocused
  //                         ? 'border-blue-400/60'
  //                         : 'border-white/10'
  //                     }`}
  //                 >
  //                   <EnvelopeIcon size={18} color="#64748b" />
  //                   <TextInput
  //                     className="flex-1 ml-3 text-white text-sm"
  //                     placeholder="you@company.com"
  //                     placeholderTextColor="#64748b"
  //                     autoCapitalize="none"
  //                     autoComplete="email"
  //                     keyboardType="email-address"
  //                     returnKeyType="next"
  //                     value={email}
  //                     onChangeText={(t) => {
  //                       setEmail(t);
  //                       if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
  //                     }}
  //                     onFocus={() => setEmailFocused(true)}
  //                     onBlur={() => setEmailFocused(false)}
  //                     onSubmitEditing={() => passwordInputRef.current?.focus()}
  //                   />
  //                 </View>
  //                 {fieldErrors.email ? (
  //                   <Text className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.email}</Text>
  //                 ) : null}
  //               </View>

  //               <View className="mt-3 mb-1">
  //                 <Text className="text-slate-400 text-xs mb-1.5 ml-1">Password</Text>
  //                 <View
  //                   className={`flex-row items-center bg-white/5 px-4 py-3 rounded-xl border ${fieldErrors.password
  //                       ? 'border-red-500/60'
  //                       : passwordFocused
  //                         ? 'border-blue-400/60'
  //                         : 'border-white/10'
  //                     }`}
  //                 >
  //                   <KeyIcon size={18} color="#64748b" />
  //                   <TextInput
  //                     ref={passwordInputRef}
  //                     className="flex-1 ml-3 text-white text-sm"
  //                     placeholder="••••••••"
  //                     placeholderTextColor="#64748b"
  //                     autoCapitalize="none"
  //                     autoComplete="password"
  //                     secureTextEntry={!showPassword}
  //                     returnKeyType="done"
  //                     value={password}
  //                     onChangeText={(t) => {
  //                       setPassword(t);
  //                       if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
  //                     }}
  //                     onFocus={() => setPasswordFocused(true)}
  //                     onBlur={() => setPasswordFocused(false)}
  //                     onSubmitEditing={handleLogin}
  //                   />
  //                   <TouchableOpacity
  //                     onPress={() => setShowPassword((v) => !v)}
  //                     accessibilityRole="button"
  //                     accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
  //                     hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  //                   >
  //                     {showPassword ? (
  //                       <EyeSlashIcon size={18} color="#64748b" />
  //                     ) : (
  //                       <EyeIcon size={18} color="#64748b" />
  //                     )}
  //                   </TouchableOpacity>
  //                 </View>
  //                 {fieldErrors.password ? (
  //                   <Text className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.password}</Text>
  //                 ) : null}
  //               </View>

  //               <View className="items-end mt-1 mb-5">
  //                 <TouchableOpacity
  //                   onPress={() => navigation.navigate('ForgotPassword')}
  //                   accessibilityRole="button"
  //                 >
  //                   <Text className="text-blue-400 text-xs font-medium">Forgot password?</Text>
  //                 </TouchableOpacity>
  //               </View>

  //               {formError ? (
  //                 <Text className="text-red-400 text-sm text-center mb-3">{formError}</Text>
  //               ) : null}

  //               <TouchableOpacity
  //                 className="w-full bg-blue-500 py-3.5 rounded-xl flex-row justify-center items-center active:bg-blue-600"
  //                 onPress={handleLogin}
  //                 disabled={loading}
  //                 accessibilityRole="button"
  //               >
  //                 {loading ? (
  //                   <ActivityIndicator color="#fff" />
  //                 ) : (
  //                   <Text className="text-white font-medium text-base">Log in</Text>
  //                 )}
  //               </TouchableOpacity>

  //               <View className="flex-row items-center my-5">
  //                 <View className="flex-1 h-px bg-white/10" />
  //                 <Text className="text-slate-500 text-xs mx-3">or</Text>
  //                 <View className="flex-1 h-px bg-white/10" />
  //               </View>

  //               <TouchableOpacity
  //                 className="w-full flex-row items-center justify-center py-3 rounded-xl border border-white/10 active:bg-white/5"
  //                 onPress={handleBiometricLogin}
  //                 accessibilityRole="button"
  //               >
  //                 <FingerPrintIcon size={18} color="#85B7EB" />
  //                 <Text className="text-slate-300 font-medium text-sm ml-2">
  //                   Use biometrics instead
  //                 </Text>
  //               </TouchableOpacity>

  //               <View className="flex-row justify-center items-center mt-7">
  //                 <Text className="text-slate-400 text-sm">Don't have an account? </Text>
  //                 <TouchableOpacity onPress={() => navigation.navigate('Register')}>
  //                   <Text className="text-blue-400 font-medium text-sm">Sign up</Text>
  //                 </TouchableOpacity>
  //               </View>
  //             </>
  //           )}
  //         </View>
  //       </KeyboardAvoidingView>
  //     </SafeAreaView>
  //   </LinearGradient>
  // );
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 28,
              paddingTop: 40,
              paddingBottom: 30,
            }}
          >
            {/* Header */}
            <View style={{ marginBottom: 40 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: '#F3F4F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    backgroundColor: '#2F67F6',
                  }}
                />
              </View>

              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: '#0F172A',
                  lineHeight: 36,
                  marginBottom: 12,
                }}
              >
                Sign in to your{'\n'}account
              </Text>

              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 24,
                  color: '#6B7280',
                }}
              >
                Enter your enterprise credentials to securely access your
                workspace.
              </Text>
            </View>

            {/* Email */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: '#1F2937',
                marginBottom: 8,
              }}
            >
              Email address
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 56,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 16,
                paddingHorizontal: 16,
                backgroundColor: '#FFFFFF',
              }}
            >
              <EnvelopeIcon size={20} color="#9CA3AF" />

              <TextInput
                placeholder="name@company.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 16,
                  color: '#111827',
                }}
              />
            </View>

            {fieldErrors.email ? (
              <Text
                style={{
                  color: '#EF4444',
                  marginTop: 8,
                }}
              >
                {fieldErrors.email}
              </Text>
            ) : null}

            {/* Password Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#1F2937',
                }}
              >
                Password
              </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text
                  style={{
                    color: '#2F67F6',
                    fontWeight: '600',
                    fontSize: 14,
                  }}
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Password Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 56,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 16,
                paddingHorizontal: 16,
                backgroundColor: '#FFFFFF',
              }}
            >
              <KeyIcon size={20} color="#9CA3AF" />

              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 16,
                  color: '#111827',
                }}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeSlashIcon size={20} color="#9CA3AF" />
                ) : (
                  <EyeIcon size={20} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </View>

            {fieldErrors.password ? (
              <Text
                style={{
                  color: '#EF4444',
                  marginTop: 8,
                }}
              >
                {fieldErrors.password}
              </Text>
            ) : null}

            {formError ? (
              <Text
                style={{
                  color: '#EF4444',
                  textAlign: 'center',
                  marginTop: 20,
                }}
              >
                {formError}
              </Text>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                height: 56,
                backgroundColor: '#2F67F6',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 32,
                shadowColor: '#2F67F6',
                shadowOffset: {
                  width: 0,
                  height: 6,
                },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 32,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: '#E5E7EB',
                }}
              />

              <Text
                style={{
                  marginHorizontal: 16,
                  color: '#9CA3AF',
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                OR
              </Text>

              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: '#E5E7EB',
                }}
              />
            </View>

            {/* Biometrics */}
            <TouchableOpacity
              onPress={handleBiometricLogin}
              style={{
                height: 56,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                backgroundColor: '#FFFFFF',
              }}
            >
              <FingerPrintIcon size={20} color="#111827" />

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#111827',
                  marginLeft: 10,
                }}
              >
                Sign in with Biometrics
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 32,
              }}
            >
              <Text
                style={{
                  color: '#6B7280',
                  fontSize: 14,
                }}
              >
                Don't have an account?
              </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
              >
                <Text
                  style={{
                    color: '#2F67F6',
                    fontSize: 14,
                    fontWeight: '600',
                    marginLeft: 6,
                  }}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default LoginScreen;