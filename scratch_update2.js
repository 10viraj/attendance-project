const fs = require('fs');
const path = require('path');

const filePath = path.resolve('mobile/src/screens/admin/AdminEmployeesScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Modal and Icons to imports
content = content.replace(
  /ScrollView,\s*Alert,\s*} from 'react-native';/,
  `ScrollView,\n  Alert,\n  Modal,\n} from 'react-native';`
);
content = content.replace(
  /TrashIcon,\s*} from 'react-native-heroicons\/outline';/,
  `TrashIcon,\n  XMarkIcon,\n  PlusIcon,\n} from 'react-native-heroicons/outline';`
);

// 2. Add State Variables
content = content.replace(
  /const \[searchQuery, setSearchQuery\] = useState\(''\);/,
  `const [searchQuery, setSearchQuery] = useState('');

  // Add Employee Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);`
);

// 3. Add fetchDepartments in useEffect
content = content.replace(
  /useEffect\(\(\) => \{\s*fetchEmployees\(\);\s*const unsubscribe = navigation\.addListener\('focus', \(\) => \{\s*fetchEmployees\(\);\s*\}\);\s*return unsubscribe;\s*\}, \[navigation\]\);/,
  `useEffect(() => {
    fetchEmployees();
    const fetchDepartments = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const res = await api.get('/departments', { headers: { Authorization: \`Bearer \${token}\` } });
          if (res.data?.success) {
            setDepartments(res.data.data);
            if (res.data.data.length > 0) {
              setDepartment(res.data.data[0]._id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEmployees();
    });
    return unsubscribe;
  }, [navigation]);`
);

// 4. Add handlers and renderAddModal before WEB RENDER
const handlersAndModal = `
  const closeModal = () => {
    setModalVisible(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    if (departments.length > 0) {
      setDepartment(departments[0]._id);
    }
  };

  const handleAddEmployee = async () => {
    if (!firstName || !lastName || !email || !password) {
      if (Platform.OS === 'web') alert('Please fill in all required fields');
      else Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setAdding(true);
    try {
      const res = await api.post('/auth/register', {
        firstName, lastName, email, password, department, role: 'Employee'
      });
      if (res.data.success) {
        if (Platform.OS === 'web') alert('Employee created successfully');
        else Alert.alert('Success', 'Employee created successfully');
        closeModal();
        fetchEmployees();
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to create employee';
      if (Platform.OS === 'web') alert(errMsg);
      else Alert.alert('Error', errMsg);
    } finally {
      setAdding(false);
    }
  };

  const renderAddModal = () => (
    <Modal
      visible={modalVisible}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={closeModal}
    >
      <View style={Platform.OS === 'web' ? w.modalOverlay : styles.modalOverlay}>
        <View style={Platform.OS === 'web' ? w.modalContainer : styles.modalContainer}>
          <View style={Platform.OS === 'web' ? w.modalHeader : styles.modalHeader}>
            <Text style={Platform.OS === 'web' ? w.modalTitle : styles.modalTitle}>
              Add New Employee
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <XMarkIcon color={C.inkMuted} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={Platform.OS === 'web' ? w.formContainer : styles.formContainer}>
            <Text style={Platform.OS === 'web' ? w.label : styles.label}>First Name *</Text>
            <TextInput
              style={Platform.OS === 'web' ? w.input : styles.input}
              placeholder="John"
              placeholderTextColor={C.inkFaint}
              value={firstName}
              onChangeText={setFirstName}
            />
            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Last Name *</Text>
            <TextInput
              style={Platform.OS === 'web' ? w.input : styles.input}
              placeholder="Doe"
              placeholderTextColor={C.inkFaint}
              value={lastName}
              onChangeText={setLastName}
            />
            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Email *</Text>
            <TextInput
              style={Platform.OS === 'web' ? w.input : styles.input}
              placeholder="john.doe@example.com"
              placeholderTextColor={C.inkFaint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Password *</Text>
            <TextInput
              style={Platform.OS === 'web' ? w.input : styles.input}
              placeholder="******"
              placeholderTextColor={C.inkFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Department</Text>
            <View style={Platform.OS === 'web' ? w.typeSelector : styles.typeSelector}>
              {departments.map(dept => {
                const isActive = department === dept._id;
                return (
                  <TouchableOpacity
                    key={dept._id}
                    style={[
                      Platform.OS === 'web' ? w.typeOption : styles.typeOption,
                      isActive && (Platform.OS === 'web' ? w.typeOptionActive : styles.typeOptionActive)
                    ]}
                    onPress={() => setDepartment(dept._id)}
                  >
                    <Text style={[
                      Platform.OS === 'web' ? w.typeOptionText : styles.typeOptionText,
                      isActive && (Platform.OS === 'web' ? w.typeOptionTextActive : styles.typeOptionTextActive)
                    ]}>
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={Platform.OS === 'web' ? w.submitBtn : styles.submitButton}
              onPress={handleAddEmployee}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={Platform.OS === 'web' ? w.submitBtnText : styles.submitButtonText}>Create Employee</Text>
              )}
            </TouchableOpacity>
            <View style={{height: 40}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* ═══════════════════════════════════════════ */
`;
content = content.replace(/\/\* ═══════════════════════════════════════════ \*\/\n\s*\/\*  WEB RENDER\s*\*\//, handlersAndModal + '  /*  WEB RENDER                                 */');

// 5. Change navigation buttons to setModalVisible(true) and add {renderAddModal()} to renders
content = content.replace(/onPress=\{\(\) => navigation\.navigate\('AdminAddEmployee'\)\}/g, "onPress={() => setModalVisible(true)}");
content = content.replace(/<\/SafeAreaView>\n\s*\);\n\s*\}\n\n\s*\/\* ═══════════════════════════════════════════ \*\/\n\s*\/\*  MOBILE RENDER \(preserved\)\s*\*\//, "{renderAddModal()}\n      </SafeAreaView>\n    );\n  }\n\n  /* ═══════════════════════════════════════════ */\n  /*  MOBILE RENDER (preserved)                  */");
content = content.replace(/<\/SafeAreaView>\n\s*\);\n\};/, "{renderAddModal()}\n    </SafeAreaView>\n  );\n};");

// 6. Add modal styles to Mobile styles
const mobileStyles = `  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeOptionTextActive: {
    color: '#2563eb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  }
});`;
content = content.replace(/}\);\n\n\/\* ═══════════════════════════════════════════ \*\/\n\/\*  WEB STYLES\s*\*\//, mobileStyles + '\n\n/* ═══════════════════════════════════════════ */\n/*  WEB STYLES                                */');

// 7. Add modal styles to Web styles
const webStyles = `  // Web Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkSub,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: C.ink,
    outlineStyle: 'none',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMuted,
  },
  typeOptionTextActive: {
    color: C.accent,
  },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  }
});`;
content = content.replace(/}\);\n\nexport default AdminEmployeesScreen;/, webStyles + '\n\nexport default AdminEmployeesScreen;');

fs.writeFileSync(filePath, content);
console.log('Successfully updated AdminEmployeesScreen.js');
