import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarIcon, MapPinIcon, StarIcon, SparklesIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../config/api';

const HolidayScreen = ({ navigation }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get('/holidays', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHolidays(res.data.data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHolidays();
    }, [])
  );

  const getHolidayIcon = (type) => {
    switch(type) {
      case 'Company': return <StarIcon color="#2563eb" size={24} />;
      case 'Regional': return <MapPinIcon color="#10b981" size={24} />;
      case 'Festival': return <SparklesIcon color="#f59e0b" size={24} />;
      default: return <CalendarIcon color="#64748b" size={24} />;
    }
  };

  const getHolidayColor = (type) => {
    switch(type) {
      case 'Company': return '#eff6ff';
      case 'Regional': return '#ecfdf5';
      case 'Festival': return '#fffbeb';
      default: return '#f8fafc';
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />
      <LinearGradient
        colors={['#4f46e5', '#3b82f6', '#0ea5e9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Holiday Calendar</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : holidays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No upcoming holidays found.</Text>
            </View>
          ) : (
            holidays.map((holiday) => (
              <View key={holiday._id} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: getHolidayColor(holiday.type) }]}>
                  {getHolidayIcon(holiday.type)}
                </View>
                <View style={styles.holidayInfo}>
                  <Text style={styles.holidayName}>{holiday.name}</Text>
                  <Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{holiday.type} Holiday</Text>
                  </View>
                  {holiday.description && (
                    <Text style={styles.holidayDesc}>{holiday.description}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  holidayDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
  }
});

export default HolidayScreen;
