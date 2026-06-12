import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, CalendarOff } from 'lucide-react';
import api from '../services/api';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaves');
      setLeaves(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setProcessingId(id);
    try {
      await api.put(`/leaves/${id}/status`, {
        status,
        managerRemark: `Application ${status.toLowerCase()} by Admin`
      });
      // Refresh list
      fetchLeaves();
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update leave status');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = leaves.filter(leave => {
    const empName = `${leave.employee?.firstName} ${leave.employee?.lastName}`.toLowerCase();
    const type = leave.type.toLowerCase();
    const search = searchTerm.toLowerCase();
    return empName.includes(search) || type.includes(search);
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Rejected': return 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Leave Applications</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review and manage employee time-off requests.</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or type..."
              className="input-field pl-9 py-1.5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-800 dark:text-white">{filtered.length}</span> requests
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-dark-border text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Leave Type</th>
                <th className="px-6 py-4 font-medium">Dates</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-dark-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading requests...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <CalendarOff className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-500">No leave requests found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 font-bold">
                          {leave.employee?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">
                            {leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: {leave.employee?.employeeId || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                      {leave.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(leave.startDate).toLocaleDateString()} <br /> 
                      <span className="text-slate-400 text-xs">to</span> <br /> 
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={leave.reason}>
                      {leave.reason || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {leave.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleStatusUpdate(leave._id, 'Approved')}
                            disabled={processingId === leave._id}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(leave._id, 'Rejected')}
                            disabled={processingId === leave._id}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaves;
