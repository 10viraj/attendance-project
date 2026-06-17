import React, { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, FileText, CheckCircle, Clock, CalendarOff } from 'lucide-react';
import api from '../services/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Reports = () => {
  const [reportType, setReportType] = useState('monthly'); // 'monthly' | 'daily'
  
  // Monthly State
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Daily State
  const [dailyData, setDailyData] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [expandedEmpId, setExpandedEmpId] = useState(null);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Overview of employee attendance and leaves
          </p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-dark-border">
        <button
          onClick={() => setReportType('monthly')}
          className={`pb-3 font-medium text-sm transition-colors border-b-2 ${
            reportType === 'monthly'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Monthly Report
        </button>
        <button
          onClick={() => setReportType('daily')}
          className={`pb-3 font-medium text-sm transition-colors border-b-2 ${
            reportType === 'daily'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Daily Report (Today)
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden">
        
        {/* Header / Month Picker for Monthly Report */}
        {reportType === 'monthly' && (
          <div className="p-4 border-b border-slate-200 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-dark-bg">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </h2>
            </div>

            <button 
              onClick={handleNextMonth}
              disabled={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {reportType === 'monthly' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-bg/50 border-b border-slate-200 dark:border-dark-border">
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Employee</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Designation</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Present</div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> Late</div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5"><CalendarOff className="w-4 h-4 text-rose-500" /> Absent</div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      Loading report data...
                    </td>
                  </tr>
                ) : monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      No data found for {MONTHS[selectedMonth - 1]} {selectedYear}
                    </td>
                  </tr>
                ) : (
                  monthlyData.map((emp) => (
                    <React.Fragment key={emp._id}>
                      <tr 
                        className={`cursor-pointer transition-colors ${expandedEmpId === emp._id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-dark-bg/50'}`}
                        onClick={() => setExpandedEmpId(expandedEmpId === emp._id ? null : emp._id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                              {emp.firstName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-white">{emp.firstName} {emp.lastName}</div>
                              <div className="text-xs text-slate-500">{emp.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{emp.designation || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">{emp.presentDays}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">{emp.lateDays}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                          {emp.absentDays !== undefined ? emp.absentDays : emp.leaveDays}
                        </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">{emp.totalWorkingHours} hrs</td>
                      </tr>
                      {expandedEmpId === emp._id && (
                        <tr className="bg-slate-50/50 dark:bg-dark-bg/30">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="grid grid-cols-7 gap-2">
                              {emp.dailyBreakdown?.map((day, idx) => (
                                <div key={idx} className="flex flex-col items-center p-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg shadow-sm">
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{day.day}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    day.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                                    day.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                                    day.status === 'Half-Day' ? 'bg-orange-100 text-orange-700' :
                                    day.status === 'On Leave' ? 'bg-rose-100 text-rose-700' :
                                    day.status === 'Weekend' ? 'bg-slate-100 text-slate-600' :
                                    day.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-50 text-slate-400'
                                  }`}>
                                    {day.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-bg/50 border-b border-slate-200 dark:border-dark-border">
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Employee</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Designation</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      Loading report data...
                    </td>
                  </tr>
                ) : dailyData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      No attendance records found for today.
                    </td>
                  </tr>
                ) : (
                  dailyData.map((record, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-dark-bg/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                            {record.employee?.firstName?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-white">
                              {record.employee?.firstName} {record.employee?.lastName}
                            </div>
                            <div className="text-xs text-slate-500">{record.employee?.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{record.employee?.designation || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold px-2.5 py-1 rounded-lg ${
                          record.displayStatus === 'Present' ? 'text-emerald-600 bg-emerald-50' :
                          record.displayStatus === 'Late' ? 'text-amber-600 bg-amber-50' :
                          'text-rose-600 bg-rose-50'
                        }`}>
                          {record.displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                        {record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
