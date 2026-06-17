import { useState, useEffect } from 'react';
import { Search, Calendar, Plus } from 'lucide-react';
import api from '../services/api';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'Company',
    description: ''
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await api.get('/holidays');
      setHolidays(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      await api.post('/holidays', formData);
      setShowModal(false);
      setFormData({ name: '', date: '', type: 'Company', description: '' });
      fetchHolidays();
    } catch (error) {
      console.error('Failed to add holiday', error);
      alert('Failed to add holiday');
    }
  };

  const filtered = holidays.filter(holiday => {
    return holiday.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Company Holidays</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage public and company holidays.</p>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search holidays..."
              className="input-field pl-9 py-1.5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-800 dark:text-white">{filtered.length}</span> holidays
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-dark-border text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 font-medium">Holiday Name</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading holidays...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-500">No holidays found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((holiday) => (
                  <tr key={holiday._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">
                      {holiday.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {holiday.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {holiday.description || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-dark-border">
            <div className="p-6 border-b border-slate-200 dark:border-dark-border">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Add New Holiday</h2>
            </div>
            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Independence Day"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select
                  className="input-field"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Company">Company</option>
                  <option value="Regional">Regional</option>
                  <option value="Festival">Festival</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  className="input-field"
                  rows="3"
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holidays;
