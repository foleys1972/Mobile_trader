import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const { token, user } = useAuthStore();
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connectSocket = useCallback(() => {
    if (socket && socket.connected) {
      return;
    }

    try {
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: {
          token,
          userId: user?.id,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not manually disconnected
        if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to reconnect after multiple attempts');
          toast.error('Connection lost. Please refresh the page.');
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setError(error.message);
        setIsConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setError(error.message);
        toast.error('Connection error occurred');
      });

      // Authentication events
      newSocket.on('auth-success', (data) => {
        console.log('Authentication successful:', data);
        toast.success('Connected to intercom system');
      });

      newSocket.on('auth-error', (data) => {
        console.error('Authentication failed:', data);
        setError(data.message);
        toast.error('Authentication failed');
      });

      // Room events
      newSocket.on('room-joined', (data) => {
        console.log('Joined room:', data);
        toast.success(`Joined room: ${data.roomId}`);
      });

      newSocket.on('user-joined', (data) => {
        console.log('User joined:', data);
        toast.success(`${data.user.name} joined the room`);
      });

      newSocket.on('user-left', (data) => {
        console.log('User left:', data);
        toast.info(`${data.userId} left the room`);
      });

      newSocket.on('user-speaking', (data) => {
        console.log('User speaking:', data);
      });

      newSocket.on('user-stopped-speaking', (data) => {
        console.log('User stopped speaking:', data);
      });

      newSocket.on('user-mute-changed', (data) => {
        console.log('User mute changed:', data);
      });

      // Recording events
      newSocket.on('recording-started', (data) => {
        console.log('Recording started:', data);
        toast.success('Recording started');
      });

      newSocket.on('recording-stopped', (data) => {
        console.log('Recording stopped:', data);
        toast.info('Recording stopped');
      });

      // Broadcast events
      newSocket.on('broadcast-message', (data) => {
        console.log('Broadcast message:', data);
        toast.success(`Broadcast: ${data.message}`, {
          duration: 5000,
          position: 'top-center',
        });
      });

      // Error events
      newSocket.on('error', (data) => {
        console.error('Socket error:', data);
        toast.error(data.message || 'An error occurred');
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      setError(error.message);
      toast.error('Failed to connect to server');
    }
  }, [token, user]);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
  }, [socket]);

  const emit = useCallback((event, data) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
      toast.error('Not connected to server');
    }
  }, [socket]);

  const on = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  const off = useCallback((event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  }, [socket]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (token && user && !socket) {
      connectSocket();
    }
  }, [token, user, socket, connectSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  return {
    socket,
    isConnected,
    error,
    connectSocket,
    disconnectSocket,
    emit,
    on,
    off,
  };
};
