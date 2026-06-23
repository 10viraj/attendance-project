import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, StatusBar, Platform, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../config/api';

/* ──────────────────────────────────────── */
/*  Design tokens – flat, modern palette    */
/* ──────────────────────────────────────── */
const C = {
  bg:         '#F7F8FA',
  surface:    '#FFFFFF',
  surfaceAlt: '#FAFBFC',
  border:     '#EAEDF2',
  borderSoft: '#F1F3F6',
  ink:        '#111827',
  inkSub:     '#374151',
  inkMuted:   '#6B7280',
  inkFaint:   '#9CA3AF',
  accent:     '#4F46E5',   // indigo
  accentSoft: '#EEF2FF',
  accentText: '#3730A3',
  green:      '#059669',
  greenSoft:  '#ECFDF5',
  greenText:  '#065F46',
  amber:      '#D97706',
  amberSoft:  '#FFFBEB',
  amberText:  '#92400E',
  red:        '#DC2626',
  redSoft:    '#FEF2F2',
  redText:    '#991B1B',
};

const AdminLeavesScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [activeTab, setActiveTab] = useState('Leaves');
  const [wfhRequests, setWfhRequests] = useState([]);
  
  // Web specific states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [remarks, setRemarks] = useState({});
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        if (activeTab === 'Leaves') {
          const res = await api.get('/leaves', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setLeaves(res.data.data);
          }
        } else {
          const res = await api.get('/wfh/admin', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setWfhRequests(res.data.data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading leaves:', error);
      Alert.alert('Error', 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setRemarks({});
      fetchData();
    }, [activeTab])
  );

  const handleUpdateStatus = async (id, status) => {
    const itemRemark = remarks[id] || '';
    const confirmMessage = `Are you sure you want to ${status.toLowerCase()} this request?`;
    const proceed = Platform.OS === 'web'
      ? window.confirm(confirmMessage)
      : await new Promise((resolve) => {
          Alert.alert(
            `Confirm ${status}`,
            confirmMessage,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Confirm', onPress: () => resolve(true) }
            ]
          );
        });

    if (!proceed) return;

    setProcessingId(id);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const endpoint = activeTab === 'Leaves' 
          ? `/leaves/${id}/status` 
          : `/wfh/admin/${id}/status`;

        const res = await api.put(endpoint, {
          status: status,
          managerRemark: itemRemark || `Automatically ${status.toLowerCase()} via Web portal`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          if (Platform.OS === 'web') {
            alert(`Request has been ${status.toLowerCase()}.`);
          } else {
            Alert.alert('Success', `Request has been ${status.toLowerCase()}.`);
          }
          setRemarks(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          fetchData();
        }
      }
    } catch (error) {
      console.error(`Error updating status to ${status}:`, error);
      const errMsg = error.response?.data?.message || 'Failed to update request status.';
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* ──────── MOBILE CARD ──────── */
  const renderItem = ({ item }) => {
    let StatusIcon = ClockIcon;
    let statusColor = '#f59e0b'; // amber for Pending
    let statusBg = '#fffbeb';

    if (item.status === 'Approved') {
      StatusIcon = CheckCircleIcon;
      statusColor = '#10b981';
      statusBg = '#ecfdf5';
    } else if (item.status === 'Rejected') {
      StatusIcon = XCircleIcon;
      statusColor = '#ef4444';
      statusBg = '#fef2f2';
    }

    const isPending = item.status === 'Pending';
    const isProcessing = processingId === item._id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>
              {item.employee?.firstName} {item.employee?.lastName}
            </Text>
            <Text style={styles.leaveType}>
              {activeTab === 'Leaves' ? `${item.type} Leave` : 'WFH Request'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <StatusIcon color={statusColor} size={16} />
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.dateRow}>
            <CalendarDaysIcon color="#94a3b8" size={18} />
            <Text style={styles.dateText}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          </View>
          <Text style={styles.reasonText} numberOfLines={3}>
            <Text style={{ fontWeight: '600' }}>Reason:</Text> {item.reason}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={() => handleUpdateStatus(item._id, 'Rejected')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]} 
              onPress={() => handleUpdateStatus(item._id, 'Approved')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.approveButtonText}>Approve</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  /* ═══════════════════════════════════════ */
  /*  WEB – Premium Redesign                */
  /* ═══════════════════════════════════════ */

  const getStatusMeta = (status) => {
    switch (status) {
      case 'Approved': return { color: C.green, bg: C.greenSoft, text: C.greenText, icon: '✓' };
      case 'Rejected': return { color: C.red, bg: C.redSoft, text: C.redText, icon: '✕' };
      default:         return { color: C.amber, bg: C.amberSoft, text: C.amberText, icon: '●' };
    }
  };

  /* ── Summary Stats ── */
  const WebSummaryCards = ({ data }) => {
    const pending  = data.filter(d => d.status === 'Pending').length;
    const approved = data.filter(d => d.status === 'Approved').length;
    const rejected = data.filter(d => d.status === 'Rejected').length;

    const cards = [
      { label: 'Total Requests',   value: data.length,  accent: C.accent,  softBg: C.accentSoft },
      { label: 'Pending Review',   value: pending,      accent: C.amber,   softBg: C.amberSoft },
      { label: 'Approved',         value: approved,     accent: C.green,   softBg: C.greenSoft },
      { label: 'Rejected',         value: rejected,     accent: C.red,     softBg: C.redSoft },
    ];

    return (
      <View style={w.summaryRow}>
        {cards.map((c, i) => (
          <View key={i} style={w.summaryCard}>
            <View style={[w.summaryAccent, { backgroundColor: c.accent }]} />
            <View style={w.summaryCardInner}>
              <Text style={w.summaryLabel}>{c.label}</Text>
              <Text style={[w.summaryValue, { color: c.accent }]}>{c.value}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  /* ── Filter Pills ── */
  const WebFilterPills = () => {
    const pills = ['All', 'Pending', 'Approved', 'Rejected'];
    return (
      <View style={w.pillRow}>
        {pills.map(p => {
          const active = statusFilter === p;
          return (
            <TouchableOpacity
              key={p}
              style={[w.pill, active && w.pillActive]}
              onPress={() => setStatusFilter(p)}
              activeOpacity={0.7}
            >
              <Text style={[w.pillText, active && w.pillTextActive]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  /* ── Grid View Card ── */
  const renderWebGrid = (data) => (
    <View style={w.gridContainer}>
      {data.map((item) => {
        const sm = getStatusMeta(item.status);
        const isPending = item.status === 'Pending';
        const isProcessing = processingId === item._id;
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const days = Math.ceil(Math.abs(end - start) / 86400000) + 1;

        return (
          <View key={item._id} style={[w.gridCard, { borderLeftColor: sm.color }]}>
            {/* Header */}
            <View style={w.gridCardTop}>
              <View style={w.gridAvatarRow}>
                <View style={[w.gridAvatar, { backgroundColor: sm.bg }]}>
                  <Text style={[w.gridAvatarLetter, { color: sm.color }]}>
                    {item.employee?.firstName?.[0]?.toUpperCase() || 'E'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={w.gridName} numberOfLines={1}>
                    {item.employee?.firstName} {item.employee?.lastName}
                  </Text>
                  <Text style={w.gridEmail} numberOfLines={1}>
                    {item.employee?.email}
                  </Text>
                </View>
              </View>
              <View style={[w.gridBadge, { backgroundColor: sm.bg }]}>
                <Text style={[w.gridBadgeText, { color: sm.text }]}>{sm.icon} {item.status}</Text>
              </View>
            </View>

            {/* Meta Row */}
            <View style={w.gridMeta}>
              <View style={w.gridMetaItem}>
                <Text style={w.gridMetaLabel}>Type</Text>
                <Text style={w.gridMetaValue}>
                  {activeTab === 'Leaves' ? `${item.type} Leave` : 'Work From Home'}
                </Text>
              </View>
              <View style={w.gridMetaItem}>
                <Text style={w.gridMetaLabel}>Duration</Text>
                <Text style={w.gridMetaValue}>{days} {days === 1 ? 'day' : 'days'}</Text>
              </View>
              <View style={w.gridMetaItem}>
                <Text style={w.gridMetaLabel}>Period</Text>
                <Text style={w.gridMetaValue}>{formatDate(item.startDate)} — {formatDate(item.endDate)}</Text>
              </View>
            </View>

            {/* Reason */}
            <View style={w.gridReasonBox}>
              <Text style={w.gridReasonLabel}>Reason</Text>
              <Text style={w.gridReasonText} numberOfLines={3}>{item.reason}</Text>
            </View>

            {/* Manager Remark (for decided items) */}
            {item.managerRemark && !isPending && (
              <View style={w.gridRemarkBox}>
                <Text style={w.gridRemarkLabel}>Manager Remark</Text>
                <Text style={w.gridRemarkValue} numberOfLines={2}>{item.managerRemark}</Text>
              </View>
            )}

            {/* Actions */}
            {isPending && (
              <View style={w.gridActionArea}>
                <TextInput
                  style={w.gridRemarkInput}
                  placeholder="Add a remark (optional)..."
                  placeholderTextColor={C.inkFaint}
                  value={remarks[item._id] || ''}
                  onChangeText={(t) => setRemarks(prev => ({ ...prev, [item._id]: t }))}
                />
                <View style={w.gridBtnRow}>
                  <TouchableOpacity
                    style={w.gridRejectBtn}
                    onPress={() => handleUpdateStatus(item._id, 'Rejected')}
                    disabled={isProcessing}
                    activeOpacity={0.7}
                  >
                    <Text style={w.gridRejectBtnText}>✕  Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={w.gridApproveBtn}
                    onPress={() => handleUpdateStatus(item._id, 'Approved')}
                    disabled={isProcessing}
                    activeOpacity={0.7}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={w.gridApproveBtnText}>✓  Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  /* ── Table View ── */
  const renderWebTable = (data) => (
    <View style={w.tableCard}>
      {/* Header */}
      <View style={w.tableHeaderRow}>
        <Text style={[w.tableHeaderCell, { flex: 1.8 }]}>Employee</Text>
        <Text style={[w.tableHeaderCell, { flex: 1 }]}>Type</Text>
        <Text style={[w.tableHeaderCell, { flex: 1.5 }]}>Period</Text>
        <Text style={[w.tableHeaderCell, { flex: 0.7 }]}>Days</Text>
        <Text style={[w.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
        <Text style={[w.tableHeaderCell, { flex: 2 }]}>Reason</Text>
        <Text style={[w.tableHeaderCell, { flex: 2.2 }]}>Action / Remark</Text>
      </View>

      {data.map((item, idx) => {
        const sm = getStatusMeta(item.status);
        const isPending = item.status === 'Pending';
        const isProcessing = processingId === item._id;
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const days = Math.ceil(Math.abs(end - start) / 86400000) + 1;
        const isAlt = idx % 2 === 1;

        return (
          <View key={item._id} style={[w.tableRow, isAlt && w.tableRowAlt]}>
            {/* Employee */}
            <View style={[w.tableCell, { flex: 1.8, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={[w.tableAvatar, { backgroundColor: C.accentSoft }]}>
                <Text style={[w.tableAvatarText, { color: C.accent }]}>
                  {item.employee?.firstName?.[0]?.toUpperCase() || 'E'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={w.tableEmpName} numberOfLines={1}>
                  {item.employee?.firstName} {item.employee?.lastName}
                </Text>
                <Text style={w.tableEmpEmail} numberOfLines={1}>{item.employee?.email}</Text>
              </View>
            </View>

            {/* Type */}
            <Text style={[w.tableCell, w.tableCellText, { flex: 1 }]}>
              {activeTab === 'Leaves' ? `${item.type}` : 'WFH'}
            </Text>

            {/* Period */}
            <Text style={[w.tableCell, w.tableCellText, { flex: 1.5, fontSize: 12.5 }]}>
              {formatDate(item.startDate)} — {formatDate(item.endDate)}
            </Text>

            {/* Days */}
            <Text style={[w.tableCell, w.tableCellText, { flex: 0.7, fontWeight: '700', color: C.ink }]}>
              {days}
            </Text>

            {/* Status */}
            <View style={[w.tableCell, { flex: 0.8 }]}>
              <View style={[w.tableBadge, { backgroundColor: sm.bg }]}>
                <Text style={[w.tableBadgeText, { color: sm.text }]}>{item.status}</Text>
              </View>
            </View>

            {/* Reason */}
            <Text style={[w.tableCell, w.tableCellText, { flex: 2, fontSize: 12.5, lineHeight: 17, color: C.inkSub }]} numberOfLines={2}>
              {item.reason}
            </Text>

            {/* Action / Remark */}
            <View style={[w.tableCell, { flex: 2.2 }]}>
              {isPending ? (
                <View style={{ gap: 6, width: '100%' }}>
                  <TextInput
                    style={w.tableRemarkInput}
                    placeholder="Remark..."
                    placeholderTextColor={C.inkFaint}
                    value={remarks[item._id] || ''}
                    onChangeText={(t) => setRemarks(prev => ({ ...prev, [item._id]: t }))}
                  />
                  <View style={w.tableActionBtns}>
                    <TouchableOpacity
                      style={w.tableRejectBtnSmall}
                      onPress={() => handleUpdateStatus(item._id, 'Rejected')}
                      disabled={isProcessing}
                      activeOpacity={0.7}
                    >
                      <Text style={w.tableRejectTextSmall}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={w.tableApproveBtnSmall}
                      onPress={() => handleUpdateStatus(item._id, 'Approved')}
                      disabled={isProcessing}
                      activeOpacity={0.7}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={w.tableApproveTextSmall}>Approve</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  {item.managerRemark && (
                    <Text style={w.tableRemarkDisplay} numberOfLines={2}>{item.managerRemark}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  /* ═══════════════════════════════════════ */
  /*  WEB RENDER                            */
  /* ═══════════════════════════════════════ */
  if (Platform.OS === 'web') {
    const rawData = activeTab === 'Leaves' ? leaves : wfhRequests;
    const activeData = statusFilter === 'All'
      ? rawData
      : rawData.filter(d => d.status === statusFilter);

    return (
      <SafeAreaView style={w.container}>
        <StatusBar backgroundColor={C.bg} barStyle="dark-content" />
        <ScrollView contentContainerStyle={w.scrollContent}>

          {/* ── Page Header ── */}
          <View style={w.pageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={w.pageTitle}>Approvals</Text>
              <Text style={w.pageSubtitle}>
                Review and manage employee {activeTab === 'Leaves' ? 'leave' : 'work-from-home'} requests
              </Text>
            </View>
            <View style={w.headerControls}>
              {/* Tab Switcher */}
              <View style={w.tabBar}>
                {['Leaves', 'WFH'].map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[w.tabBtn, activeTab === tab && w.tabBtnActive]}
                    onPress={() => { setActiveTab(tab); setStatusFilter('All'); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[w.tabBtnText, activeTab === tab && w.tabBtnTextActive]}>
                      {tab === 'Leaves' ? 'Leave Requests' : 'WFH Requests'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* View Toggle */}
              <View style={w.viewToggle}>
                <TouchableOpacity
                  style={[w.viewToggleBtn, viewMode === 'grid' && w.viewToggleBtnActive]}
                  onPress={() => setViewMode('grid')}
                  activeOpacity={0.8}
                >
                  <Text style={[w.viewToggleText, viewMode === 'grid' && w.viewToggleTextActive]}>⊞ Grid</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[w.viewToggleBtn, viewMode === 'table' && w.viewToggleBtnActive]}
                  onPress={() => setViewMode('table')}
                  activeOpacity={0.8}
                >
                  <Text style={[w.viewToggleText, viewMode === 'table' && w.viewToggleTextActive]}>☰ Table</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Summary Cards ── */}
          <WebSummaryCards data={rawData} />

          {/* ── Filter Pills ── */}
          <WebFilterPills />

          {/* ── Content ── */}
          {loading && !rawData.length ? (
            <View style={w.centered}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={w.loadingText}>Fetching requests…</Text>
            </View>
          ) : activeData.length === 0 ? (
            <View style={w.emptyBox}>
              <View style={w.emptyIconCircle}>
                <CalendarDaysIcon color={C.inkFaint} size={48} />
              </View>
              <Text style={w.emptyTitle}>
                {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} requests` : 'All caught up!'}
              </Text>
              <Text style={w.emptySubtitle}>
                {statusFilter !== 'All'
                  ? `There are no ${statusFilter.toLowerCase()} ${activeTab === 'Leaves' ? 'leave' : 'WFH'} requests to display.`
                  : `No ${activeTab === 'Leaves' ? 'leave' : 'WFH'} requests found.`}
              </Text>
            </View>
          ) : viewMode === 'grid' ? (
            renderWebGrid(activeData)
          ) : (
            renderWebTable(activeData)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ═══════════════════════════════════════ */
  /*  MOBILE RENDER (unchanged)             */
  /* ═══════════════════════════════════════ */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Approvals</Text>
        
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Leaves' && styles.activeTab]}
            onPress={() => setActiveTab('Leaves')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'Leaves' && styles.activeTabText]}>Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'WFH' && styles.activeTab]}
            onPress={() => setActiveTab('WFH')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'WFH' && styles.activeTabText]}>WFH</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (activeTab === 'Leaves' ? !leaves.length : !wfhRequests.length) ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'Leaves' ? leaves : wfhRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarDaysIcon color="#cbd5e1" size={64} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No leave requests found.</Text>
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
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#2563eb',
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
    marginBottom: 16,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  leaveType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  cardBody: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#fff1f2',
    marginRight: 8,
  },
  rejectButtonText: {
    color: '#e11d48',
    fontSize: 15,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: '#2563eb',
    marginLeft: 8,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
});

/* ═══════════════════════════════════════════ */
/*  WEB STYLES – Premium redesign             */
/* ═══════════════════════════════════════════ */
const w = StyleSheet.create({
  /* ── Layout ── */
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
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 28,
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
    lineHeight: 20,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },

  /* ── Tab Bar ── */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.border,
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMuted,
  },
  tabBtnTextActive: {
    color: C.accent,
  },

  /* ── View Toggle ── */
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

  /* ── Summary Cards ── */
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 200,
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
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  /* ── Filter Pills ── */
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMuted,
  },
  pillTextActive: {
    color: '#fff',
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.borderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.inkSub,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.inkMuted,
    textAlign: 'center',
    maxWidth: 340,
  },

  /* ═══ GRID VIEW ═══ */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  gridCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 340,
    maxWidth: 520,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    padding: 22,
  },
  gridCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  gridAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  gridAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridAvatarLetter: {
    fontSize: 17,
    fontWeight: '800',
  },
  gridName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 2,
  },
  gridEmail: {
    fontSize: 12,
    color: C.inkFaint,
  },
  gridBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gridBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Grid Meta */
  gridMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    backgroundColor: C.surfaceAlt,
    padding: 14,
    borderRadius: 10,
  },
  gridMetaItem: {
    flex: 1,
    minWidth: 80,
  },
  gridMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  gridMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkSub,
  },

  /* Grid Reason */
  gridReasonBox: {
    marginBottom: 12,
  },
  gridReasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridReasonText: {
    fontSize: 13,
    color: C.inkSub,
    lineHeight: 19,
  },

  /* Grid Remark */
  gridRemarkBox: {
    backgroundColor: C.accentSoft,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  gridRemarkLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accentText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  gridRemarkValue: {
    fontSize: 13,
    color: C.accentText,
    lineHeight: 18,
  },

  /* Grid Actions */
  gridActionArea: {
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
    paddingTop: 16,
    gap: 10,
  },
  gridRemarkInput: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: C.ink,
  },
  gridBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridRejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.redSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  gridRejectBtnText: {
    color: C.red,
    fontWeight: '700',
    fontSize: 13,
  },
  gridApproveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
  },
  gridApproveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
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
    paddingVertical: 14,
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
  tableCell: {
    justifyContent: 'center',
    paddingRight: 14,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.inkSub,
  },
  tableAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tableAvatarText: {
    fontWeight: '800',
    fontSize: 14,
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
  tableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tableBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableRemarkInput: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: C.ink,
  },
  tableActionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  tableRejectBtnSmall: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: C.redSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  tableRejectTextSmall: {
    color: C.red,
    fontWeight: '700',
    fontSize: 12,
  },
  tableApproveBtnSmall: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
  },
  tableApproveTextSmall: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  tableRemarkDisplay: {
    fontSize: 12,
    color: C.inkMuted,
    fontStyle: 'italic',
    lineHeight: 17,
  },
});


export default AdminLeavesScreen;
