import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

export const SOCKET_URL = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export const createSocket = (options = {}) => {
  return io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    ...options
  });
};

export default createSocket;
