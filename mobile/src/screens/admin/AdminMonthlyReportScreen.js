import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api from '../../config/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ───────────────────────────────────────── */
/*  Design tokens                            */
/* ───────────────────────────────────────── */
const COLORS = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E5E5',
  borderSoft: '#EFEFEF',
  ink: '#18181B',
  inkMuted: '#71717A',
  inkFaint: '#A1A1AA',
  accent: '#2563EB',
  accentSoft: '#EFF4FF',
};

/* Web-specific palette */
const W = {
  bg:          '#F7F8FA',
  surface:     '#FFFFFF',
  surfaceAlt:  '#FAFBFC',
  border:      '#EAEDF2',
  borderSoft:  '#F1F3F6',
  ink:         '#111827',
  inkSub:      '#374151',
  inkMuted:    '#6B7280',
  inkFaint:    '#9CA3AF',
  accent:      '#4F46E5',
  accentSoft:  '#EEF2FF',
  accentText:  '#3730A3',
  green:       '#059669',
  greenSoft:   '#ECFDF5',
  greenText:   '#065F46',
  amber:       '#D97706',
  amberSoft:   '#FFFBEB',
  amberText:   '#92400E',
  red:         '#DC2626',
  redSoft:     '#FEF2F2',
  redText:     '#991B1B',
  violet:      '#7C3AED',
  violetSoft:  '#F5F3FF',
  violetText:  '#5B21B6',
};

const STATUS_LABEL = {
  Present: { color: COLORS.ink, dot: COLORS.ink },
  Late: { color: COLORS.inkMuted, dot: COLORS.inkFaint },
  'Half-Day': { color: COLORS.inkMuted, dot: COLORS.inkFaint },
  'On Leave': { color: COLORS.inkFaint, dot: COLORS.borderSoft },
  Absent: { color: COLORS.inkFaint, dot: COLORS.borderSoft },
  default: { color: COLORS.inkFaint, dot: COLORS.borderSoft },
};

const getStatusStyle = (status) => STATUS_LABEL[status] || STATUS_LABEL.default;

/* Web status colors for day cells */
const WEB_STATUS = {
  Present:    { bg: W.greenSoft,  text: W.greenText,  dot: W.green },
  Late:       { bg: W.amberSoft,  text: W.amberText,  dot: W.amber },
  'Half-Day': { bg: W.amberSoft,  text: W.amberText,  dot: W.amber },
  'On Leave': { bg: W.redSoft,    text: W.redText,    dot: W.red },
  Absent:     { bg: W.redSoft,    text: W.redText,    dot: W.red },
  Weekend:    { bg: W.surfaceAlt, text: W.inkFaint,   dot: '#D1D5DB' },
  default:    { bg: W.surfaceAlt, text: W.inkFaint,   dot: '#E5E7EB' },
};

const getWebStatus = (s) => WEB_STATUS[s] || WEB_STATUS.default;

