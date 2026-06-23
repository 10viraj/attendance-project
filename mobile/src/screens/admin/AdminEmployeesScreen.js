import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  ChevronRightIcon,
  UsersIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  TrashIcon,
} from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

/* ───────────────────────────────────────── */
/*  Web palette                              */
/* ───────────────────────────────────────── */
const C = {
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
  red:         '#DC2626',
  redSoft:     '#FEF2F2',
  redText:     '#991B1B',
};

const AdminEmployeesScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Web-only state
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  const handleDeleteEmployee = (id, firstName, lastName) => {
    const confirmMessage = `Are you sure you want to completely remove ${firstName} ${lastName}? This action cannot be undone.`;
    
    const performDelete = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const res = await api.delete(`/employees/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setEmployees(prev => prev.filter(emp => emp._id !== id));
            if (Platform.OS === 'web') {
              alert('Employee deleted successfully');
            } else {
              Alert.alert('Success', 'Employee deleted successfully');
            }
          }
        }
      } catch (error) {
        const errMsg = error.response?.data?.message || 'Failed to delete employee';
        if (Platform.OS === 'web') {
          alert(errMsg);
        } else {
          Alert.alert('Error', errMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Employee',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  const fetchEmployees = async (query = '') => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await api.get(`/employees?search=${query}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setEmployees(res.data.data);
        }
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEmployees();
    });
    return unsubscribe;
  }, [navigation]);

  const handleSearch = () => {
    fetchEmployees(searchQuery);
  };

  /* ── Filtered data (web uses local filter for instant results) ── */
  const filteredEmployees = useMemo(() => {
    if (Platform.OS !== 'web' || !searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.employeeId?.toLowerCase().includes(q) ||
      e.department?.name?.toLowerCase().includes(q) ||
      (e.designation || e.position)?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const active = employees.filter(e => e.isActive !== false).length;
    const depts = [...new Set(employees.map(e => e.department?.name).filter(Boolean))].length;
    return { total: employees.length, active, depts };
  }, [employees]);

  /* ═══════════════════════════════════════════ */
  /*  WEB RENDER                                 */
  /* ═══════════════════════════════════════════ */
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={w.container}>
        <ScrollView contentContainerStyle={w.scrollContent}>
          {/* ── Page Header ── */}
          <View style={w.pageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={w.pageTitle}>Staff Directory</Text>
              <Text style={w.pageSubtitle}>Manage and view all employee information</Text>
            </View>
          </View>

          {/* ── Summary Cards ── */}
          {!loading && (
            <View style={w.summaryRow}>
              {[
                { label: 'Total Employees', value: stats.total,  Icon: UsersIcon,            color: C.accent, bg: C.accentSoft },
                { label: 'Active',           value: stats.active, Icon: UserCircleIcon,       color: C.green,  bg: C.greenSoft },
                { label: 'Departments',      value: stats.depts,  Icon: BuildingOffice2Icon,  color: C.inkSub, bg: C.surfaceAlt },
              ].map((c, i) => (
                <View key={i} style={w.summaryCard}>
                  <View style={[w.summaryIcon, { backgroundColor: c.bg }]}>
                    <c.Icon color={c.color} size={20} />
                  </View>
                  <View>
                    <Text style={w.summaryLabel}>{c.label}</Text>
                    <Text style={[w.summaryValue, { color: c.color }]}>{c.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Toolbar ── */}
          <View style={w.toolbar}>
            <View style={w.searchBox}>
              <MagnifyingGlassIcon color={C.inkFaint} size={16} />
              <TextInput
                style={w.searchInput}
                placeholder="Search by name, ID, department, or position…"
                placeholderTextColor={C.inkFaint}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
            </View>
            <View style={w.toolbarRight}>
              <View style={w.viewToggle}>
                <TouchableOpacity
                  style={[w.viewToggleBtn, viewMode === 'table' && w.viewToggleBtnActive]}
                  onPress={() => setViewMode('table')}
                  activeOpacity={0.8}
                >
                  <Text style={[w.viewToggleText, viewMode === 'table' && w.viewToggleTextActive]}>☰ Table</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[w.viewToggleBtn, viewMode === 'grid' && w.viewToggleBtnActive]}
                  onPress={() => setViewMode('grid')}
                  activeOpacity={0.8}
                >
                  <Text style={[w.viewToggleText, viewMode === 'grid' && w.viewToggleTextActive]}>⊞ Grid</Text>
                </TouchableOpacity>
              </View>
              <Text style={w.recordCount}>{filteredEmployees.length} employees</Text>
            </View>
          </View>

          {/* ── Content ── */}
          {loading ? (
            <View style={w.centered}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={w.loadingText}>Loading employees…</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View style={w.emptyBox}>
              <View style={w.emptyIconCircle}>
                <UsersIcon color={C.inkFaint} size={40} />
              </View>
              <Text style={w.emptyTitle}>
                {searchQuery ? `No results for "${searchQuery}"` : 'No employees found'}
              </Text>
              <Text style={w.emptySubtitle}>
                {searchQuery ? 'Try a different search term.' : 'Employees will appear here once added.'}
              </Text>
            </View>
          ) : viewMode === 'table' ? (
            /* ── TABLE VIEW ── */
            <View style={w.tableCard}>
              <View style={w.tableHeaderRow}>
                <Text style={[w.tableHeaderCell, { flex: 2.2 }]}>Employee</Text>
                <Text style={[w.tableHeaderCell, { flex: 1.2 }]}>Department</Text>
                <Text style={[w.tableHeaderCell, { flex: 1 }]}>Position</Text>
                <Text style={[w.tableHeaderCell, { flex: 1 }]}>Employee ID</Text>
                <Text style={[w.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                <Text style={[w.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Actions</Text>
              </View>

              {filteredEmployees.map((emp, idx) => {
                const isAlt = idx % 2 === 1;
                const isActive = emp.isActive !== false;
                return (
                  <TouchableOpacity
                    key={emp._id}
                    style={[w.tableRow, isAlt && w.tableRowAlt]}
                    onPress={() => navigation.navigate('AdminEmployeeDetail', { employee: emp })}
                    activeOpacity={0.7}
                  >
                    {/* Employee */}
                    <View style={[w.tableCell, { flex: 2.2, flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={w.tableAvatar}>
                        <Text style={w.tableAvatarText}>
                          {emp.firstName?.[0]?.toUpperCase()}{emp.lastName?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={w.tableEmpName} numberOfLines={1}>
                          {emp.firstName} {emp.lastName}
                        </Text>
                        {emp.user?.email && (
                          <Text style={w.tableEmpEmail} numberOfLines={1}>{emp.user.email}</Text>
                        )}
                      </View>
                    </View>

                    {/* Department */}
                    <Text style={[w.tableCell, w.tableCellText, { flex: 1.2 }]}>
                      {emp.department?.name || '—'}
                    </Text>

                    {/* Position */}
                    <Text style={[w.tableCell, w.tableCellText, { flex: 1 }]}>
                      {emp.designation || emp.position || '—'}
                    </Text>

                    {/* ID */}
                    <View style={[w.tableCell, { flex: 1 }]}>
                      <Text style={w.tableIdBadge}>{emp.employeeId}</Text>
                    </View>

                    {/* Status */}
                    <View style={[w.tableCell, { flex: 0.8 }]}>
                      <View style={[w.statusBadge, { backgroundColor: isActive ? C.greenSoft : C.redSoft }]}>
                        <View style={[w.statusDot, { backgroundColor: isActive ? C.green : C.red }]} />
                        <Text style={[w.statusBadgeText, { color: isActive ? C.greenText : C.redText }]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={[w.tableCell, { flex: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }]}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteEmployee(emp._id, emp.firstName, emp.lastName);
                        }}
                        activeOpacity={0.7}
                        style={{ padding: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel="Delete Employee"
                      >
                        <TrashIcon color={C.red} size={16} />
                      </TouchableOpacity>
                      <ChevronRightIcon color={C.inkFaint} size={16} />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Footer */}
              <View style={w.tableFooter}>
                <Text style={w.tableFooterText}>
                  Showing {filteredEmployees.length} of {employees.length} employees
                </Text>
              </View>
            </View>
          ) : (
            /* ── GRID VIEW ── */
            <View style={w.gridContainer}>
              {filteredEmployees.map((emp) => {
                const isActive = emp.isActive !== false;
                return (
                  <TouchableOpacity
                    key={emp._id}
                    style={w.gridCard}
                    onPress={() => navigation.navigate('AdminEmployeeDetail', { employee: emp })}
                    activeOpacity={0.7}
                  >
                    {/* Avatar */}
                    <View style={w.gridAvatarCircle}>
                      <Text style={w.gridAvatarLetter}>
                        {emp.firstName?.[0]?.toUpperCase()}{emp.lastName?.[0]?.toUpperCase()}
                      </Text>
                    </View>

                    {/* Name & Status */}
                    <Text style={w.gridName} numberOfLines={1}>
                      {emp.firstName} {emp.lastName}
                    </Text>
                    <Text style={w.gridRole} numberOfLines={1}>
                      {emp.designation || emp.position || emp.department?.name || 'Employee'}
                    </Text>

                    {/* Status badge */}
                    <View style={[w.gridStatus, { backgroundColor: isActive ? C.greenSoft : C.redSoft }]}>
                      <View style={[w.statusDot, { backgroundColor: isActive ? C.green : C.red }]} />
                      <Text style={[w.gridStatusText, { color: isActive ? C.greenText : C.redText }]}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>

                    {/* Meta */}
                    <View style={w.gridMeta}>
                      <View style={w.gridMetaItem}>
                        <Text style={w.gridMetaLabel}>ID</Text>
                        <Text style={w.gridMetaValue}>{emp.employeeId}</Text>
                      </View>
                      <View style={w.gridMetaItem}>
                        <Text style={w.gridMetaLabel}>Department</Text>
                        <Text style={w.gridMetaValue} numberOfLines={1}>{emp.department?.name || '—'}</Text>
                      </View>
                    </View>

                    {/* View profile link */}
                    <View style={w.gridFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={w.gridFooterLink}>View Profile</Text>
                        <ChevronRightIcon color={C.accent} size={14} style={{ marginLeft: 2 }} />
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteEmployee(emp._id, emp.firstName, emp.lastName);
                        }}
                        activeOpacity={0.7}
                        style={{ padding: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel="Delete Employee"
                      >
                        <TrashIcon color={C.red} size={16} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ═══════════════════════════════════════════ */
  /*  MOBILE RENDER (preserved)                  */
  /* ═══════════════════════════════════════════ */
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.employeeCard} 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AdminEmployeeDetail', { employee: item })}
    >
      <View style={styles.avatarContainer}>
        {item.profileImage ? (
          <UserCircleIcon color="#94a3b8" size={50} /> // Placeholder for image
        ) : (
          <View style={styles.initialsAvatar}>
            <Text style={styles.initialsText}>
              {item.firstName?.[0]}{item.lastName?.[0]}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.employeeRole}>{item.department?.name || 'No Department'} • {item.designation || item.position || 'Staff'}</Text>
        <Text style={styles.employeeId}>ID: {item.employeeId}</Text>
      </View>
      <View style={[styles.arrowContainer, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteEmployee(item._id, item.firstName, item.lastName);
          }}
          activeOpacity={0.7}
          style={{ padding: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Delete Employee"
        >
          <TrashIcon color="#ef4444" size={20} />
        </TouchableOpacity>
        <ChevronRightIcon color="#cbd5e1" size={20} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Directory</Text>
        
        <View style={styles.searchContainer}>
          <MagnifyingGlassIcon color="#94a3b8" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No employees found.</Text>
            </View>
          }
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  listContent: {
    padding: 20,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  initialsAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  initialsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  employeeId: {
    fontSize: 12,
    color: '#94a3b8',
  },
  arrowContainer: {
    paddingLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
});

/* ═══════════════════════════════════════════ */
/*  WEB STYLES                                */
/* ═══════════════════════════════════════════ */
const w = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
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
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: C.inkMuted,
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
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  /* ── Toolbar ── */
  toolbar: {
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
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
    flex: 1,
    maxWidth: 420,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.ink,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: C.border,
    borderRadius: 10,
    padding: 3,
  },
  viewToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMuted,
  },
  viewToggleTextActive: {
    color: C.accent,
  },
  recordCount: {
    fontSize: 13,
    color: C.inkMuted,
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
    color: C.inkMuted,
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
    backgroundColor: C.borderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.inkSub,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.inkMuted,
    textAlign: 'center',
    maxWidth: 340,
  },

  /* ═══ TABLE VIEW ═══ */
  tableCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: C.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  tableRowAlt: {
    backgroundColor: C.surfaceAlt,
  },
  tableCell: {
    justifyContent: 'center',
    paddingRight: 12,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.inkSub,
  },
  tableAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tableAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.accent,
  },
  tableEmpName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.ink,
  },
  tableEmpEmail: {
    fontSize: 11,
    color: C.inkFaint,
    marginTop: 1,
  },
  tableIdBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkMuted,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableFooter: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  tableFooterText: {
    fontSize: 12,
    color: C.inkFaint,
    fontWeight: '500',
  },

  /* ═══ GRID VIEW ═══ */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  gridCard: {
    flexBasis: '23%',
    flexGrow: 1,
    minWidth: 240,
    maxWidth: 340,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: C.borderSoft,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  gridAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  gridAvatarLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: C.accent,
  },
  gridName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 3,
    textAlign: 'center',
  },
  gridRole: {
    fontSize: 12,
    color: C.inkMuted,
    marginBottom: 12,
    textAlign: 'center',
  },
  gridStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  gridStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Grid Meta */
  gridMeta: {
    width: '100%',
    backgroundColor: C.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  gridMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  gridMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkSub,
    flex: 1,
    textAlign: 'right',
  },

  /* Grid Footer */
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridFooterLink: {
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
  },
});

export default AdminEmployeesScreen;
