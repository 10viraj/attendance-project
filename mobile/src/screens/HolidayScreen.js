import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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

  const parseDate = (dateString) => {
    const d = new Date(dateString);
    return {
      day: d.toLocaleDateString('en-US', { day: '2-digit' }),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  };

  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent={false} />
      
      {/* Dark Header Area */}
      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={{ flex: 0 }} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTopLabel}>{currentYear} Calendar</Text>
          <Text style={styles.headerMainTitle}>Holidays</Text>
          <Text style={styles.headerSubtitle}>
            {holidays.length} planned company & national holidays this year
          </Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 40 }} />
          ) : holidays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No upcoming holidays found.</Text>
            </View>
          ) : (
            holidays.map((holiday) => {
              const { day, month, weekday } = parseDate(holiday.date);
              
              // Formatting the subtitle: "Weekday • Description"
              let subText = weekday;
              if (holiday.description) {
                subText += ` • ${holiday.description}`;
              }

              return (
                <View key={holiday._id} style={styles.card}>
                  
                  {/* Left Date Block */}
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateMonth}>{month}</Text>
                  </View>
                  
                  {/* Middle Text Block */}
                  <View style={styles.textBlock}>
                    <Text style={styles.holidayTitle}>{holiday.name}</Text>
                    <Text style={styles.holidaySubtitle} numberOfLines={2}>
                      {subText}
                    </Text>
                  </View>

                  {/* Right Badge */}
                  <View style={styles.badgeContainer}>
                    <View style={styles.badgePill}>
                      <Text style={styles.badgeText}>{holiday.type || 'Company'}</Text>
                    </View>
                  </View>

                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBackground: {
    backgroundColor: '#0F172A',
    paddingBottom: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  headerTopLabel: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerMainTitle: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 12,
  },
  headerSubtitle: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Off-white background from image
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dateBlock: {
    width: 64,
    height: 72,
    backgroundColor: '#E2E8F0', // light gray square
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  holidayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  holidaySubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  badgeContainer: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  badgePill: {
    backgroundColor: '#FAE8E8', // Light peach/tan background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontStyle: 'italic',
  }
});

export default HolidayScreen;