/* ───────────────────────────────────────── */
/*  MOBILE: Employee card component          */
/* ───────────────────────────────────────── */
const EmployeeCard = ({ item, index, isExpanded, onToggle }) => {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index * 40, 280),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const translateY = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const rotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const absentVal = item.absentDays !== undefined ? item.absentDays : item.leaveDays;

  return (
    <Animated.View style={{ opacity: enterAnim, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.7} onPress={onToggle} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.firstName?.[0]?.toUpperCase() || 'E'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName} numberOfLines={1}>
              {item.firstName} {item.lastName || ''}
            </Text>
            <Text style={styles.employeeRole} numberOfLines={1}>
              {item.employeeId} · {item.designation || 'Employee'}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <ChevronDownIcon color={COLORS.inkFaint} size={18} />
          </Animated.View>
        </View>

        <View style={styles.statsRow}>
          <StatItem value={item.presentDays} label="Present" />
          <StatItem value={item.lateDays} label="Late" />
          <StatItem value={absentVal} label="Absent" />
          <StatItem value={`${item.totalWorkingHours}h`} label="Hours" last />
        </View>

        {isExpanded && item.dailyBreakdown && (
          <View style={styles.expandedSection}>
            <Text style={styles.expandedTitle}>Daily breakdown</Text>
            <View style={styles.daysGrid}>
              {item.dailyBreakdown.map((day, idx) => {
                const s = day.status === '-' ? STATUS_LABEL.default : getStatusStyle(day.status);
                return (
                  <View key={idx} style={styles.dayItem}>
                    <Text style={styles.dayNumber}>{day.day}</Text>
                    <View style={[styles.dayDot, { backgroundColor: s.dot }]} />
                  </View>
                );
              })}
            </View>
            <View style={styles.legendRow}>
              <LegendItem label="Present" dot={COLORS.ink} />
              <LegendItem label="Late / Half-day" dot={COLORS.inkFaint} />
              <LegendItem label="Absent / Leave" dot={COLORS.borderSoft} bordered />
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const StatItem = ({ value, label, last }) => (
  <View style={[styles.statItem, !last && styles.statItemDivider]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const LegendItem = ({ label, dot, bordered }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: dot }, bordered && styles.legendDotBordered]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

/* ───────────────────────────────────────── */
/*  MOBILE: Summary header                   */
/* ───────────────────────────────────────── */
const SummaryBar = ({ reportData }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [reportData]);

  if (!reportData.length) return null;

  const totalPresent = reportData.reduce((sum, e) => sum + (e.presentDays || 0), 0);
  const totalLate = reportData.reduce((sum, e) => sum + (e.lateDays || 0), 0);
  const totalAbsent = reportData.reduce(
    (sum, e) => sum + (e.absentDays !== undefined ? e.absentDays : e.leaveDays || 0),
    0
  );

  return (
    <Animated.View style={[styles.summaryBar, { opacity: fadeAnim }]}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{reportData.length}</Text>
        <Text style={styles.summaryLabel}>Employees</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalPresent}</Text>
        <Text style={styles.summaryLabel}>Present</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalLate}</Text>
        <Text style={styles.summaryLabel}>Late</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalAbsent}</Text>
        <Text style={styles.summaryLabel}>Absent</Text>
      </View>
    </Animated.View>
  );
};

