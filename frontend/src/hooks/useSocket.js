// ============================================================
// Socket.io Hook for Real-time Communication
// ============================================================

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected');
            setConnected(true);
            toast.success('Connected to server');
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setConnected(false);
            toast.error('Disconnected from server');
        });

        newSocket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });

        newSocket.on('new_alert', (alert) => {
            if (alert.severity === 'critical') {
                toast.error(`🚨 CRITICAL: ${alert.message}`);
            } else {
                toast.warning(`⚠️ ${alert.message}`);
            }
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    const emit = (event, data) => {
        if (socketRef.current) {
            socketRef.current.emit(event, data);
        }
    };

    const subscribe = (event, callback) => {
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
