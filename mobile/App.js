import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './global.css';

// Import Screens (we'll create these next)
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import AdminTabNavigator from './src/navigation/AdminTabNavigator';
import AdminEmployeeDetailScreen from './src/screens/admin/AdminEmployeeDetailScreen';
import AdminDailyReportScreen from './src/screens/admin/AdminDailyReportScreen';
import AdminMonthlyReportScreen from './src/screens/admin/AdminMonthlyReportScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import HolidayScreen from './src/screens/HolidayScreen';
import DocumentVaultScreen from './src/screens/DocumentVaultScreen';

import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { startOfflineSyncListener } from './src/utils/offlineSync';
import { startGeofencing } from './src/utils/geofencing';

LogBox.ignoreLogs([
  'Background location is limited in Expo Go',
  'Push notifications are not supported or loaded in Expo Go',
  'DateTimePicker: `onChange` is deprecated'
]);

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    startGeofencing();
    const unsubscribe = startOfflineSyncListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="AdminMain" component={AdminTabNavigator} />
          <Stack.Screen name="AdminEmployeeDetail" component={AdminEmployeeDetailScreen} />
          <Stack.Screen name="AdminDailyReport" component={AdminDailyReportScreen} />
          <Stack.Screen name="AdminMonthlyReport" component={AdminMonthlyReportScreen} />
          <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
          <Stack.Screen name="HolidayCalendar" component={HolidayScreen} />
          <Stack.Screen name="DocumentVault" component={DocumentVaultScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
