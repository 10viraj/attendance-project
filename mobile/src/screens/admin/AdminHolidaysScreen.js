import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilIcon,
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
  amber:       '#D97706',
  amberSoft:   '#FFFBEB',
  amberText:   '#92400E',
  violet:      '#7C3AED',
  violetSoft:  '#F5F3FF',
  violetText:  '#5B21B6',
  red:         '#DC2626',
  redSoft:     '#FEF2F2',
};

/* Type badge colors */
const TYPE_COLORS = {
  Company:  { bg: C.accentSoft, text: C.accentText, dot: C.accent },
  Regional: { bg: C.amberSoft,  text: C.amberText,  dot: C.amber },
  Festival: { bg: C.violetSoft, text: C.violetText,  dot: C.violet },
  default:  { bg: C.surfaceAlt, text: C.inkMuted,    dot: C.inkFaint },
};

const getTypeColor = (t) => TYPE_COLORS[t] || TYPE_COLORS.default;

const AdminHolidaysScreen = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('Company');
  const [description, setDescription] = useState('');

  // Web state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await api.get('/holidays', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setHolidays(res.data.data);
        }
      }
    } catch (error) {
      console.error('Error loading holidays:', error);
      Alert.alert('Error', 'Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHolidays();
    }, [])
  );

  const handleAddHoliday = async () => {
    if (!name || !date) {
      Alert.alert('Error', 'Please provide a name and date (YYYY-MM-DD)');
      return;
    }

    setAdding(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const url = editingId ? `/holidays/${editingId}` : '/holidays';
        const method = editingId ? 'put' : 'post';
        
        const res = await api[method](url, {
          name, date, type, description
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.success) {
          Alert.alert('Success', `Holiday ${editingId ? 'updated' : 'added'} successfully.`);
          closeModal();
          fetchHolidays();
        }
      }
    } catch (error) {
      console.error('Error saving holiday:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save holiday.');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (holiday) => {
    setEditingId(holiday._id);
    setName(holiday.name);
    setDate(holiday.date ? new Date(holiday.date).toISOString().split('T')[0] : '');
    setType(holiday.type || 'Company');
    setDescription(holiday.description || '');
    setModalVisible(true);
  };

  const executeDelete = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.delete(`/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        fetchHolidays();
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      Alert.alert('Error', 'Failed to delete holiday.');
    }
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this holiday?')) {
        executeDelete(id);
      }
    } else {
      Alert.alert('Delete Holiday', 'Are you sure you want to delete this holiday?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => executeDelete(id) }
      ]);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setName('');
    setDate('');
    setType('Company');
    setDescription('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return { day: '--', month: '---' };
    const d = new Date(dateString);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  /* ── Filtered / grouped holidays (web) ── */
  const filteredHolidays = useMemo(() => {
    let data = holidays;
    if (filterType !== 'All') {
      data = data.filter(h => h.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(h =>
        h.name?.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.type?.toLowerCase().includes(q)
      );
    }
    // Sort by date ascending
    return [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [holidays, filterType, searchQuery]);

  /* Summary stats */
  const stats = useMemo(() => {
    const upcoming = holidays.filter(h => new Date(h.date) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
    const company = holidays.filter(h => h.type === 'Company').length;
    const festival = holidays.filter(h => h.type === 'Festival').length;
    const regional = holidays.filter(h => h.type === 'Regional').length;
    return { total: holidays.length, upcoming, company, festival, regional };
  }, [holidays]);

  /* ═══════════════════════════════════════════ */
  /*  ADD MODAL (shared between web & mobile)    */
  /* ═══════════════════════════════════════════ */
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
              {editingId ? 'Edit Holiday' : 'Add New Holiday'}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <XMarkIcon color={C.inkMuted} size={24} />
            </TouchableOpacity>
          </View>

          <View style={Platform.OS === 'web' ? w.formContainer : styles.formContainer}>
            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Holiday Name</Text>
            <TextInput
              style={Platform.OS === 'web' ? w.input : styles.input}
              placeholder="e.g. Diwali, Christmas"
              placeholderTextColor={C.inkFaint}
              value={name}
              onChangeText={setName}
            />

            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={Platform.OS === 'web' ? w.input : styles.input}
              placeholder="2024-12-25"
              placeholderTextColor={C.inkFaint}
              value={date}
              onChangeText={setDate}
            />

            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Type</Text>
            <View style={Platform.OS === 'web' ? w.typeSelector : styles.typeSelector}>
              {['Company', 'Regional', 'Festival'].map(t => {
                const tc = getTypeColor(t);
                const isActive = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      Platform.OS === 'web' ? w.typeOption : styles.typeOption,
                      isActive && (Platform.OS === 'web'
                        ? { backgroundColor: tc.bg, borderColor: tc.dot }
                        : styles.typeOptionActive
                      )
                    ]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[
                      Platform.OS === 'web' ? w.typeOptionText : styles.typeOptionText,
                      isActive && (Platform.OS === 'web'
                        ? { color: tc.text }
                        : styles.typeOptionTextActive
                      )
                    ]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={Platform.OS === 'web' ? w.label : styles.label}>Description (Optional)</Text>
            <TextInput
              style={[
                Platform.OS === 'web' ? w.input : styles.input,
                { height: 80, textAlignVertical: 'top' }
              ]}
              placeholder="Any additional details..."
              placeholderTextColor={C.inkFaint}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              style={Platform.OS === 'web' ? w.submitBtn : styles.submitButton}
              onPress={handleAddHoliday}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={Platform.OS === 'web' ? w.submitBtnText : styles.submitButtonText}>Save Holiday</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  /* ═══════════════════════════════════════════ */
  /*  WEB RENDER                                 */
  /* ═══════════════════════════════════════════ */
  if (Platform.OS === 'web') {
    const isPast = (dateStr) => new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));

    return (
      <SafeAreaView style={w.container}>
        <ScrollView contentContainerStyle={w.scrollContent}>
          {/* ── Page Header ── */}
          <View style={w.pageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={w.pageTitle}>Holidays</Text>
              <Text style={w.pageSubtitle}>Manage company, regional, and festival holidays</Text>
            </View>
            <TouchableOpacity style={w.addBtn} onPress={closeModal} activeOpacity={0.7}>
              <PlusIcon color="#fff" size={16} />
              <Text style={w.addBtnText}>Add Holiday</Text>
            </TouchableOpacity>
          </View>

          {/* ── Summary Cards ── */}
          {!loading && (
            <View style={w.summaryRow}>
              {[
                { label: 'Total Holidays',   value: stats.total,    color: C.accent, bg: C.accentSoft },
                { label: 'Upcoming',          value: stats.upcoming, color: C.green,  bg: C.greenSoft },
                { label: 'Company',           value: stats.company,  color: C.accent, bg: C.accentSoft },
                { label: 'Festival',          value: stats.festival, color: C.violet, bg: C.violetSoft },
                { label: 'Regional',          value: stats.regional, color: C.amber,  bg: C.amberSoft },
              ].map((c, i) => (
                <View key={i} style={w.summaryCard}>
                  <View style={[w.summaryAccent, { backgroundColor: c.color }]} />
                  <View style={w.summaryCardInner}>
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
                placeholder="Search holidays…"
                placeholderTextColor={C.inkFaint}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={w.filterRow}>
              {['All', 'Company', 'Regional', 'Festival'].map(f => {
                const isActive = filterType === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[w.filterPill, isActive && w.filterPillActive]}
                    onPress={() => setFilterType(f)}
                    activeOpacity={0.7}
                  >
                    <Text style={[w.filterPillText, isActive && w.filterPillTextActive]}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Content ── */}
          {loading ? (
            <View style={w.centered}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={w.loadingText}>Loading holidays…</Text>
            </View>
          ) : filteredHolidays.length === 0 ? (
            <View style={w.emptyBox}>
              <View style={w.emptyIconCircle}>
                <CalendarDaysIcon color={C.inkFaint} size={40} />
              </View>
              <Text style={w.emptyTitle}>
                {searchQuery || filterType !== 'All' ? 'No holidays match your filter' : 'No holidays found'}
              </Text>
              <Text style={w.emptySubtitle}>
                {searchQuery ? `No results for "${searchQuery}"` : 'Add holidays using the button above.'}
              </Text>
            </View>
          ) : (
            <View style={w.tableCard}>
              {/* Table Header */}
              <View style={w.tableHeaderRow}>
                <Text style={[w.tableHeaderCell, { flex: 0.6, textAlign: 'center' }]}>Date</Text>
                <Text style={[w.tableHeaderCell, { flex: 2 }]}>Holiday</Text>
                <Text style={[w.tableHeaderCell, { flex: 1 }]}>Type</Text>
                <Text style={[w.tableHeaderCell, { flex: 2 }]}>Description</Text>
                <Text style={[w.tableHeaderCell, { flex: 0.6, textAlign: 'center' }]}>Status</Text>
                <Text style={[w.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>Actions</Text>
              </View>

              {filteredHolidays.map((holiday, idx) => {
                const isAlt = idx % 2 === 1;
                const tc = getTypeColor(holiday.type);
                const past = isPast(holiday.date);
                const ds = formatDateShort(holiday.date);

                return (
                  <View key={holiday._id} style={[w.tableRow, isAlt && w.tableRowAlt, past && w.tableRowPast]}>
                    {/* Date Calendar Block */}
                    <View style={[w.tableCell, { flex: 0.6, alignItems: 'center' }]}>
                      <View style={[w.dateBlock, past && w.dateBlockPast]}>
                        <Text style={[w.dateBlockDay, past && w.dateBlockDayPast]}>{ds.day}</Text>
                        <Text style={[w.dateBlockMonth, past && w.dateBlockMonthPast]}>{ds.month}</Text>
                      </View>
                    </View>

                    {/* Holiday Name */}
                    <View style={[w.tableCell, { flex: 2 }]}>
                      <Text style={[w.holidayName, past && w.textPast]} numberOfLines={1}>{holiday.name}</Text>
                      <Text style={w.holidayWeekday}>{ds.weekday}, {formatDate(holiday.date)}</Text>
                    </View>

                    {/* Type Badge */}
                    <View style={[w.tableCell, { flex: 1 }]}>
                      <View style={[w.typeBadge, { backgroundColor: tc.bg }]}>
                        <View style={[w.typeDot, { backgroundColor: tc.dot }]} />
                        <Text style={[w.typeBadgeText, { color: tc.text }]}>{holiday.type}</Text>
                      </View>
                    </View>

                    {/* Description */}
                    <Text style={[w.tableCell, w.descText, { flex: 2 }]} numberOfLines={2}>
                      {holiday.description || '—'}
                    </Text>

                    {/* Status */}
                    <View style={[w.tableCell, { flex: 0.6, alignItems: 'center' }]}>
                      <View style={[w.statusPill, past ? w.statusPast : w.statusUpcoming]}>
                        <Text style={[w.statusPillText, past ? w.statusPastText : w.statusUpcomingText]}>
                          {past ? 'Past' : 'Upcoming'}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={[w.tableCell, { flex: 0.8, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                      <TouchableOpacity onPress={() => handleEdit(holiday)} activeOpacity={0.7} style={w.actionBtn}>
                        <PencilIcon color={C.inkSub} size={18} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(holiday._id)} activeOpacity={0.7} style={w.actionBtn}>
                        <TrashIcon color={C.red} size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Footer */}
              <View style={w.tableFooter}>
                <Text style={w.tableFooterText}>
                  Showing {filteredHolidays.length} of {holidays.length} holidays
                </Text>
                <Text style={w.tableFooterText}>
                  {stats.upcoming} upcoming
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {renderAddModal()}
      </SafeAreaView>
    );
  }

  /* ═══════════════════════════════════════════ */
  /*  MOBILE RENDER (preserved)                  */
  /* ═══════════════════════════════════════════ */
  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.holidayName}>{item.name}</Text>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.type}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => handleEdit(item)}>
              <PencilIcon color="#64748b" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)}>
              <TrashIcon color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.dateRow}>
            <CalendarDaysIcon color="#64748b" size={18} />
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          </View>
          {item.description ? (
            <Text style={styles.reasonText}>{item.description}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Holidays</Text>
          <Text style={styles.headerSub}>Manage company and festival holidays</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={closeModal}
        >
          <PlusIcon color="#ffffff" size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={holidays}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarDaysIcon color="#cbd5e1" size={64} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No holidays found.</Text>
            </View>
          }
        />
      )}

      {renderAddModal()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 10
  },
  typeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  cardBody: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 10,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Modal Styles
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
    gap: 8,
  },
  typeOption: {
    flex: 1,
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
    flexWrap: 'wrap',
    gap: 16,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.accent,
  },
  addBtnText: {
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
    minWidth: 160,
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.borderSoft,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
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
    maxWidth: 320,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.ink,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkMuted,
  },
  filterPillTextActive: {
    color: C.accentText,
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

  /* ═══ TABLE ═══ */
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  tableRowAlt: {
    backgroundColor: C.surfaceAlt,
  },
  tableRowPast: {
    opacity: 0.6,
  },
  tableCell: {
    justifyContent: 'center',
    paddingRight: 12,
  },

  /* Date block */
  dateBlock: {
    width: 52,
    backgroundColor: C.accentSoft,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dateBlockPast: {
    backgroundColor: C.surfaceAlt,
  },
  dateBlockDay: {
    fontSize: 20,
    fontWeight: '800',
    color: C.accent,
    lineHeight: 24,
  },
  dateBlockDayPast: {
    color: C.inkFaint,
  },
  dateBlockMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accentText,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  dateBlockMonthPast: {
    color: C.inkFaint,
  },

  /* Holiday info */
  holidayName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 3,
  },
  holidayWeekday: {
    fontSize: 12,
    color: C.inkFaint,
  },
  textPast: {
    color: C.inkMuted,
  },

  /* Type badge */
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Description */
  descText: {
    fontSize: 13,
    color: C.inkMuted,
    lineHeight: 18,
  },

  /* Status pill */
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusUpcoming: {
    backgroundColor: C.greenSoft,
  },
  statusPast: {
    backgroundColor: C.surfaceAlt,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusUpcomingText: {
    color: C.greenText,
  },
  statusPastText: {
    color: C.inkFaint,
  },

  /* Footer */
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },

  /* ═══ MODAL (Web version) ═══ */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 32,
    width: '90%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
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
    color: C.ink,
  },
  formContainer: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: C.inkSub,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: C.ink,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMuted,
  },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AdminHolidaysScreen;
