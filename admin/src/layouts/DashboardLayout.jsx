import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
  const { user } = useSelector((state) => state.auth);

  // Example role guard:
  if (user && user.role === 'Employee') {
    return <Navigate to="/login" replace />; // Employees shouldn't access admin
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-200 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