/* ═══════════════════════════════════════════ */
/*  MAIN SCREEN                               */
/* ═══════════════════════════════════════════ */
const AdminMonthlyReportScreen = ({ navigation }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEmpId, setExpandedEmpId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Web-only state
  const [searchQuery, setSearchQuery] = useState('');

  const loadMonthlyReport = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await api.get(`/analytics/monthly-report?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (error) {
      console.error('Error loading monthly report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMonthlyReport();
    }, [selectedMonth, selectedYear])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMonthlyReport();
  };

  const handlePrevMonth = () => {
    setLoading(true);
    setExpandedEmpId(null);
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setLoading(true);
    setExpandedEmpId(null);
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const isCurrentMonth =
    selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear();

  const toggleExpand = (empId) => {
    if (Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedEmpId((prev) => (prev === empId ? null : empId));
  };

  /* ── CSV Export ── */
  const handleExportCSV = async () => {
    if (reportData.length === 0) {
      if (Platform.OS === 'web') {
        alert('No data to export!');
      } else {
        alert('No data to export!');
      }
      return;
    }

    const headers = ['Employee Name', 'Employee ID', 'Designation', 'Present Days', 'Late Days', 'Absent Days', 'Total Hours'];
    const csvRows = [headers.join(',')];

    reportData.forEach((emp) => {
      const row = [
        `"${emp.firstName} ${emp.lastName || ''}"`,
        `"${emp.employeeId}"`,
        `"${emp.designation || ''}"`,
        emp.presentDays,
        emp.lateDays,
        emp.absentDays !== undefined ? emp.absentDays : emp.leaveDays,
        emp.totalWorkingHours,
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const filename = `Monthly_Report_${MONTHS[selectedMonth - 1]}_${selectedYear}.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    try {
      setExporting(true);
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        alert('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  /* ── Computed ── */
  const summary = useMemo(() => {
    if (!reportData.length) return { employees: 0, present: 0, late: 0, absent: 0, hours: 0 };
    return {
      employees: reportData.length,
      present: reportData.reduce((s, e) => s + (e.presentDays || 0), 0),
      late: reportData.reduce((s, e) => s + (e.lateDays || 0), 0),
      absent: reportData.reduce((s, e) => s + (e.absentDays !== undefined ? e.absentDays : e.leaveDays || 0), 0),
      hours: reportData.reduce((s, e) => s + (parseFloat(e.totalWorkingHours) || 0), 0).toFixed(1),
    };
  }, [reportData]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const q = searchQuery.toLowerCase();
    return reportData.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.employeeId?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  /* ═══════════════════════════════════════ */
  /*  WEB RENDER                             */
  /* ═══════════════════════════════════════ */
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={webStyles.container}>
        <ScrollView contentContainerStyle={webStyles.scrollContent}>
          {/* ── Page Header ── */}
          <View style={webStyles.pageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={webStyles.pageTitle}>Monthly Report</Text>
              <Text style={webStyles.pageSubtitle}>
                Detailed attendance breakdown for {MONTHS[selectedMonth - 1]} {selectedYear}
              </Text>
            </View>
            <View style={webStyles.headerControls}>
              {/* Month Picker */}
              <View style={webStyles.monthPicker}>
                <TouchableOpacity onPress={handlePrevMonth} style={webStyles.monthNavBtn} activeOpacity={0.7}>
                  <ChevronLeftIcon color={W.inkMuted} size={16} />
                </TouchableOpacity>
                <Text style={webStyles.monthLabel}>{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
                <TouchableOpacity
                  onPress={handleNextMonth}
                  style={webStyles.monthNavBtn}
                  disabled={isCurrentMonth}
                  activeOpacity={0.7}
                >
                  <ChevronRightIcon color={isCurrentMonth ? W.border : W.inkMuted} size={16} />
                </TouchableOpacity>
              </View>
              {/* Export */}
              <TouchableOpacity style={webStyles.exportBtn} onPress={handleExportCSV} activeOpacity={0.7}>
                <ArrowDownTrayIcon color="#fff" size={15} />
                <Text style={webStyles.exportBtnText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Summary Cards ── */}
          {!loading && (
            <View style={webStyles.summaryRow}>
              {[
                { label: 'Employees',   value: summary.employees, color: W.accent,  bg: W.accentSoft },
                { label: 'Present Days', value: summary.present,  color: W.green,   bg: W.greenSoft },
                { label: 'Late Days',    value: summary.late,     color: W.amber,   bg: W.amberSoft },
                { label: 'Absent Days',  value: summary.absent,   color: W.red,     bg: W.redSoft },
                { label: 'Total Hours',  value: `${summary.hours}h`, color: W.violet, bg: W.violetSoft },
              ].map((c, i) => (
                <View key={i} style={webStyles.summaryCard}>
                  <View style={[webStyles.summaryAccent, { backgroundColor: c.color }]} />
                  <View style={webStyles.summaryCardInner}>
                    <Text style={webStyles.summaryLabel}>{c.label}</Text>
                    <Text style={[webStyles.summaryValue, { color: c.color }]}>{c.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Search Bar ── */}
          <View style={webStyles.searchRow}>
            <View style={webStyles.searchBox}>
              <MagnifyingGlassIcon color={W.inkFaint} size={16} />
              <TextInput
                style={webStyles.searchInput}
                placeholder="Search by name, ID, or designation…"
                placeholderTextColor={W.inkFaint}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Text style={webStyles.recordCount}>
              {filteredData.length} of {reportData.length} employees
            </Text>
          </View>

          {/* ── Table ── */}
          {loading ? (
            <View style={webStyles.centered}>
              <ActivityIndicator size="large" color={W.accent} />
              <Text style={webStyles.loadingText}>Loading report…</Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={webStyles.emptyBox}>
              <View style={webStyles.emptyIconCircle}>
                <ArrowDownTrayIcon color={W.inkFaint} size={32} />
              </View>
              <Text style={webStyles.emptyTitle}>
                {searchQuery ? `No results for "${searchQuery}"` : 'No records found'}
              </Text>
              <Text style={webStyles.emptySubtitle}>
                {searchQuery ? 'Try a different search term.' : `No attendance data for ${MONTHS[selectedMonth - 1]} ${selectedYear}.`}
              </Text>
            </View>
          ) : (
            <View style={webStyles.tableCard}>
              {/* Table Header */}
              <View style={webStyles.tableHeaderRow}>
                <Text style={[webStyles.tableHeaderCell, { flex: 2 }]}>Employee</Text>
                <Text style={[webStyles.tableHeaderCell, { flex: 1.2 }]}>Designation</Text>
                <Text style={[webStyles.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Present</Text>
                <Text style={[webStyles.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Late</Text>
                <Text style={[webStyles.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Absent</Text>
                <Text style={[webStyles.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Hours</Text>
                <Text style={[webStyles.tableHeaderCell, { flex: 0.5, textAlign: 'center' }]} />
              </View>

              {/* Table Rows */}
              {filteredData.map((emp, idx) => {
                const isExpanded = expandedEmpId === emp._id;
                const absentVal = emp.absentDays !== undefined ? emp.absentDays : emp.leaveDays;
                const isAlt = idx % 2 === 1;

                return (
                  <View key={emp._id}>
                    {/* Main Row */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setExpandedEmpId(isExpanded ? null : emp._id)}
                      style={[
                        webStyles.tableRow,
                        isAlt && webStyles.tableRowAlt,
                        isExpanded && webStyles.tableRowExpanded,
                      ]}
                    >
                      {/* Employee */}
                      <View style={[webStyles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={webStyles.tableAvatar}>
                          <Text style={webStyles.tableAvatarText}>
                            {emp.firstName?.[0]?.toUpperCase() || 'E'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={webStyles.tableEmpName} numberOfLines={1}>
                            {emp.firstName} {emp.lastName || ''}
                          </Text>
                          <Text style={webStyles.tableEmpId} numberOfLines={1}>{emp.employeeId}</Text>
                        </View>
                      </View>

                      {/* Designation */}
                      <Text style={[webStyles.tableCell, webStyles.tableCellText, { flex: 1.2 }]}>
                        {emp.designation || '—'}
                      </Text>

                      {/* Present */}
                      <View style={[webStyles.tableCell, { flex: 0.8, alignItems: 'center' }]}>
                        <View style={[webStyles.statBadge, { backgroundColor: W.greenSoft }]}>
                          <Text style={[webStyles.statBadgeText, { color: W.greenText }]}>{emp.presentDays}</Text>
                        </View>
                      </View>

                      {/* Late */}
                      <View style={[webStyles.tableCell, { flex: 0.8, alignItems: 'center' }]}>
                        <View style={[webStyles.statBadge, { backgroundColor: W.amberSoft }]}>
                          <Text style={[webStyles.statBadgeText, { color: W.amberText }]}>{emp.lateDays}</Text>
                        </View>
                      </View>

                      {/* Absent */}
                      <View style={[webStyles.tableCell, { flex: 0.8, alignItems: 'center' }]}>
                        <View style={[webStyles.statBadge, { backgroundColor: W.redSoft }]}>
                          <Text style={[webStyles.statBadgeText, { color: W.redText }]}>{absentVal}</Text>
                        </View>
                      </View>

                      {/* Hours */}
                      <View style={[webStyles.tableCell, { flex: 0.8, alignItems: 'center' }]}>
                        <Text style={webStyles.hoursText}>
                          {emp.totalWorkingHours}<Text style={webStyles.hoursUnit}>h</Text>
                        </Text>
                      </View>

                      {/* Expand Arrow */}
                      <View style={[webStyles.tableCell, { flex: 0.5, alignItems: 'center' }]}>
                        <View style={[webStyles.expandArrow, isExpanded && webStyles.expandArrowRotated]}>
                          <ChevronDownIcon color={W.inkFaint} size={14} />
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* ── Expanded Daily Breakdown ── */}
                    {isExpanded && emp.dailyBreakdown && (
                      <View style={webStyles.expandedArea}>
                        <View style={webStyles.expandedHeader}>
                          <Text style={webStyles.expandedTitle}>
                            Daily Breakdown — {emp.firstName} {emp.lastName || ''} — {MONTHS[selectedMonth - 1]} {selectedYear}
                          </Text>
                          <View style={webStyles.legendRow}>
                            {[
                              { label: 'Present',       color: W.green },
                              { label: 'Late / Half-Day', color: W.amber },
                              { label: 'Absent / Leave', color: W.red },
                              { label: 'Weekend',        color: '#D1D5DB' },
                            ].map((l, i) => (
                              <View key={i} style={webStyles.legendItem}>
                                <View style={[webStyles.legendDot, { backgroundColor: l.color }]} />
                                <Text style={webStyles.legendText}>{l.label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* Weekday Headers */}
                        <View style={webStyles.calendarGrid}>
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <View key={d} style={webStyles.calendarHeaderCell}>
                              <Text style={webStyles.calendarHeaderText}>{d}</Text>
                            </View>
                          ))}
                        </View>

                        {/* Day Cells */}
                        <View style={webStyles.calendarGrid}>
                          {emp.dailyBreakdown.map((day, i) => {
                            const ws = day.status === '-' || !day.status ? getWebStatus('default') : getWebStatus(day.status);
                            const isEmpty = day.status === '-' || !day.status;
                            return (
                              <View
                                key={i}
                                style={[webStyles.calendarCell, { backgroundColor: isEmpty ? W.surfaceAlt : ws.bg }]}
                              >
                                <Text style={webStyles.calendarDay}>{day.day}</Text>
                                <View style={[webStyles.calendarDot, { backgroundColor: ws.dot }]} />
                                {!isEmpty && (
                                  <Text style={[webStyles.calendarStatus, { color: ws.text }]} numberOfLines={1}>
                                    {day.status}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Table Footer */}
              <View style={webStyles.tableFooter}>
                <Text style={webStyles.tableFooterText}>
                  Showing {filteredData.length} of {reportData.length} employees
                </Text>
                <Text style={webStyles.tableFooterText}>
                  {MONTHS[selectedMonth - 1]} {selectedYear}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ═══════════════════════════════════════ */
  /*  MOBILE RENDER (unchanged)              */
  /* ═══════════════════════════════════════ */
  const renderEmployeeCard = ({ item, index }) => (
    <EmployeeCard
      item={item}
      index={index}
      isExpanded={expandedEmpId === item._id}
      onToggle={() => toggleExpand(item._id)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Report</Text>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExportCSV}
          disabled={exporting}
          activeOpacity={0.7}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={COLORS.ink} />
          ) : (
            <>
              <ArrowDownTrayIcon color={COLORS.ink} size={15} />
              <Text style={styles.exportBtnText}>Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} activeOpacity={0.6}>
          <ChevronLeftIcon color={COLORS.inkMuted} size={20} />
        </TouchableOpacity>

        <Text style={styles.monthLabelText}>
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.monthNavBtn}
          disabled={isCurrentMonth}
          activeOpacity={0.6}
        >
          <ChevronRightIcon color={isCurrentMonth ? COLORS.border : COLORS.inkMuted} size={20} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.ink} />
        </View>
      ) : (
        <FlatList
          data={reportData}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderEmployeeCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<SummaryBar reportData={reportData} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.ink]} tintColor={COLORS.ink} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records found for this month.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

/* ═══════════════════════════════════════════ */
/*  MOBILE STYLES (preserved)                 */
/* ═══════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 84,
    justifyContent: 'center',
  },
  exportBtnText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    marginHorizontal: 20,
    minWidth: 130,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Summary bar */
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: COLORS.inkFaint,
    marginTop: 3,
  },

  /* Card */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.inkMuted,
  },
  cardInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 1,
  },
  employeeRole: {
    fontSize: 12,
    color: COLORS.inkFaint,
    fontWeight: '400',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemDivider: {
    borderRightWidth: 1,
    borderRightColor: COLORS.borderSoft,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: COLORS.inkFaint,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  /* Expanded breakdown */
  expandedSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    paddingTop: 14,
  },
  expandedTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.inkFaint,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  dayItem: {
    width: '14.28%',
    paddingHorizontal: 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.inkMuted,
    marginBottom: 5,
  },
  dayDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  legendDotBordered: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: COLORS.inkFaint,
  },
});

/* ═══════════════════════════════════════════ */
/*  WEB STYLES – Premium redesign             */
/* ═══════════════════════════════════════════ */
const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: W.bg,
  },
  scrollContent: {
    padding: 36,
    paddingBottom: 60,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
  },

  /* ── Page Header ── */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: W.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: W.inkMuted,
    lineHeight: 20,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },

  /* ── Month Picker ── */
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: W.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: W.border,
    overflow: 'hidden',
  },
  monthNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: W.ink,
    minWidth: 140,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: W.border,
    borderRightColor: W.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  /* ── Export ── */
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: W.accent,
  },
  exportBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  /* ── Summary Cards ── */
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: W.surface,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: W.borderSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryAccent: {
    width: 4,
  },
  summaryCardInner: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: W.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  /* ── Search ── */
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
    flexWrap: 'wrap',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: W.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: W.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
    flex: 1,
    maxWidth: 360,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: W.ink,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  recordCount: {
    fontSize: 13,
    color: W.inkMuted,
    fontWeight: '500',
  },

  /* ── Loading & Empty ── */
  centered: {
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: W.inkMuted,
  },
  emptyBox: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: W.borderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: W.inkSub,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: W.inkMuted,
    textAlign: 'center',
    maxWidth: 340,
  },

  /* ═══ TABLE ═══ */
  tableCard: {
    backgroundColor: W.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: W.borderSoft,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: W.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: W.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: W.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: W.borderSoft,
  },
  tableRowAlt: {
    backgroundColor: W.surfaceAlt,
  },
  tableRowExpanded: {
    backgroundColor: W.accentSoft,
    borderBottomColor: W.border,
  },
  tableCell: {
    justifyContent: 'center',
    paddingRight: 12,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: W.inkSub,
  },
  tableAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: W.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tableAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: W.accent,
  },
  tableEmpName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: W.ink,
  },
  tableEmpId: {
    fontSize: 11,
    color: W.inkFaint,
    marginTop: 1,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  hoursText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: W.ink,
  },
  hoursUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: W.inkFaint,
  },
  expandArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: W.surfaceAlt,
    borderWidth: 1,
    borderColor: W.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandArrowRotated: {
    backgroundColor: W.accentSoft,
    borderColor: W.accent,
    transform: [{ rotate: '180deg' }],
  },

  /* ── Expanded Area ── */
  expandedArea: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FAFBFF',
    borderBottomWidth: 1,
    borderBottomColor: W.border,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: W.inkSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
    color: W.inkMuted,
  },

  /* Calendar grid */
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarHeaderCell: {
    width: 'calc(14.28% - 6px)',
    minWidth: 60,
    paddingVertical: 4,
    alignItems: 'center',
  },
  calendarHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: W.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarCell: {
    width: 'calc(14.28% - 6px)',
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: W.borderSoft,
    gap: 4,
  },
  calendarDay: {
    fontSize: 12,
    fontWeight: '700',
    color: W.inkSub,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarStatus: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* Table Footer */
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: W.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: W.border,
  },
  tableFooterText: {
    fontSize: 12,
    color: W.inkFaint,
    fontWeight: '500',
  },
});

export default AdminMonthlyReportScreen;