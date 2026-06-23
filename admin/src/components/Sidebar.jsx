import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarX,
  CalendarHeart,
  FileText,
  Settings,
  Megaphone,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'People & Time',
    items: [
      { name: 'Employees', path: '/employees', icon: Users },
      { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
      { name: 'Leaves', path: '/leaves', icon: CalendarX },
      { name: 'Holidays', path: '/holidays', icon: CalendarHeart },
    ],
  },
  {
    label: 'Organize',
    items: [
      { name: 'Reports', path: '/reports', icon: FileText },
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
    ],
  },
];

const NavItem = ({ path, icon: Icon, children }) => (
  <NavLink
    to={path}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl font-medium text-sm transition-all duration-300 ease-out overflow-hidden ${
        isActive
          ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 text-indigo-700 dark:from-indigo-500/10 dark:to-indigo-500/5 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 border border-transparent'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] rounded-r-md transition-all duration-300" />
        )}
        <Icon 
          className={`w-[18px] h-[18px] transition-transform duration-300 ${
            isActive 
              ? 'text-indigo-600 dark:text-indigo-400 scale-110' 
              : 'text-slate-400 group-hover:text-indigo-500 group-hover:scale-110'
          }`} 
        />
        <span className="z-10">{children}</span>
        {isActive && (
          <div className="absolute inset-0 bg-indigo-400/5 dark:bg-indigo-400/10 rounded-xl" />
        )}
      </>
    )}
  </NavLink>
);

const Sidebar = () => {
  return (
    <aside className="w-72 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800/60 hidden md:flex flex-col shadow-xl shadow-slate-200/20 dark:shadow-none transition-colors duration-300 z-20">
      
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 gap-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <div className="flex flex-col">
          <h1 className="font-bold text-[17px] text-slate-800 dark:text-white tracking-tight leading-tight">
            SmartAttend
          </h1>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Workspace
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-6 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.name} path={item.path} icon={item.icon}>
                  {item.name}
                </NavItem>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Settings */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0f172a]/50">
        <NavItem path="/settings" icon={Settings}>
          Settings
        </NavItem>
      </div>

    </aside>
  );
};

export default Sidebar;