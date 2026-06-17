import { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlusIcon, UserIcon, EnvelopeIcon, KeyIcon, EyeIcon, EyeSlashIcon, CheckIcon } from 'react-native-heroicons/solid';
import { styled } from 'nativewind';
import api from '../config/api';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Splits a full name into first/last without assuming a hardcoded fallback.
// Handles single names, extra whitespace, and multi-word last names.
const splitName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
};

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '', terms: '' });
  const [formError, setFormError] = useState('');
  const [focused, setFocused] = useState({ name: false, email: false, password: false });

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = () => {
    const errors = { name: '', email: '', password: '', terms: '' };

    if (!name.trim()) {
      errors.name = 'Name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (!agreedToTerms) {
      errors.terms = 'You must agree to continue';
    }

    setFieldErrors(errors);
    return !errors.name && !errors.email && !errors.password && !errors.terms;
  };

  const handleRegister = async () => {
    setFormError('');
    if (!validate()) return;

    const { firstName, lastName } = splitName(name);

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        firstName,
        lastName,
        email: email.trim(),
        password,
        role: 'Employee',
      });

      if (response.data && response.data.token) {
        navigation.navigate('Login', { registeredEmail: email.trim() });
      }
    } catch (error) {
      console.error('Register Error:', error.response?.data || error.message);
      setFormError(
        error.response?.data?.message || 'Could not create account. Email may already be in use.'
      );
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = ['#64748b', '#E24B4A', '#EF9F27', '#378ADD', '#5DCAA5'];

  return (
    <StyledView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center px-6"
        >
          <StyledView className="items-center mb-8">
            <StyledView className="w-16 h-16 bg-blue-500/15 rounded-2xl items-center justify-center mb-5">
              <UserPlusIcon size={30} color="#85B7EB" />
            </StyledView>
            <StyledText className="text-white font-medium text-2xl text-center">Create account</StyledText>
            <StyledText className="text-slate-400 mt-2 text-sm text-center px-4">
              Join the team and manage attendance smartly
            </StyledText>
          </StyledView>

          <StyledView className="w-full max-w-sm mx-auto">
            {/* Name */}
            <StyledView className="mb-1">
              <StyledText className="text-slate-400 text-xs mb-1.5 ml-1">Full name</StyledText>
              <StyledView
                className={`flex-row items-center bg-white/5 px-4 py-3 rounded-xl border ${fieldErrors.name ? 'border-red-500/60' : focused.name ? 'border-blue-400/60' : 'border-white/10'
                  }`}
              >
                <UserIcon size={18} color="#64748b" />
                <StyledTextInput
                  className="flex-1 ml-3 text-white text-sm"
                  placeholder="Jordan Lee"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                  }}
                  onFocus={() => setFocused((p) => ({ ...p, name: true }))}
                  onBlur={() => setFocused((p) => ({ ...p, name: false }))}
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
              </StyledView>
              {fieldErrors.name ? (
                <StyledText className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.name}</StyledText>
              ) : null}
            </StyledView>

            {/* Email */}
            <StyledView className="mt-3 mb-1">
              <StyledText className="text-slate-400 text-xs mb-1.5 ml-1">Email address</StyledText>
              <StyledView
                className={`flex-row items-center bg-white/5 px-4 py-3 rounded-xl border ${fieldErrors.email ? 'border-red-500/60' : focused.email ? 'border-blue-400/60' : 'border-white/10'
                  }`}
              >
                <EnvelopeIcon size={18} color="#64748b" />
                <StyledTextInput
                  ref={emailInputRef}
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
                  onFocus={() => setFocused((p) => ({ ...p, email: true }))}
                  onBlur={() => setFocused((p) => ({ ...p, email: false }))}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </StyledView>
              {fieldErrors.email ? (
                <StyledText className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.email}</StyledText>
              ) : null}
            </StyledView>

            {/* Password */}
            <StyledView className="mt-3 mb-1">
              <StyledText className="text-slate-400 text-xs mb-1.5 ml-1">Password</StyledText>
              <StyledView
                className={`flex-row items-center bg-white/5 px-4 py-3 rounded-xl border ${fieldErrors.password ? 'border-red-500/60' : focused.password ? 'border-blue-400/60' : 'border-white/10'
                  }`}
              >
                <KeyIcon size={18} color="#64748b" />
                <StyledTextInput
                  ref={passwordInputRef}
                  className="flex-1 ml-3 text-white text-sm"
                  placeholder="At least 8 characters"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoComplete="password-new"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  onFocus={() => setFocused((p) => ({ ...p, password: true }))}
                  onBlur={() => setFocused((p) => ({ ...p, password: false }))}
                  onSubmitEditing={handleRegister}
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
              ) : password ? (
                <>
                  <StyledView className="flex-row mt-2" style={{ gap: 4 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <StyledView
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          backgroundColor: i < strength.score ? strengthColors[strength.score] : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                  </StyledView>
                  <StyledText className="text-xs mt-1 ml-1" style={{ color: strengthColors[strength.score] }}>
                    {strength.label}
                  </StyledText>
                </>
              ) : null}
            </StyledView>

            {/* Terms */}
            <StyledView className="mt-4 mb-1">
              <StyledTouchableOpacity
                className="flex-row items-start"
                onPress={() => {
                  setAgreedToTerms((v) => !v);
                  if (fieldErrors.terms) setFieldErrors((p) => ({ ...p, terms: '' }));
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedToTerms }}
                style={{ gap: 8 }}
              >
                <StyledView
                  className={`w-4 h-4 rounded items-center justify-center mt-0.5 ${agreedToTerms ? 'bg-blue-500' : 'border border-white/30'
                    }`}
                >
                  {agreedToTerms ? <CheckIcon size={11} color="#fff" /> : null}
                </StyledView>
                <StyledText className="text-slate-400 text-xs flex-1" style={{ lineHeight: 18 }}>
                  I agree to the <StyledText className="text-blue-400">terms of service</StyledText> and{' '}
                  <StyledText className="text-blue-400">privacy policy</StyledText>
                </StyledText>
              </StyledTouchableOpacity>
              {fieldErrors.terms ? (
                <StyledText className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.terms}</StyledText>
              ) : null}
            </StyledView>

            {formError ? (
              <StyledText className="text-red-400 text-sm text-center mt-3">{formError}</StyledText>
            ) : null}

            <StyledView className="mt-5">
              <StyledTouchableOpacity
                className="w-full bg-blue-500 py-3.5 rounded-xl flex-row justify-center items-center active:bg-blue-600"
                onPress={handleRegister}
                disabled={loading}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <StyledText className="text-white font-medium text-base">Sign up</StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>

            <StyledView className="flex-row justify-center items-center mt-7">
              <StyledText className="text-slate-400 text-sm">Already have an account? </StyledText>
              <StyledTouchableOpacity onPress={() => navigation.navigate('Login')}>
                <StyledText className="text-blue-400 font-medium text-sm">Log in</StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </StyledView>
  );
};

export default RegisterScreen;