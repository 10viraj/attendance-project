import { io } from 'socket.io-client';

const defaultSocketURL = (typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173'))
  ? 'http://localhost:5000'
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : defaultSocketURL;

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
