import { io } from 'socket.io-client';
import { API_URL } from './api';

// Derive the base socket URL from API_URL (e.g. 'http://192.168.1.4:5000')
const SOCKET_URL = API_URL.replace(/\/api$/, '');

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
