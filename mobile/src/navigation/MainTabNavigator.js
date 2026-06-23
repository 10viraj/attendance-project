import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { HomeIcon, CameraIcon, CalendarIcon, UserIcon } from 'react-native-heroicons/outline';
import { HomeIcon as HomeSolid, CameraIcon as CameraSolid, CalendarIcon as CalendarSolid, UserIcon as UserSolid } from 'react-native-heroicons/solid';

import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const getIcon = (route, focused, color, size) => {
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
};

const screens = [
  { name: 'Dashboard', component: DashboardScreen, label: 'Dashboard' },
  { name: 'Attendance', component: AttendanceScreen, label: 'Attendance' },
  { name: 'Leave', component: LeaveScreen, label: 'Leave' },
  { name: 'Profile', component: ProfileScreen, label: 'Profile' }
];

const MainTabNavigator = () => {
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

export default MainTabNavigator;
