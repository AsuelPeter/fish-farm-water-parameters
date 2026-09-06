// ============================================================
// Sensor Data Hook
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from './useSocket';

const SensorContext = createContext();

export function SensorProvider({ children, pondId }) {
    const [sensorData, setSensorData] = useState(null);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { subscribe } = useSocket();

    // Fetch latest sensor data
    const fetchLatest = useCallback(async () => {
        try {
            const response = await api.get(`/sensors/latest?pondId=${pondId}`);
            setSensorData(response.data.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch sensor data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pondId]);

    // Fetch historical data
    const fetchHistory = useCallback(async (period = '24h') => {
        try {
            const response = await api.get(`/sensors/history?pondId=${pondId}&period=${period}`);
            setHistory(response.data.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    }, [pondId]);

    // Fetch statistics
    const fetchStats = useCallback(async (period = '24h') => {
        try {
            const response = await api.get(`/sensors/stats?pondId=${pondId}&period=${period}`);
            setStats(response.data.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, [pondId]);

    // Subscribe to real-time updates
    useEffect(() => {
        fetchLatest();
        fetchHistory();
        fetchStats();

        const interval = setInterval(fetchLatest, 5000);
        return () => clearInterval(interval);
    }, [fetchLatest, fetchHistory, fetchStats]);

    // Real-time updates via socket
    useEffect(() => {
        const unsubscribe = subscribe('sensor_data', (data) => {
            setSensorData(data);
        });
        return unsubscribe;
    }, [subscribe]);

    return (
        <SensorContext.Provider value={{
            sensorData,
            history,
            stats,
            loading,
            error,
            fetchLatest,
            fetchHistory,
            fetchStats
        }}>
            {children}
        </SensorContext.Provider>
    );
}

export function useSensors() {
    const context = useContext(SensorContext);
    if (!context) {
        throw new Error('useSensors must be used within a SensorProvider');
    }
    return context;
}
