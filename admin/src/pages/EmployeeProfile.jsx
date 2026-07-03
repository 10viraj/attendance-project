import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, User, Mail, Phone, Briefcase, 
  Building, Clock, Shield, CheckCircle, XCircle 
} from 'lucide-react';
import api from '../services/api';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    designation: '',
    department: '',
    shift: '',
    isActive: true,
    password: '',
  });

  // Read-only fields
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [empRes, deptRes, shiftRes] = await Promise.all([
        api.get(`/employees/${id}`),
        api.get('/departments').catch(() => ({ data: { data: [] } })),
        api.get('/shifts').catch(() => ({ data: { data: [] } }))
      ]);
      
      const emp = empRes.data.data;
      
      setFormData({
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        phone: emp.phone || '',
        designation: emp.designation || '',
        department: emp.department?._id || emp.department || '',
        shift: emp.shift?._id || emp.shift || '',
        isActive: emp.isActive !== undefined ? emp.isActive : true,
        password: '', // Reset on load
      });

      setEmployeeId(emp.employeeId);
      if (emp.user) {
        setEmail(emp.user.email);
        setRole(emp.user.role);
      }

      setDepartments(deptRes.data?.data || []);
      setShifts(shiftRes.data?.data || []);
      
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to load employee data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg({ type: '', text: '' });
      
      await api.put(`/employees/${id}`, formData);
      
      setMsg({ type: 'success', text: 'Employee details updated successfully!' });
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update employee.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/employees')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Edit Employee Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Update details and access for this team member.</p>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          msg.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        }`}>
          {msg.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Readonly Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary-500/30 mb-4 border-4 border-white dark:border-dark-card">
              {formData.firstName?.[0] || 'E'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {formData.firstName} {formData.lastName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              {employeeId}
            </p>
            
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mt-4 ${
              formData.isActive 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
            }`}>
              {formData.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {formData.isActive ? 'Active Account' : 'Inactive Account'}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Account Credentials</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">System Role</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{role || 'Employee'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Editable Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card divide-y divide-slate-100 dark:divide-slate-800/60">
            
            {/* Personal Details */}
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Personal Details</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" /> Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            {/* Employment Details */}
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Employment Details</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" /> Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Account Status</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Allow this employee to log in and use the system.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="isActive"
                    className="sr-only peer"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/50">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" /> Reset Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter a new password (leave blank to keep current)"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
