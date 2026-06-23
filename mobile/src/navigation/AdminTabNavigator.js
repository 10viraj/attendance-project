import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { HomeIcon, UsersIcon, UserIcon, CalendarDaysIcon, CalendarIcon, ChartBarIcon } from 'react-native-heroicons/outline';
import { HomeIcon as HomeSolid, UsersIcon as UsersSolid, UserIcon as UserSolid, CalendarDaysIcon as CalendarDaysSolid, CalendarIcon as CalendarSolid, ChartBarIcon as ChartBarSolid } from 'react-native-heroicons/solid';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminEmployeesScreen from '../screens/admin/AdminEmployeesScreen';
import AdminLeavesScreen from '../screens/admin/AdminLeavesScreen';
import AdminHolidaysScreen from '../screens/admin/AdminHolidaysScreen';
import AdminMonthlyReportScreen from '../screens/admin/AdminMonthlyReportScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const getIcon = (route, focused, color, size) => {
  let Icon;
  if (route.name === 'AdminDashboard') {
    Icon = focused ? HomeSolid : HomeIcon;
  } else if (route.name === 'AdminEmployees') {
    Icon = focused ? UsersSolid : UsersIcon;
  } else if (route.name === 'AdminLeaves') {
    Icon = focused ? CalendarDaysSolid : CalendarDaysIcon;
  } else if (route.name === 'AdminHolidays') {
    Icon = focused ? CalendarSolid : CalendarIcon;
  } else if (route.name === 'AdminMonthlyReport') {
    Icon = focused ? ChartBarSolid : ChartBarIcon;
  } else if (route.name === 'AdminProfile') {
    Icon = focused ? UserSolid : UserIcon;
  }
  return <Icon color={color} size={size} />;
};

const screens = [
  { name: 'AdminDashboard', component: AdminDashboardScreen, label: 'Dashboard' },
  { name: 'AdminEmployees', component: AdminEmployeesScreen, label: 'Employees' },
  { name: 'AdminLeaves', component: AdminLeavesScreen, label: 'Leaves' },
  { name: 'AdminHolidays', component: AdminHolidaysScreen, label: 'Holidays' },
  { name: 'AdminMonthlyReport', component: AdminMonthlyReportScreen, label: 'Reports' },
  { name: 'AdminProfile', component: AdminProfileScreen, label: 'Profile' }
];

const AdminTabNavigator = () => {
  if (Platform.OS === 'web') {
    return (
      <Drawer.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          drawerIcon: ({ focused, color, size }) => getIcon(route, focused, color, size),
          drawerActiveTintColor: '#2563eb', // primary-600
          drawerInactiveTintColor: '#64748b', // slate-500
          drawerType: 'permanent',
          drawerStyle: {
            width: 260,
            borderRightWidth: 1,
            borderRightColor: '#e2e8f0', // slate-200
            backgroundColor: '#ffffff',
          },
        })}
      >
        {screens.map(screen => (
          <Drawer.Screen 
            key={screen.name}
            name={screen.name} 
            component={screen.component} 
            options={{ drawerLabel: screen.label }} 
          />
        ))}
      </Drawer.Navigator>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => getIcon(route, focused, color, size),
        tabBarActiveTintColor: '#2563eb', // primary-600
        tabBarInactiveTintColor: '#64748b', // slate-500
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0', // slate-200
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      {screens.map(screen => (
        <Tab.Screen 
          key={screen.name}
          name={screen.name} 
          component={screen.component} 
          options={{ tabBarLabel: screen.label }} 
        />
      ))}
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
