// ============================================================
// Dashboard Page
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Paper,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Water as WaterIcon,
    Thermostat as TempIcon,
    Science as PHIcon,
    Air as DOIcon,
    Opacity as TurbidityIcon,
    DeviceHub as DeviceIcon,
    Warning as WarningIcon,
    TrendingUp,
    Refresh,
} from '@mui/icons-material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { useSensors } from '../hooks/useSensors';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { meta } from '../services/demo';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, ChartTooltip, Legend, Filler
);

// Sensor Card Component
function SensorCard({ title, value, unit, icon, status, color, min, max }) {
    const getStatusColor = () => {
        if (value === null || value === undefined) return 'default';
        if (value < min || value > max) return 'error';
        return 'success';
    };

    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color={getStatusColor()}>
                            {value !== null && value !== undefined ? value.toFixed(2) : '--'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {unit}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: `${color}.light`,
                            color: `${color}.dark`,
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        size="small"
                        label={status}
                        color={getStatusColor()}
                        variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                        Range: {min} - {max} {unit}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

// Time Series Chart Component
function TimeSeriesChart({ data, title, dataKeys, colors }) {
    const chartData = {
        labels: data.map(d => new Date(d._id).toLocaleString([], { hour: '2-digit', minute: '2-digit' })),
        datasets: dataKeys.map((key, i) => ({
            label: key.label,
            data: data.map(d => d[key.field]),
            borderColor: colors[i],
            backgroundColor: `${colors[i]}20`,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
            yAxisID: key.axis || 'y',
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: title, font: { size: 14, weight: '600' } },
        },
        scales: {
            x: { grid: { display: false } },
            y: {
                type: 'linear', position: 'left',
                title: { display: true, text: 'pH / DO (mg/L)' },
                grid: { color: 'rgba(0,0,0,0.05)' },
            },
            y1: {
                type: 'linear', position: 'right',
                title: { display: true, text: 'Temperature (°C)' },
                grid: { drawOnChartArea: false },
            },
        },
        interaction: { intersect: false, mode: 'index' },
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ height: 300 }}>
                    <Line data={chartData} options={options} />
                </Box>
            </CardContent>
        </Card>
    );
}

// Main Dashboard Component
export default function Dashboard({ pondId }) {
    const { sensorData, history, stats, loading, fetchHistory } = useSensors();
    const { connected } = useSocket();
    const [alertCount, setAlertCount] = useState(0);
    const [alertDist, setAlertDist] = useState({});
    const [runtime, setRuntime] = useState(null);

    useEffect(() => {
        fetchHistory('24h');
    }, [fetchHistory]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [aRes, rRes, sRes] = await Promise.all([
                    api.get(`/alerts/stats?pondId=${pondId}&period=7d`),
                    api.get(`/actuators/runtime?pondId=${pondId}`),
                    api.get('/sensors/stats?pondId=' + pondId + '&period=24h'),
                ]);
                if (!active) return;
                setAlertDist(aRes.data.byType || aRes.data.data || {});
                setRuntime(rRes.data.data || null);
                setAlertCount((sRes.data.data && (sRes.data.data.totalReadings || 0)) || 0);
            } catch (e) {
                /* keep defaults */
            }
        })();
        return () => { active = false; };
    }, [pondId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Alert distribution data for doughnut chart
    const distKeys = Object.keys(alertDist).filter(k => alertDist[k] > 0);
    const alertData = distKeys.length ? {
        labels: distKeys,
        datasets: [{
            data: distKeys.map(k => alertDist[k]),
            backgroundColor: ['#ffc107', '#d32f2f', '#ff9800', '#2196f3', '#9c27b0', '#00897b'],
            borderWidth: 0,
        }],
    } : {
        labels: ['No alerts'],
        datasets: [{ data: [1], backgroundColor: ['#e0e0e0'], borderWidth: 0 }],
    };

    // Actuator status data for bar chart
    const actuatorData = {
        labels: ['Inlet', 'Drain', 'Aerator', 'Heater', 'Feeder'],
        datasets: [{
            label: 'Operating Hours (14 days)',
            data: runtime
                ? [runtime.inlet_pump, runtime.drain_pump, runtime.aerator, runtime.heater, runtime.feeder]
                : [0, 0, 0, 0, 0],
            backgroundColor: ['#7b1fa2', '#f57c00', '#1976d2', '#00897b', '#d32f2f'],
            borderRadius: 8,
        }],
    };

    return (
        <Box>
            {/* Alerts Banner */}
            {!connected && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Device offline — Last update was 5 minutes ago. Check device connectivity.
                </Alert>
            )}

            {/* Page Title */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        Dashboard Overview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Real-time water quality monitoring for {pondId}
                    </Typography>
                </Box>
                <Tooltip title="Refresh Data">
                    <IconButton onClick={() => fetchHistory('24h')}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Sensor Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                    <SensorCard
                        title="pH Level"
                        value={sensorData?.ph}
                        unit="pH"
                        icon={<PHIcon />}
                        status={sensorData?.ph >= 6.5 && sensorData?.ph <= 8.5 ? 'Normal' : 'Warning'}
                        color="primary"
                        min={6.5}
                        max={8.5}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                    <SensorCard
                        title="Dissolved Oxygen"
                        value={sensorData?.dissolvedOxygen || sensorData?.dissolved_oxygen}
                        unit="mg/L"
                        icon={<DOIcon />}
                        status={(sensorData?.dissolvedOxygen || sensorData?.dissolved_oxygen) >= 5 ? 'Normal' : 'Critical'}
                        color="info"
                        min={5}
                        max={9}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                    <SensorCard
                        title="Temperature"
                        value={sensorData?.temperature}
                        unit="°C"
                        icon={<TempIcon />}
                        status={sensorData?.temperature >= 24 && sensorData?.temperature <= 30 ? 'Normal' : 'Warning'}
                        color="warning"
                        min={24}
                        max={30}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                    <SensorCard
                        title="Turbidity"
                        value={sensorData?.turbidity}
                        unit="NTU"
                        icon={<TurbidityIcon />}
                        status={sensorData?.turbidity <= 50 ? 'Normal' : 'Warning'}
                        color="secondary"
                        min={0}
                        max={50}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                    <SensorCard
                        title="Water Level"
                        value={sensorData?.waterLevel || sensorData?.water_level}
                        unit="meters"
                        icon={<WaterIcon />}
                        status={(sensorData?.waterLevel || sensorData?.water_level) >= 0.3 ? 'Normal' : 'Low'}
                        color="primary"
                        min={0.3}
                        max={1.2}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                    <SensorCard
                        title="Flow Rate"
                        value={sensorData?.flowRate || sensorData?.flow_rate}
                        unit="L/min"
                        icon={<TrendingUp />}
                        status="Active"
                        color="success"
                        min={0}
                        max={100}
                    />
                </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <TimeSeriesChart
                        data={history.slice(-50)}
                        title="Water Parameters (Last 24 Hours)"
                        dataKeys={[
                            { field: 'avgPH', label: 'pH', axis: 'y' },
                            { field: 'avgDO', label: 'Dissolved O₂', axis: 'y' },
                            { field: 'avgTemp', label: 'Temperature', axis: 'y1' },
                        ]}
                        colors={['#1976d2', '#00897b', '#f57c00']}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Alert Distribution
                            </Typography>
                            <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
                                <Doughnut
                                    data={alertData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom', labels: { boxWidth: 12 } }
                                        },
                                        cutout: '65%',
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Bottom Row */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Turbidity & Water Level Trend
                            </Typography>
                            <Box sx={{ height: 250 }}>
                                <Line
                                    data={{
                                        labels: history.slice(-30).map(d => new Date(d._id).toLocaleTimeString()),
                                        datasets: [
                                            {
                                                label: 'Turbidity (NTU)',
                                                data: history.slice(-30).map(d => d.avgTurbidity),
                                                borderColor: '#9c27b0',
                                                backgroundColor: '#9c27b020',
                                                fill: true,
                                                tension: 0.4,
                                                yAxisID: 'y',
                                            },
                                            {
                                                label: 'Water Level (m)',
                                                data: history.slice(-30).map(d => d.avgWaterLevel),
                                                borderColor: '#1976d2',
                                                backgroundColor: '#1976d220',
                                                fill: true,
                                                tension: 0.4,
                                                yAxisID: 'y1',
                                            },
                                        ],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: { type: 'linear', position: 'left', title: { display: true, text: 'Turbidity' } },
                                            y1: { type: 'linear', position: 'right', title: { display: true, text: 'Level' }, grid: { drawOnChartArea: false } },
                                        },
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Actuator Usage Today
                            </Typography>
                            <Box sx={{ height: 250 }}>
                                <Bar
                                    data={actuatorData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            y: { title: { display: true, text: 'Hours' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                                            x: { grid: { display: false } },
                                        },
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
