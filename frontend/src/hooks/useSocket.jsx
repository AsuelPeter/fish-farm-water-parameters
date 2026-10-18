// ============================================================
// Socket.io Hook for Real-time Communication
// ------------------------------------------------------------
// In demo mode (no backend) a local simulation clock is started
// and simulated threshold alerts are surfaced as toast messages.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { isDemoMode, socketUrl } from '../services/api';
import { startClock, onAlert } from '../services/demo';

const SocketContext = createContext();

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (isDemoMode) {
            // Simulated always-on connection backed by the bundled dataset
            startClock();
            setConnected(true);
            const off = onAlert((alert) => {
                if (alert.severity === 'critical') {
                    toast.error(`CRITICAL: ${alert.message}`);
                } else {
                    toast.warning(`${alert.message}`);
                }
            });
            return off;
        }

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            setConnected(true);
            toast.success('Connected to server');
        });
        newSocket.on('disconnect', () => {
            setConnected(false);
            toast.error('Disconnected from server');
        });
        newSocket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });
        newSocket.on('new_alert', (alert) => {
            if (alert.severity === 'critical') {
                toast.error(`CRITICAL: ${alert.message}`);
            } else {
                toast.warning(`${alert.message}`);
            }
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    const emit = (event, data) => {
        if (socketRef.current) socketRef.current.emit(event, data);
    };

    const subscribe = (event, callback) => {
        if (isDemoMode) return () => {};
        if (socketRef.current) {
            socketRef.current.on(event, callback);
            return () => socketRef.current.off(event, callback);
        }
        return () => {};
    };

    return (
        <SocketContext.Provider value={{ socket, connected, emit, subscribe }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
