import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, CalendarOff, FileText, Settings, Calendar } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', path: '/employees', icon: Users },
  { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
  { name: 'Leaves', path: '/leaves', icon: CalendarOff },
  { name: 'Holidays', path: '/holidays', icon: Calendar },
  { name: 'Reports', path: '/reports', icon: FileText },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="font-bold text-lg text-slate-800 dark:text-white">SmartAttend</h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-dark-border">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
