// ============================================================
// API Service
// ------------------------------------------------------------
// When VITE_DEMO_MODE is not 'false' (default) the dashboard runs
// against the bundled two-week simulation so the app is fully
// functional without a backend (e.g. on Vercel). Set
// VITE_DEMO_MODE=false and VITE_API_URL to use the live backend.
// ============================================================

import axios from 'axios';
import demoApi from './demo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const USE_DEMO = (import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false';

const realApi = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

realApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

realApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

const api = USE_DEMO ? demoApi : realApi;

export const isDemoMode = USE_DEMO;
export const socketUrl = SOCKET_URL;

// Sensor API
export const sensorAPI = {
    getLatest: (pondId) => api.get(`/sensors/latest?pondId=${pondId}`),
    getHistory: (pondId, period) => api.get(`/sensors/history?pondId=${pondId}&period=${period}`),
    getStats: (pondId, period) => api.get(`/sensors/stats?pondId=${pondId}&period=${period}`),
    getAll: (params) => api.get('/sensors', { params }),
};

// Actuator API
export const actuatorAPI = {
    sendCommand: (deviceId, action, params = {}) =>
        api.post('/actuators/command', { deviceId, action, params }),
    updateThresholds: (deviceId, thresholds) =>
        api.post('/actuators/thresholds', { deviceId, thresholds }),
};

// Alert API
export const alertAPI = {
    getAll: (params) => api.get('/alerts', { params }),
    getUnacknowledged: () => api.get('/alerts/unacknowledged'),
    getStats: (pondId, period) => api.get(`/alerts/stats?pondId=${pondId}&period=${period}`),
    acknowledge: (id) => api.put(`/alerts/${id}/acknowledge`),
    acknowledgeAll: () => api.put('/alerts/acknowledge-all'),
};

// Auth API
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
};

// Dashboard API
export const dashboardAPI = {
    getOverview: () => api.get('/dashboard/overview'),
    getCharts: (pondId, period) => api.get(`/dashboard/charts?pondId=${pondId}&period=${period}`),
    getPonds: () => api.get('/dashboard/ponds'),
};

export default api;
