import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Cog6ToothIcon,
  LockClosedIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  IdentificationIcon,
  ArrowRightOnRectangleIcon
} from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const ProfileScreen = ({ navigation }) => {
  const [employee, setEmployee] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const employeeData = await AsyncStorage.getItem('employeeInfo');
      const userData = await AsyncStorage.getItem('userInfo');

      if (employeeData) {
        setEmployee(JSON.parse(employeeData));
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
    await AsyncStorage.removeItem('employeeInfo');
    navigation.replace('Login');
  };

  const showComingSoon = () => {
    Alert.alert("Coming Soon", "This feature is not yet available.");
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#37474F" />
      </SafeAreaView>
    );
  }

  const getInitials = () => {
    return employee?.firstName?.[0]?.toUpperCase() || 'U';
  };

  const getFullName = () => {
    return employee ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'User Profile';
  };

  const getDepartment = () => {
    return employee?.department || 'Engineering';
  };

  const getEmployeeId = () => {
    return employee?.employeeId || 'EMP0000';
  };

  const getEmail = () => {
    return user?.email || 'user@corporate.com';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Page Title */}
          <Text style={styles.pageTitle}>Profile</Text>

          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>

            <Text style={styles.nameText}>{getFullName()}</Text>
            <View style={styles.badgePill}>
              <IdentificationIcon color="#37474F" size={16} style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>{getEmployeeId()}</Text>
            </View>

            <Text style={styles.emailText}>{getEmail()}</Text>
          </View>

          {/* Settings Menu List */}
          <View style={styles.menuCard}>

            {/* Item: Settings */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <Cog6ToothIcon color="#475569" size={24} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={styles.menuItemTitle}>Settings</Text>
                <Text style={styles.menuItemSub}>App preferences</Text>
              </View>
              <ChevronRightIcon color="#94A3B8" size={20} />
            </TouchableOpacity>
            <View style={styles.separator} />

            {/* Item: Security */}
            <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <LockClosedIcon color="#475569" size={24} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={styles.menuItemTitle}>Security</Text>
                <Text style={styles.menuItemSub}>Password & biometrics</Text>
              </View>
              <ChevronRightIcon color="#94A3B8" size={20} />
            </TouchableOpacity>
            <View style={styles.separator} />

            {/* Item: Notifications */}
            <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <BellIcon color="#475569" size={24} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={styles.menuItemTitle}>Notifications</Text>
                <Text style={styles.menuItemSub}>Push & email alerts</Text>
              </View>
              <ChevronRightIcon color="#94A3B8" size={20} />
            </TouchableOpacity>
            <View style={styles.separator} />

            {/* Item: Help & Support */}
            <TouchableOpacity style={styles.menuItem} onPress={showComingSoon} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <QuestionMarkCircleIcon color="#475569" size={24} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={styles.menuItemTitle}>Help & Support</Text>
                <Text style={styles.menuItemSub}>Contact HR</Text>
              </View>
              <ChevronRightIcon color="#94A3B8" size={20} />
            </TouchableOpacity>
            <View style={styles.separator} />

            {/* Item: About */}
            <TouchableOpacity style={[styles.menuItem, { paddingBottom: 0 }]} onPress={showComingSoon} activeOpacity={0.7}>
              <View style={styles.menuIconBox}>
                <InformationCircleIcon color="#475569" size={24} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={styles.menuItemTitle}>About</Text>
                <Text style={styles.menuItemSub}>Version 1.0.0</Text>
              </View>
              <ChevronRightIcon color="#94A3B8" size={20} />
            </TouchableOpacity>

          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <ArrowRightOnRectangleIcon color="#9F1239" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // light gray background
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    letterSpacing: -1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#37474F', // Dark slate background for S
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474F',
  },
  emailText: {
    fontSize: 15,
    color: '#64748B',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 64, // Align line with text, not icon
  },
  menuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  menuItemSub: {
    fontSize: 13,
    color: '#64748B',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 18,
    borderRadius: 16,
  },
  signOutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9F1239',
  },
});

export default ProfileScreen;
