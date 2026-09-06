// ============================================================
// API Service
// ============================================================

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

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
