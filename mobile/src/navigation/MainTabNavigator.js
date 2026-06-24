import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { HomeIcon, UserIcon, CalendarDaysIcon, PaperAirplaneIcon } from 'react-native-heroicons/outline';
import { HomeIcon as HomeSolid, UserIcon as UserSolid, CalendarDaysIcon as CalendarDaysSolid, PaperAirplaneIcon as PaperAirplaneSolid } from 'react-native-heroicons/solid';

import DashboardScreen from '../screens/DashboardScreen';
import HolidayScreen from '../screens/HolidayScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const getIcon = (route, focused, color, size) => {
  let Icon;
  if (route.name === 'Home') {
    Icon = focused ? HomeSolid : HomeIcon;
  } else if (route.name === 'Holidays') {
    Icon = focused ? CalendarDaysSolid : CalendarDaysIcon;
  } else if (route.name === 'Leave') {
    Icon = focused ? PaperAirplaneSolid : PaperAirplaneIcon;
  } else if (route.name === 'Profile') {
    Icon = focused ? UserSolid : UserIcon;
  }
  return <Icon color={color} size={size} />;
};

const screens = [
  { name: 'Home', component: DashboardScreen, label: 'Home' },
  { name: 'Holidays', component: HolidayScreen, label: 'Holidays' },
  { name: 'Leave', component: LeaveScreen, label: 'Leaves' },
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
        tabBarActiveTintColor: '#0F172A', // darker active color to match the mockup
        tabBarInactiveTintColor: '#94A3B8', // lighter inactive color
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9', 
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          backgroundColor: '#ffffff'
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
