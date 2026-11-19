import { useState, useEffect } from 'react';
import { Users, Clock, UserCheck, CalendarOff, Building2, Search, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendancePercentage: 0,
    trendData: [],
    deptData: [],
    employees: []
  });

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    try {
      const res = await api.get('/organization');
      if (res.data?.success && res.data.data) {
        setOrganizations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch organizations', err);
    }
  };

  const fetchAnalytics = async (orgId = selectedOrg) => {
    setLoading(true);
    try {
      const url = orgId && orgId !== 'all' ? `/analytics?organization=${orgId}` : '/analytics';
      const res = await api.get(url);
      setStats({
        ...res.data.data,
        trendData: res.data.data.trendData || [],
        deptData: res.data.data.deptData || [],
        employees: res.data.data.employees || []
      });
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchAnalytics(selectedOrg);

    const handleAttendanceUpdate = (data) => {
      toast.success(data.message, { icon: '👏' });
      fetchAnalytics(selectedOrg);
    };

    socket.on('attendanceUpdate', handleAttendanceUpdate);

    return () => {
      socket.off('attendanceUpdate', handleAttendanceUpdate);
    };
  }, [selectedOrg]);

  const handleOrgChange = (orgId) => {
    setSelectedOrg(orgId);
    fetchAnalytics(orgId);
  };

  const filteredEmployees = (stats.employees || []).filter(emp => {
    if (!searchEmployee.trim()) return true;
    const q = searchEmployee.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.todayStatus?.toLowerCase().includes(q)
    );
  });

  const selectedOrgName = selectedOrg === 'all'
    ? 'All Organizations'
    : (organizations.find(o => o._id === selectedOrg)?.name || 'Selected Organization');

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="card p-6 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{loading ? '-' : value}</h3>
        {trend && (
          <p className="text-sm mt-2 flex items-center text-emerald-600">
            <span className="font-medium">{trend}</span>
            <span className="text-slate-400 ml-2">vs last week</span>
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Organization Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Viewing metrics for: <span className="font-semibold text-primary-600 dark:text-primary-400">{selectedOrgName}</span>
          </p>
        </div>

        {/* Organization Filter Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-sm">
            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-2 shrink-0" />
            <select
              value={selectedOrg}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-white outline-none cursor-pointer pr-4"
            >
              <option value="all">🏢 All Organizations</option>
              {organizations.map(org => (
                <option key={org._id} value={org._id}>
                  🏢 {org.name}
                </option>
              ))}
            </select>
          </div>

          <Link to="/reports" className="btn-primary text-sm px-4 py-2">
            Monthly Report
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total Employees" 
          value={stats.totalEmployees} 
          icon={Users} 
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" 
          trend="+2.5%"
        />
        <StatCard 
          title="Present Today" 
          value={stats.presentToday} 
          icon={UserCheck} 
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
          trend="+5%"
        />
        <StatCard 
          title="Late Arrivals" 
          value={stats.lateToday} 
          icon={Clock} 
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" 
        />
        <StatCard 
          title="On Leave" 
          value={stats.absentToday} 
          icon={CalendarOff} 
          color="bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" 
        />
      </div>

      {/* Overall Attendance Summary Banner */}
      <div className="card p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider">Overall Attendance Today</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-4xl font-extrabold">{stats.attendancePercentage}%</h2>
            <span className="text-blue-100 text-sm">
              ({stats.presentToday} of {stats.totalEmployees} present)
            </span>
          </div>
          <p className="text-blue-100/90 text-sm mt-2">
            {Number(stats.attendancePercentage) >= 50
              ? 'Great attendance rate! Most of the team is working today.'
              : 'Attendance is currently low. Review the employee list below.'}
          </p>
        </div>
        <div className="w-full md:w-64 bg-white/20 rounded-full h-3.5 overflow-hidden">
          <div 
            className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.max(0, Number(stats.attendancePercentage)))}%` }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trend Chart */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Attendance Trends (Last 5 Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="present" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Employees by Department</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.deptData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} width={80} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Attendance Table */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {selectedOrg === 'all' ? 'All Employees' : `${selectedOrgName} Employees`}
              </h3>
              <span className="bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {filteredEmployees.length} total
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live attendance status & details for today
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, ID, or dept..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="input-field pl-9 pr-3 py-1.5 text-sm w-64"
              />
            </div>

            <Link
              to="/employees"
              className="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1"
            >
              Manage Employees <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Department</th>
                {selectedOrg === 'all' && <th className="py-3 px-4">Organization</th>}
                <th className="py-3 px-4">Today's Status</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={selectedOrg === 'all' ? 7 : 6} className="text-center py-8 text-slate-400">
                    No employees found for this organization.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isPresent = emp.todayStatus === 'Present';
                  const isLate = emp.todayStatus === 'Late';
                  const isHalfDay = emp.todayStatus === 'Half-Day';
                  const isLeave = emp.todayStatus === 'On Leave';

                  return (
                    <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                            {emp.firstName?.[0] || emp.name?.[0] || 'E'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-white block">{emp.name}</span>
                            <span className="text-xs text-slate-400">{emp.designation}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {emp.employeeId}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {emp.department}
                      </td>
                      {selectedOrg === 'all' && (
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {emp.organization}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isPresent ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          isLate ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          isHalfDay ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          isLeave ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          ● {emp.todayStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                        {emp.checkInTime ? new Date(emp.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/employees/${emp._id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-xs"
                        >
                          View Profile →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
