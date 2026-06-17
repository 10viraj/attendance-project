import axios from 'axios';

// The local IP address where your backend is running.
// 192.168.1.4 is your current local IP, and 5000 is the backend port.
export const API_URL = 'http://192.168.1.4:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const { Alert } = require('react-native');
      
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      await AsyncStorage.removeItem('employeeInfo');
      
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [{ text: 'OK' }]
      );
    }
    return Promise.reject(error);
  }
);

export default api;
