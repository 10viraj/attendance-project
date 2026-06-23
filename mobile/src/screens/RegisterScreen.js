import { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Modal, FlatList, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlusIcon, UserIcon, EnvelopeIcon, KeyIcon, EyeIcon, EyeSlashIcon, CheckIcon, BriefcaseIcon, ChevronDownIcon } from 'react-native-heroicons/outline';
import api from '../config/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

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
    if (!agreedToTerms) {
      errors.terms = 'You must agree to continue';
    }

    setFieldErrors(errors);
    return !errors.name && !errors.email && !errors.password && !errors.terms && !errors.department;
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
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            <View style={styles.headerContainer}>
              <View style={styles.logoBox}>
                <View style={styles.logoInner} />
              </View>
              <Text style={styles.headerTitle}>Create an account</Text>
              <Text style={styles.headerSubtitle}>Set up your enterprise profile to access the workspace.</Text>
            </View>

            <View style={styles.formContainer}>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full name</Text>
                <View style={[styles.inputWrapper, focused.name && styles.inputWrapperFocused, fieldErrors.name && styles.inputWrapperError]}>
                  <UserIcon color={focused.name ? '#2F67F6' : '#9CA3AF'} size={20} />
                  <TextInput
                    style={styles.input}
                    placeholder="Jordan Lee"
                    placeholderTextColor="#9CA3AF"
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

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Corporate email</Text>
                <View style={[styles.inputWrapper, focused.email && styles.inputWrapperFocused, fieldErrors.email && styles.inputWrapperError]}>
                  <EnvelopeIcon color={focused.email ? '#2F67F6' : '#9CA3AF'} size={20} />
                  <TextInput
                    ref={emailInputRef}
                    style={styles.input}
                    placeholder="name@company.com"
                    placeholderTextColor="#9CA3AF"
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
                  <BriefcaseIcon color={selectedDepartment ? '#2F67F6' : '#9CA3AF'} size={20} />
                  <Text style={[styles.dropdownText, !selectedDepartment && { color: '#9CA3AF' }]}>
                    {selectedDepartment
                      ? departments.find(d => d._id === selectedDepartment)?.name || 'Select Department'
                      : 'Select Department'}
                  </Text>
                  <ChevronDownIcon size={16} color="#9CA3AF" />
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
                              <CheckIcon size={16} color="#2F67F6" />
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
                  <KeyIcon color={focused.password ? '#2F67F6' : '#9CA3AF'} size={20} />
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    textContentType="password"
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
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {showPassword ? (
                      <EyeSlashIcon size={20} color="#9CA3AF" />
                    ) : (
                      <EyeIcon size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                </View>

                {fieldErrors.password ? (
                  <Text style={styles.errorText}>{fieldErrors.password}</Text>
                ) : password ? (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: i < strength.score ? strengthColors[strength.score] : '#f1f5f9' }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: strengthColors[strength.score] }]}>
                      {strength.label}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Terms */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    setAgreedToTerms((v) => !v);
                    if (fieldErrors.terms) setFieldErrors((p) => ({ ...p, terms: '' }));
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked, fieldErrors.terms && styles.checkboxError]}>
                    {agreedToTerms ? <CheckIcon size={12} color="#fff" /> : null}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the <Text style={styles.linkText}>terms of service</Text> and{' '}
                    <Text style={styles.linkText}>privacy policy</Text>
                  </Text>
                </TouchableOpacity>
                {fieldErrors.terms ? <Text style={styles.errorText}>{fieldErrors.terms}</Text> : null}
              </View>

              {formError ? <Text style={styles.errorTextCenter}>{formError}</Text> : null}

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.primaryButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Already have an account? </Text>
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
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 40,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoInner: {
    width: 20,
    height: 20,
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  dropdownText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
  },
  errorTextCenter: {
    color: '#ef4444',
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
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2F67F6',
    borderColor: '#2F67F6',
  },
  checkboxError: {
    borderColor: '#ef4444',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  linkText: {
    color: '#2F67F6',
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  footerLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  modalOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#2F67F6',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
  },
});

export default RegisterScreen;