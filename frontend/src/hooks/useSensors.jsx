// ============================================================
// Sensor Data Hook
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { isDemoMode } from '../services/api';
import { onUpdate } from '../services/demo';

const SensorContext = createContext();

export function SensorProvider({ children, pondId }) {
    const [sensorData, setSensorData] = useState(null);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const fetchHistory = useCallback(async (period = '24h') => {
        try {
            const response = await api.get(`/sensors/history?pondId=${pondId}&period=${period}`);
            setHistory(response.data.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    }, [pondId]);

    const fetchStats = useCallback(async (period = '24h') => {
        try {
            const response = await api.get(`/sensors/stats?pondId=${pondId}&period=${period}`);
            setStats(response.data.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, [pondId]);

    useEffect(() => {
        setLoading(true);
        fetchLatest();
        fetchHistory('24h');
        fetchStats('24h');

        const interval = setInterval(fetchLatest, isDemoMode ? 5000 : 5000);
        return () => clearInterval(interval);
    }, [fetchLatest, fetchHistory, fetchStats]);

    // Live updates from the simulation clock (demo mode)
    useEffect(() => {
        if (!isDemoMode) return () => {};
        return onUpdate(() => {
            fetchLatest();
        });
    }, [fetchLatest]);

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
