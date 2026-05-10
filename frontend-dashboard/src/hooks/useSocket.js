import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [metricsHistory, setMetricsHistory] = useState([]);

  useEffect(() => {
    const socket = io(ANALYTICS_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    socket.on('metrics:update', (data) => {
      setMetrics(data);
      setMetricsHistory(prev => {
        const next = [...prev, { ...data, time: new Date().toLocaleTimeString() }];
        return next.slice(-60); // Keep 60 data points
      });
    });

    socket.on('metrics:snapshot', (data) => {
      setMetrics(data);
      setMetricsHistory(prev => {
        const next = [...prev, { ...data, time: new Date().toLocaleTimeString() }];
        return next.slice(-60);
      });
    });

    socket.on('logs:new', (events) => {
      setRecentLogs(prev => [...events, ...prev].slice(0, 200));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { connected, metrics, metricsHistory, recentLogs, emit };
}
