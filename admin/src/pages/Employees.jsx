import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/employees');
      setEmployees(res.data.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter(emp => 
    emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Employee Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your team members and their access.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees..."
              className="input-field pl-9 py-1.5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-800 dark:text-white">{filtered.length}</span> employees
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-dark-border text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-red-500 font-medium">Error: {errorMsg}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No employees found.</td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 font-bold">
                          {emp.firstName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{emp.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {emp.employeeId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium">
                        {emp.department?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {emp.isActive ? (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-rose-600 transition-colors ml-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination mock */}
        <div className="p-4 border-t border-slate-200 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <button className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300" disabled>
            Previous
          </button>
          <div className="text-sm text-slate-500 dark:text-slate-400">Page 1 of 1</div>
          <button className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300" disabled>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Employees;
