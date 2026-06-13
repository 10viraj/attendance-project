import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnvelopeIcon, ShieldCheckIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminProfileScreen = ({ navigation }) => {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        setAdmin(JSON.parse(userData));
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
    await AsyncStorage.removeItem('employeeInfo');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" translucent={false} />
      {/* Background colored header block */}
      <View style={styles.headerBackground} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header Profile Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <Text style={styles.userName}>Administrator</Text>
          <Text style={styles.userRole}>System Control</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <EnvelopeIcon color="#64748b" size={20} />
              </View>
              <View>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{admin?.email || 'admin@company.com'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <ShieldCheckIcon color="#64748b" size={20} />
              </View>
              <View>
                <Text style={styles.detailLabel}>Role</Text>
                <Text style={styles.detailValue}>{admin?.role || 'Admin'}</Text>
              </View>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: '#0f172a', // slate-900 (admin theme)
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#334155', // slate-700
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94a3b8', // slate-400
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b', // slate-800
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9', // slate-100
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8', // slate-400
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#334155', // slate-700
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fff1f2', // rose-50
    borderWidth: 1,
    borderColor: '#fecdd3', // rose-200
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#e11d48', // rose-600
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AdminProfileScreen;
