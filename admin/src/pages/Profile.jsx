import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { User, Mail, Shield, Key, Building, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

const Profile = () => {
  const { user, employee } = useSelector((state) => state.auth);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    
    try {
      setLoading(true);
      setMsg({ type: '', text: '' });
      const res = await api.put('/auth/password', { currentPassword, newPassword });
      if (res.data.success) {
        setMsg({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Admin Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary-500/30 mb-4 border-4 border-white dark:border-dark-card">
              {employee ? employee.firstName[0] : 'A'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {employee ? `${employee.firstName} ${employee.lastName}` : 'Admin User'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              {employee?.designation || 'System Administrator'}
            </p>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold mt-4">
              <CheckCircle className="w-3.5 h-3.5" />
              Active Account
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0f172a]/50">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Account Details</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Role</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{user?.role}</p>
                </div>
              </div>
              {employee?.department && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Department</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{employee.department?.name || 'Assigned'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Change Password</h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="p-5 space-y-5">
              {msg.text && (
                <div className={`p-3 rounded-lg text-sm font-medium ${
                  msg.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                }`}>
                  {msg.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter current password"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
