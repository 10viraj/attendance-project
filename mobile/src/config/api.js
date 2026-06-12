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

export default api;
