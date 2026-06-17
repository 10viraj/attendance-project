import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeIcon, UsersIcon, UserIcon, CalendarDaysIcon, CalendarIcon } from 'react-native-heroicons/outline';
import { HomeIcon as HomeSolid, UsersIcon as UsersSolid, UserIcon as UserSolid, CalendarDaysIcon as CalendarDaysSolid, CalendarIcon as CalendarSolid } from 'react-native-heroicons/solid';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminEmployeesScreen from '../screens/admin/AdminEmployeesScreen';
import AdminLeavesScreen from '../screens/admin/AdminLeavesScreen';
import AdminHolidaysScreen from '../screens/admin/AdminHolidaysScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminMonthlyReportScreen from '../screens/admin/AdminMonthlyReportScreen';
import { ChartBarIcon } from 'react-native-heroicons/outline';
import { ChartBarIcon as ChartBarSolid } from 'react-native-heroicons/solid';

const Tab = createBottomTabNavigator();

const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
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
        },
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
      <Tab.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen} 
        options={{ tabBarLabel: 'Dashboard' }} 
      />
      <Tab.Screen 
        name="AdminEmployees" 
        component={AdminEmployeesScreen} 
        options={{ tabBarLabel: 'Employees' }} 
      />
      <Tab.Screen 
        name="AdminLeaves" 
        component={AdminLeavesScreen} 
        options={{ tabBarLabel: 'Leaves' }} 
      />
      <Tab.Screen 
        name="AdminHolidays" 
        component={AdminHolidaysScreen} 
        options={{ tabBarLabel: 'Holidays' }} 
      />
      <Tab.Screen 
        name="AdminMonthlyReport" 
        component={AdminMonthlyReportScreen} 
        options={{ tabBarLabel: 'Reports' }} 
      />
      <Tab.Screen 
        name="AdminProfile" 
        component={AdminProfileScreen} 
        options={{ tabBarLabel: 'Profile' }} 
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
