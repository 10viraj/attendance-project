import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    gracePeriod: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    employeeIds: []
  });

  const fetchShiftsAndEmployees = async () => {
    try {
      setLoading(true);
      const [shiftsRes, empRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/employees')
      ]);
      setShifts(shiftsRes.data.data || []);
      setEmployees(empRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftsAndEmployees();
  }, []);

  const openModal = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        gracePeriod: shift.gracePeriod || 15,
        halfDayHours: shift.halfDayHours || 4,
        fullDayHours: shift.fullDayHours || 8,
        employeeIds: shift.employeeIds || []
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: '',
        startTime: '',
        endTime: '',
        gracePeriod: 15,
        halfDayHours: 4,
        fullDayHours: 8,
        employeeIds: []
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['gracePeriod', 'halfDayHours', 'fullDayHours'].includes(name) ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingShift) {
        await api.put(`/shifts/${editingShift._id}`, formData);
        toast.success('Shift updated successfully');
      } else {
        await api.post('/shifts', formData);
        toast.success('Shift created successfully');
      }
      closeModal();
      fetchShiftsAndEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save shift');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await api.delete(`/shifts/${id}`);
        toast.success('Shift deleted');
        fetchShiftsAndEmployees();
      } catch (err) {
        toast.error('Failed to delete shift');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-500" />
            Manage Shifts
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure and manage work schedules</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Shift
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-dark-border text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 font-medium">Shift Name</th>
                <th className="px-6 py-4 font-medium">Timings</th>
                <th className="px-6 py-4 font-medium">Grace Period</th>
                <th className="px-6 py-4 font-medium">Min Hours (Half/Full)</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No shifts configured.</td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 dark:text-white">{shift.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                        {shift.startTime} - {shift.endTime}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {shift.gracePeriod} mins
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {shift.halfDayHours}h / {shift.fullDayHours}h
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openModal(shift)}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shift._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800/60">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingShift ? 'Edit Shift' : 'Add New Shift'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Shift Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Morning Shift"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Grace Period (minutes)</label>
                <input
                  type="number"
                  name="gracePeriod"
                  value={formData.gracePeriod}
                  onChange={handleChange}
                  min="0"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Half Day Min Hrs</label>
                  <input
                    type="number"
                    name="halfDayHours"
                    value={formData.halfDayHours}
                    onChange={handleChange}
                    step="0.5"
                    min="0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Day Min Hrs</label>
                  <input
                    type="number"
                    name="fullDayHours"
                    value={formData.fullDayHours}
                    onChange={handleChange}
                    step="0.5"
                    min="0"
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Assign Employees</label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 p-2">
                  {employees.length === 0 ? (
                    <p className="text-sm text-slate-500 p-2">No employees found.</p>
                  ) : (
                    employees.map(emp => (
                      <label key={emp._id} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          checked={formData.employeeIds.includes(emp._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, employeeIds: [...prev.employeeIds, emp._id] }));
                            } else {
                              setFormData(prev => ({ ...prev, employeeIds: prev.employeeIds.filter(id => id !== emp._id) }));
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-800 dark:text-white">
                            {emp.firstName} {emp.lastName}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {emp.employeeId} • {emp.department?.name || 'No Dept'}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shifts;
