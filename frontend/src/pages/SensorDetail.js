// ============================================================
// Sensor Detail Page
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Button,
    Slider,
    Paper,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { useSensors } from '../hooks/useSensors';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SensorDetail({ pondId }) {
    const { sensorData, history, fetchHistory } = useSensors();
    const [period, setPeriod] = useState('24h');
    const [actuatorStates, setActuatorStates] = useState({
        water_pump: false,
        aerator: false,
        heater: false,
        inlet_valve: false,
        drain_valve: false,
    });

    const handleActuatorToggle = async (actuator) => {
        const action = actuatorStates[actuator] ? `${actuator.replace('_valve', '')}_off` : `${actuator.replace('_valve', '')}_on`;
        try {
            await api.post('/actuators/command', {
                deviceId: 'esp32_fishfarm_001',
                action: action,
            });
            setActuatorStates(prev => ({ ...prev, [actuator]: !prev[actuator] }));
            toast.success(`${actuator} toggled`);
        } catch (error) {
            toast.error('Failed to control actuator');
        }
    };

    const handleFeed = async () => {
        try {
            await api.post('/actuators/command', {
                deviceId: 'esp32_fishfarm_001',
                action: 'feed',
                params: { duration: 5 },
            });
            toast.success('Feeder activated');
        } catch (error) {
            toast.error('Failed to activate feeder');
        }
    };

    useEffect(() => {
        fetchHistory(period);
    }, [period, fetchHistory]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' } },
        },
        interaction: { intersect: false, mode: 'index' },
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                Sensor Details & Controls
            </Typography>

            {/* Period Selector */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                        value={period}
                        label="Period"
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <MenuItem value="1h">Last Hour</MenuItem>
                        <MenuItem value="24h">Last 24 Hours</MenuItem>
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="30d">Last 30 Days</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Grid container spacing={3}>
                {/* pH Chart */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                pH Level History
                            </Typography>
                            <Box sx={{ height: 250 }}>
                                <Line
                                    data={{
                                        labels: history.map(d => new Date(d._id).toLocaleTimeString()),
                                        datasets: [{
                                            label: 'pH',
                                            data: history.map(d => d.avgPH),
                                            borderColor: '#1976d2',
                                            backgroundColor: '#1976d220',
                                            fill: true,
                                            tension: 0.4,
                                        }],
                                    }}
                                    options={{
                                        ...chartOptions,
                                        scales: {
                                            ...chartOptions.scales,
                                            y: { ...chartOptions.scales.y, min: 0, max: 14 },
                                        },
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Dissolved Oxygen Chart */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Dissolved Oxygen History
                            </Typography>
                            <Box sx={{ height: 250 }}>
                                <Line
                                    data={{
                                        labels: history.map(d => new Date(d._id).toLocaleTimeString()),
                                        datasets: [{
                                            label: 'DO (mg/L)',
                                            data: history.map(d => d.avgDO),
                                            borderColor: '#00897b',
                                            backgroundColor: '#00897b20',
                                            fill: true,
                                            tension: 0.4,
                                        }],
                                    }}
                                    options={{
                                        ...chartOptions,
                                        scales: {
                                            ...chartOptions.scales,
                                            y: { ...chartOptions.scales.y, min: 0, max: 15 },
                                        },
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Temperature Chart */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Temperature History
                            </Typography>
                            <Box sx={{ height: 250 }}>
                                <Line
                                    data={{
                                        labels: history.map(d => new Date(d._id).toLocaleTimeString()),
                                        datasets: [{
                                            label: 'Temperature (°C)',
                                            data: history.map(d => d.avgTemp),
                                            borderColor: '#f57c00',
                                            backgroundColor: '#f57c0020',
                                            fill: true,
                                            tension: 0.4,
                                        }],
                                    }}
                                    options={chartOptions}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Turbidity Chart */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Turbidity History
                            </Typography>
                            <Box sx={{ height: 250 }}>
                                <Line
                                    data={{
                                        labels: history.map(d => new Date(d._id).toLocaleTimeString()),
                                        datasets: [{
                                            label: 'Turbidity (NTU)',
                                            data: history.map(d => d.avgTurbidity),
                                            borderColor: '#9c27b0',
                                            backgroundColor: '#9c27b020',
                                            fill: true,
                                            tension: 0.4,
                                        }],
                                    }}
                                    options={chartOptions}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Manual Actuator Controls */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Manual Actuator Controls
                            </Typography>
                            <Grid container spacing={2}>
                                {[
                                    { key: 'water_pump', label: 'Water Pump' },
                                    { key: 'aerator', label: 'Aerator' },
                                    { key: 'heater', label: 'Heater' },
                                    { key: 'inlet_valve', label: 'Inlet Valve' },
                                    { key: 'drain_valve', label: 'Drain Valve' },
                                ].map(({ key, label }) => (
                                    <Grid item xs={6} sm={4} md={2} key={key}>
                                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="body2" gutterBottom>
                                                {label}
                                            </Typography>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={actuatorStates[key]}
                                                        onChange={() => handleActuatorToggle(key)}
                                                        color="primary"
                                                    />
                                                }
                                                label={actuatorStates[key] ? 'ON' : 'OFF'}
                                            />
                                        </Paper>
                                    </Grid>
                                ))}
                                <Grid item xs={12}>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={handleFeed}
                                        sx={{ mt: 2 }}
                                    >
                                        Activate Feeder (5 sec)
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
