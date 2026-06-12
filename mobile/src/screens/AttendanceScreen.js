import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { CameraIcon, ArrowRightOnRectangleIcon, ClockIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../config/api';

const AttendanceScreen = () => {
  const [status, setStatus] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get('/attendance/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data.status || 'Not Checked In');
    } catch (error) {
      console.error('Error loading attendance status:', error);
      setStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const startCamera = async (action) => {
    // Open simulated camera feed
    setCameraActive(true);
    
    // Scan for 3 seconds then process
    setTimeout(() => {
      setCameraActive(false);
      handleAction(action);
    }, 3000);
  };

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = action === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';
      
      const res = await api.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Alert.alert(
          'Face Verified', 
          `Successfully ${action === 'check-in' ? 'Checked In' : 'Checked Out'}! Today's attendance has been calculated and updated.`
        );
        loadStatus();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || `Failed to ${action}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2563eb" barStyle="light-content" translucent={false} />
      
      <View style={styles.headerBackground} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.greetingSub}>Verify Identity</Text>
          <Text style={styles.greetingMain}>Face Scan Attendance</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            {cameraActive ? (
              <View style={styles.cameraWrapper}>
                <View style={styles.fakeCameraFeed}>
                  <CameraIcon color="#94a3b8" size={60} />
                </View>
                <View style={styles.cameraOverlay}>
                  <View style={styles.scanBox} />
                  <ActivityIndicator size="large" color="#10b981" style={{ position: 'absolute', zIndex: 10 }} />
                  <Text style={styles.cameraText}>Analyzing Face...</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <ClockIcon color="#2563eb" size={40} />
                </View>
                <Text style={styles.statusLabel}>Current Status</Text>
                <Text style={styles.statusValue}>
                  {loading ? <ActivityIndicator color="#1e293b" /> : status}
                </Text>

                <View style={styles.actionContainer}>
                  {status === 'Not Checked In' && (
                    <TouchableOpacity 
                      style={styles.checkInButton}
                      onPress={() => startCamera('check-in')}
                      disabled={processing}
                      activeOpacity={0.8}
                    >
                      {processing ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <CameraIcon color="#fff" size={24} />
                          <Text style={styles.buttonText}>Face Scan & Check In</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {status === 'Checked In' && (
                    <TouchableOpacity 
                      style={styles.checkOutButton}
                      onPress={() => startCamera('check-out')}
                      disabled={processing}
                      activeOpacity={0.8}
                    >
                      {processing ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <ArrowRightOnRectangleIcon color="#fff" size={24} />
                          <Text style={styles.buttonText}>Face Scan & Check Out</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {status === 'Checked Out' && (
                    <View style={styles.doneContainer}>
                      <Text style={styles.doneText}>You have completed your shift for today!</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
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
    height: 180,
    backgroundColor: '#2563eb', // primary-600
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
    color: '#bfdbfe', // primary-200
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greetingMain: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 40,
  },
  actionContainer: {
    width: '100%',
  },
  checkInButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  checkOutButton: {
    backgroundColor: '#e11d48', // rose-600
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  doneContainer: {
    backgroundColor: '#f1f5f9',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraWrapper: {
    width: '100%',
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  fakeCameraFeed: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBox: {
    width: 200,
    height: 200,
    borderWidth: 3,
    borderColor: '#10b981',
    borderRadius: 24,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  cameraText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default AttendanceScreen;
