import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeIcon, CameraIcon, CalendarIcon, UserIcon } from 'react-native-heroicons/outline';
import { HomeIcon as HomeSolid, CameraIcon as CameraSolid, CalendarIcon as CalendarSolid, UserIcon as UserSolid } from 'react-native-heroicons/solid';

import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let Icon;

          if (route.name === 'Dashboard') {
            Icon = focused ? HomeSolid : HomeIcon;
          } else if (route.name === 'Attendance') {
            Icon = focused ? CameraSolid : CameraIcon;
          } else if (route.name === 'Leave') {
            Icon = focused ? CalendarSolid : CalendarIcon;
          } else if (route.name === 'Profile') {
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
