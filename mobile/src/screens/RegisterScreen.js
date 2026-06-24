import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Modal, FlatList, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import api from '../config/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6; // Mockup says "At least 6 characters"

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

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '', terms: '', department: '' });
  const [formError, setFormError] = useState('');

  const [focused, setFocused] = useState({ name: false, email: false, password: false, department: false });
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showDeptModal, setShowDeptModal] = useState(false);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthColors = ['#cbd5e1', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments');
        if (response.data && response.data.success) {
          setDepartments(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error.response?.data || error.message);
      }
    };
    fetchDepartments();
  }, []);

  const validate = () => {
    const errors = { name: '', email: '', password: '', terms: '', department: '' };

    if (!name.trim()) {
      errors.name = 'Name is required';
    } else {
      const { lastName } = splitName(name);
      if (!lastName) {
        errors.name = 'Please enter your full name (first and last name)';
      }
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!selectedDepartment) {
      errors.department = 'Department is required';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    setFieldErrors(errors);
    return !errors.name && !errors.email && !errors.password && !errors.department;
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
        department: selectedDepartment,
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >

            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ChevronLeftIcon color="#0F172A" size={24} />
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Create account</Text>
              <Text style={styles.headerSubtitle}>Join your company's attendance system</Text>
            </View>

            <View style={styles.formContainer}>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrapper, focused.name && styles.inputWrapperFocused, fieldErrors.name && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor="#94A3B8"
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
                </View>
                {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}
              </View>

              {/* Work Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Work Email</Text>
                <View style={[styles.inputWrapper, focused.email && styles.inputWrapperFocused, fieldErrors.email && styles.inputWrapperError]}>
                  <TextInput
                    ref={emailInputRef}
                    style={styles.input}
                    placeholder="you@corporate.com"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    returnKeyType="next"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                    }}
                    onFocus={() => setFocused((p) => ({ ...p, email: true }))}
                    onBlur={() => setFocused((p) => ({ ...p, email: false }))}
                  />
                </View>
                {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
              </View>

              {/* Department Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <TouchableOpacity
                  onPress={() => setShowDeptModal(true)}
                  style={[
                    styles.inputWrapper,
                    showDeptModal && styles.inputWrapperFocused,
                    fieldErrors.department && styles.inputWrapperError
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownText, !selectedDepartment && { color: '#94A3B8' }]}>
                    {selectedDepartment
                      ? departments.find(d => d._id === selectedDepartment)?.name || 'Engineering'
                      : 'Engineering'}
                  </Text>
                </TouchableOpacity>
                {fieldErrors.department ? <Text style={styles.errorText}>{fieldErrors.department}</Text> : null}

                <Modal
                  visible={showDeptModal}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowDeptModal(false)}
                >
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDeptModal(false)}
                  >
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Department</Text>
                      </View>
                      <FlatList
                        data={departments}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedDepartment(item._id);
                              setShowDeptModal(false);
                              if (fieldErrors.department) setFieldErrors(p => ({ ...p, department: '' }));
                            }}
                            style={[
                              styles.modalOption,
                              selectedDepartment === item._id && styles.modalOptionSelected
                            ]}
                          >
                            <Text style={[
                              styles.modalOptionText,
                              selectedDepartment === item._id && styles.modalOptionTextSelected
                            ]}>
                              {item.name}
                            </Text>
                            {selectedDepartment === item._id && (
                              <CheckIcon size={16} color="#37474F" />
                            )}
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No departments available</Text>
                          </View>
                        }
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrapper, focused.password && styles.inputWrapperFocused, fieldErrors.password && styles.inputWrapperError]}>
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.input}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    textContentType="password"
                    secureTextEntry={true}
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
                </View>

                {fieldErrors.password ? (
                  <Text style={styles.errorText}>{fieldErrors.password}</Text>
                ) : null}
              </View>

              {formError ? <Text style={styles.errorTextCenter}>{formError}</Text> : null}

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.primaryButton}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Already registered? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
              </View>

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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
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
  headerContainer: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  formContainer: {
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#37474F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  dropdownText: {
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
  errorTextCenter: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  footerLink: {
    color: '#37474F',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalOptionSelected: {
    backgroundColor: '#F8FAFC',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
  },
});

export default RegisterScreen;