import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  Clock,
  CalendarOff,
  Users,
  BarChart3,
  Search,
  ChevronDown,
  TrendingUp,
  Calendar,
  Timer,
  XCircle,
} from 'lucide-react';
import api from '../services/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_STYLES = {
  Present: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  Late: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  'Half-Day': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  'On Leave': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  Absent: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  Weekend: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
  default: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-400 dark:text-slate-500', dot: 'bg-slate-300' },
};

const getStatus = (s) => STATUS_STYLES[s] || STATUS_STYLES.default;

/* ─────────────── Stat Card ─────────────── */
const StatCard = ({ icon: Icon, label, value, color, iconBg }) => (
  <div className="card p-5 flex items-center gap-4 group hover:shadow-md transition-all duration-300">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
      <Icon className={`w-5.5 h-5.5 ${color}`} />
    </div>
    <div>
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-extrabold ${color} mt-0.5`}>{value}</p>
    </div>
  </div>
);

/* ─────────── Day Cell (calendar breakdown) ─────────── */
const DayCell = ({ day }) => {
  const s = getStatus(day.status);
  return (
    <div className={`flex flex-col items-center py-2.5 px-1 rounded-lg border transition-all duration-200 hover:scale-[1.04] hover:shadow-sm ${day.status === '-' || !day.status
        ? 'border-slate-100 dark:border-slate-700 bg-white dark:bg-dark-card'
        : `border-transparent ${s.bg}`
      }`}>
      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">{day.day}</span>
      <div className={`w-2 h-2 rounded-full ${s.dot}`} />
      <span className={`text-[9px] font-bold mt-1.5 ${s.text} leading-tight text-center`}>
        {day.status === '-' ? '' : day.status}
      </span>
    </div>
  );
};

/* ─────────── Legend Item ─────────── */
const LegendItem = ({ label, dotClass }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
  </div>
);

/* ═══════════════════════════════════════════ */
/*  MAIN COMPONENT                            */
/* ═══════════════════════════════════════════ */
const Reports = () => {
  const [reportType, setReportType] = useState('monthly');

  // Monthly State
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Daily State
  const [dailyData, setDailyData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [expandedEmpId, setExpandedEmpId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (reportType === 'monthly') {
      fetchMonthlyReport();
    } else {
      fetchDailyReport();
    }
  }, [reportType, selectedMonth, selectedYear]);

  const fetchMonthlyReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/monthly-report?month=${selectedMonth}&year=${selectedYear}`);
      if (res.data.success) {
        setMonthlyData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch monthly report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/daily-report`);
      if (res.data.success) {
        const { present, late, leave } = res.data.data;
        const formatted = [
          ...present.map(r => ({ ...r, employee: r.employee, displayStatus: 'Present' })),
          ...late.map(r => ({ ...r, employee: r.employee, displayStatus: 'Late' })),
          ...leave.map(r => ({ ...r, employee: r.employee, displayStatus: 'On Leave' }))
        ];
        setDailyData(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch daily report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleExportCSV = () => {
    if (reportType === 'monthly') {
      if (monthlyData.length === 0) return alert('No data to export!');

      const headers = ['Employee Name', 'Employee ID', 'Designation', 'Present Days', 'Late Days', 'Absent Days', 'Total Hours'];
      const csvRows = [headers.join(',')];

      monthlyData.forEach(emp => {
        const row = [
          `"${emp.firstName} ${emp.lastName}"`,
          `"${emp.employeeId}"`,
          `"${emp.designation || ''}"`,
          emp.presentDays,
          emp.lateDays,
          emp.absentDays !== undefined ? emp.absentDays : emp.leaveDays,
          emp.totalWorkingHours
        ];
        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `Monthly_Report_${MONTHS[selectedMonth - 1]}_${selectedYear}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } else {
      if (dailyData.length === 0) return alert('No data to export!');

      const headers = ['Employee Name', 'Employee ID', 'Designation', 'Status', 'Time'];
      const csvRows = [headers.join(',')];

      dailyData.forEach(record => {
        const timeStr = record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
        const row = [
          `"${record.employee?.firstName} ${record.employee?.lastName}"`,
          `"${record.employee?.employeeId}"`,
          `"${record.employee?.designation || ''}"`,
          `"${record.displayStatus}"`,
          `"${timeStr}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      const todayStr = new Date().toISOString().split('T')[0];
      a.setAttribute('download', `Daily_Report_${todayStr}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  /* ── Summary Calculations ── */
  const monthlySummary = useMemo(() => {
    if (!monthlyData.length) return { employees: 0, present: 0, late: 0, absent: 0, hours: 0 };
    return {
      employees: monthlyData.length,
      present: monthlyData.reduce((s, e) => s + (e.presentDays || 0), 0),
      late: monthlyData.reduce((s, e) => s + (e.lateDays || 0), 0),
      absent: monthlyData.reduce((s, e) => s + (e.absentDays !== undefined ? e.absentDays : e.leaveDays || 0), 0),
      hours: monthlyData.reduce((s, e) => s + (parseFloat(e.totalWorkingHours) || 0), 0).toFixed(1),
    };
  }, [monthlyData]);

  const dailySummary = useMemo(() => {
    const present = dailyData.filter(d => d.displayStatus === 'Present').length;
    const late = dailyData.filter(d => d.displayStatus === 'Late').length;
    const leave = dailyData.filter(d => d.displayStatus === 'On Leave').length;
    return { total: dailyData.length, present, late, leave };
  }, [dailyData]);

  /* ── Filtered Data ── */
  const filteredMonthly = useMemo(() => {
    if (!searchQuery.trim()) return monthlyData;
    const q = searchQuery.toLowerCase();
    return monthlyData.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.employeeId?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q)
    );
  }, [monthlyData, searchQuery]);

  const filteredDaily = useMemo(() => {
    if (!searchQuery.trim()) return dailyData;
    const q = searchQuery.toLowerCase();
    return dailyData.filter(r =>
      `${r.employee?.firstName} ${r.employee?.lastName}`.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.displayStatus?.toLowerCase().includes(q)
    );
  }, [dailyData, searchQuery]);

  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive attendance analytics and employee insights
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all shadow-sm shadow-primary-600/20 hover:shadow-md hover:shadow-primary-600/25"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* ── Report Type Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-card p-1 rounded-xl w-fit">
        <button
          onClick={() => { setReportType('monthly'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${reportType === 'monthly'
              ? 'bg-white dark:bg-dark-bg text-primary-600 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <Calendar className="w-4 h-4" />
          Monthly Report
        </button>
        <button
          onClick={() => { setReportType('daily'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${reportType === 'daily'
              ? 'bg-white dark:bg-dark-bg text-primary-600 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          Daily Report
        </button>
      </div>

      {/* ── Summary Stat Cards ── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {reportType === 'monthly' ? (
            <>
              <StatCard icon={Users} label="Employees" value={monthlySummary.employees} color="text-primary-600 dark:text-primary-400" iconBg="bg-primary-50 dark:bg-primary-900/30" />
              <StatCard icon={CheckCircle} label="Present Days" value={monthlySummary.present} color="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-900/30" />
              <StatCard icon={Clock} label="Late Days" value={monthlySummary.late} color="text-amber-600 dark:text-amber-400" iconBg="bg-amber-50 dark:bg-amber-900/30" />
              <StatCard icon={CalendarOff} label="Absent Days" value={monthlySummary.absent} color="text-rose-600 dark:text-rose-400" iconBg="bg-rose-50 dark:bg-rose-900/30" />
              <StatCard icon={Timer} label="Total Hours" value={`${monthlySummary.hours}h`} color="text-violet-600 dark:text-violet-400" iconBg="bg-violet-50 dark:bg-violet-900/30" />
            </>
          ) : (
            <>
              <StatCard icon={Users} label="Total" value={dailySummary.total} color="text-primary-600 dark:text-primary-400" iconBg="bg-primary-50 dark:bg-primary-900/30" />
              <StatCard icon={CheckCircle} label="Present" value={dailySummary.present} color="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-900/30" />
              <StatCard icon={Clock} label="Late" value={dailySummary.late} color="text-amber-600 dark:text-amber-400" iconBg="bg-amber-50 dark:bg-amber-900/30" />
              <StatCard icon={CalendarOff} label="On Leave" value={dailySummary.leave} color="text-rose-600 dark:text-rose-400" iconBg="bg-rose-50 dark:bg-rose-900/30" />
            </>
          )}
        </div>
      )}

      {/* ── Table Container ── */}
      <div className="card overflow-hidden">
        {/* ── Toolbar (Month Picker / Search) ── */}
        <div className="p-4 border-b border-slate-100 dark:border-dark-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-dark-bg/50">
          {reportType === 'monthly' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg">
                <FileText className="w-4 h-4 text-primary-600" />
                <span className="font-bold text-slate-800 dark:text-white text-sm">
                  {MONTHS[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
              <button
                onClick={handleNextMonth}
                disabled={isCurrentMonth}
                className="p-2 rounded-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span className="font-bold text-slate-800 dark:text-white text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg w-64 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          {reportType === 'monthly' ? (
            /* ────── MONTHLY TABLE ────── */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Present</div>
                  </th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Late</div>
                  </th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><CalendarOff className="w-3.5 h-3.5 text-rose-500" /> Absent</div>
                  </th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5 text-violet-500" /> Hours</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">Loading report data…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMonthly.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-600 dark:text-slate-300">No data found</p>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {searchQuery ? `No results for "${searchQuery}"` : `No records for ${MONTHS[selectedMonth - 1]} ${selectedYear}`}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMonthly.map((emp, idx) => {
                    const isExpanded = expandedEmpId === emp._id;
                    const absentVal = emp.absentDays !== undefined ? emp.absentDays : emp.leaveDays;
                    return (
                      <React.Fragment key={emp._id}>
                        <tr
                          className={`cursor-pointer transition-all duration-200 group ${isExpanded
                              ? 'bg-primary-50/60 dark:bg-primary-900/10'
                              : idx % 2 === 0
                                ? 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-dark-bg/40'
                                : 'bg-slate-50/40 dark:bg-dark-bg/20 hover:bg-slate-100/60 dark:hover:bg-dark-bg/50'
                            }`}
                          onClick={() => setExpandedEmpId(isExpanded ? null : emp._id)}
                        >
                          {/* Employee */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-primary-500/20">
                                {emp.firstName?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-white text-sm">{emp.firstName} {emp.lastName}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{emp.employeeId}</div>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-slate-300 ml-auto transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </td>
                          {/* Designation */}
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{emp.designation || '—'}</td>
                          {/* Present */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">
                              {emp.presentDays}
                            </span>
                          </td>
                          {/* Late */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg">
                              {emp.lateDays}
                            </span>
                          </td>
                          {/* Absent */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-lg">
                              {absentVal}
                            </span>
                          </td>
                          {/* Hours */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                              {emp.totalWorkingHours}<span className="text-slate-400 font-normal ml-0.5">hrs</span>
                            </span>
                          </td>
                        </tr>

                        {/* ── Expanded Daily Breakdown ── */}
                        {isExpanded && emp.dailyBreakdown && (
                          <tr className="bg-slate-50/70 dark:bg-dark-bg/30">
                            <td colSpan="6" className="px-6 py-5">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Daily Breakdown — {MONTHS[selectedMonth - 1]} {selectedYear}
                                  </p>
                                  <div className="flex items-center gap-4">
                                    <LegendItem label="Present" dotClass="bg-emerald-500" />
                                    <LegendItem label="Late" dotClass="bg-amber-500" />
                                    <LegendItem label="Half-Day" dotClass="bg-orange-500" />
                                    <LegendItem label="Absent / Leave" dotClass="bg-rose-500" />
                                    <LegendItem label="Weekend" dotClass="bg-slate-400" />
                                  </div>
                                </div>

                                {/* Weekday headers */}
                                <div className="grid grid-cols-7 gap-1.5">
                                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase pb-1">
                                      {d}
                                    </div>
                                  ))}
                                </div>

                                {/* Day grid */}
                                <div className="grid grid-cols-7 gap-1.5">
                                  {emp.dailyBreakdown.map((day, i) => (
                                    <DayCell key={i} day={day} />
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ────── DAILY TABLE ────── */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border">
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">Loading today's data…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDaily.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <CalendarOff className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-600 dark:text-slate-300">No records found</p>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {searchQuery ? `No results for "${searchQuery}"` : 'No attendance records for today.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDaily.map((record, index) => {
                    const statusStyle = record.displayStatus === 'Present'
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                      : record.displayStatus === 'Late'
                        ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20';

                    return (
                      <tr
                        key={index}
                        className={`transition-colors duration-150 ${index % 2 === 0
                            ? 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-dark-bg/40'
                            : 'bg-slate-50/40 dark:bg-dark-bg/20 hover:bg-slate-100/60 dark:hover:bg-dark-bg/50'
                          }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-primary-500/20">
                              {record.employee?.firstName?.charAt(0)?.toUpperCase() || 'E'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-white text-sm">
                                {record.employee?.firstName} {record.employee?.lastName}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{record.employee?.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {record.employee?.designation || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${statusStyle}`}>
                            {record.displayStatus === 'Present' && <CheckCircle className="w-3.5 h-3.5" />}
                            {record.displayStatus === 'Late' && <Clock className="w-3.5 h-3.5" />}
                            {record.displayStatus === 'On Leave' && <CalendarOff className="w-3.5 h-3.5" />}
                            {record.displayStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {record.checkIn?.time
                              ? new Date(record.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Table Footer ── */}
        {!loading && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-bg/30 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600 dark:text-slate-300">{reportType === 'monthly' ? filteredMonthly.length : filteredDaily.length}</span> of{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">{reportType === 'monthly' ? monthlyData.length : dailyData.length}</span> records
            </p>
            <p className="text-xs text-slate-400">
              {reportType === 'monthly'
                ? `${MONTHS[selectedMonth - 1]} ${selectedYear}`
                : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
