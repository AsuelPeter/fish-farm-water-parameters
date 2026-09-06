// ============================================================
// Settings Page
// ============================================================

import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Grid,
    TextField,
    Button,
    Slider,
    Switch,
    FormControlLabel,
    Paper,
    Divider,
    Alert,
} from '@mui/material';
import { Save, RestartAlt } from '@mui/icons-material';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
    const [thresholds, setThresholds] = useState({
        phMin: 6.5,
        phMax: 8.5,
        doMin: 5.0,
        doMax: 9.0,
        tempMin: 24.0,
        tempMax: 30.0,
        turbidityMax: 50.0,
        waterLevelMin: 0.3,
        waterLevelMax: 1.2,
    });

    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        push: true,
    });

    const handleThresholdChange = (key, value) => {
        setThresholds(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveThresholds = async () => {
        try {
            await api.post('/actuators/thresholds', {
                deviceId: 'esp32_fishfarm_001',
                thresholds,
            });
            toast.success('Thresholds saved and sent to device');
        } catch (error) {
            toast.error('Failed to save thresholds');
        }
    };

    const handleResetDefaults = () => {
        setThresholds({
            phMin: 6.5,
            phMax: 8.5,
            doMin: 5.0,
            doMax: 9.0,
            tempMin: 24.0,
            tempMax: 30.0,
            turbidityMax: 50.0,
            waterLevelMin: 0.3,
            waterLevelMax: 1.2,
        });
        toast.success('Reset to defaults');
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                System Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure water quality thresholds and notification preferences
            </Typography>

            <Grid container spacing={3}>
                {/* Threshold Settings */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Water Quality Thresholds
                            </Typography>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Adjust thresholds to match your fish species requirements. Changes are sent to the device in real-time.
                            </Alert>

                            {/* pH */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    pH Range: {thresholds.phMin} - {thresholds.phMax}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Minimum</Typography>
                                        <Slider
                                            value={thresholds.phMin}
                                            onChange={(_, v) => handleThresholdChange('phMin', v)}
                                            min={0}
                                            max={14}
                                            step={0.1}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Maximum</Typography>
                                        <Slider
                                            value={thresholds.phMax}
                                            onChange={(_, v) => handleThresholdChange('phMax', v)}
                                            min={0}
                                            max={14}
                                            step={0.1}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Dissolved Oxygen */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Dissolved Oxygen (mg/L): {thresholds.doMin} - {thresholds.doMax}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Minimum</Typography>
                                        <Slider
                                            value={thresholds.doMin}
                                            onChange={(_, v) => handleThresholdChange('doMin', v)}
                                            min={0}
                                            max={15}
                                            step={0.5}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Maximum</Typography>
                                        <Slider
                                            value={thresholds.doMax}
                                            onChange={(_, v) => handleThresholdChange('doMax', v)}
                                            min={0}
                                            max={15}
                                            step={0.5}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Temperature */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Temperature (°C): {thresholds.tempMin} - {thresholds.tempMax}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Minimum</Typography>
                                        <Slider
                                            value={thresholds.tempMin}
                                            onChange={(_, v) => handleThresholdChange('tempMin', v)}
                                            min={10}
                                            max={40}
                                            step={0.5}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Maximum</Typography>
                                        <Slider
                                            value={thresholds.tempMax}
                                            onChange={(_, v) => handleThresholdChange('tempMax', v)}
                                            min={10}
                                            max={40}
                                            step={0.5}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Turbidity */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Max Turbidity: {thresholds.turbidityMax} NTU
                                </Typography>
                                <Slider
                                    value={thresholds.turbidityMax}
                                    onChange={(_, v) => handleThresholdChange('turbidityMax', v)}
                                    min={0}
                                    max={200}
                                    step={5}
                                    valueLabelDisplay="auto"
                                />
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Water Level */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Water Level (m): {thresholds.waterLevelMin} - {thresholds.waterLevelMax}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Minimum</Typography>
                                        <Slider
                                            value={thresholds.waterLevelMin}
                                            onChange={(_, v) => handleThresholdChange('waterLevelMin', v)}
                                            min={0}
                                            max={2}
                                            step={0.05}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption">Maximum</Typography>
                                        <Slider
                                            value={thresholds.waterLevelMax}
                                            onChange={(_, v) => handleThresholdChange('waterLevelMax', v)}
                                            min={0}
                                            max={2}
                                            step={0.05}
                                            valueLabelDisplay="auto"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Save />}
                                    onClick={handleSaveThresholds}
                                >
                                    Save & Deploy
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<RestartAlt />}
                                    onClick={handleResetDefaults}
                                >
                                    Reset Defaults
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Notification Settings */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Notification Preferences
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.email}
                                            onChange={(e) => setNotifications(prev => ({
                                                ...prev, email: e.target.checked
                                            }))}
                                        />
                                    }
                                    label="Email Notifications"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.sms}
                                            onChange={(e) => setNotifications(prev => ({
                                                ...prev, sms: e.target.checked
                                            }))}
                                        />
                                    }
                                    label="SMS Alerts (Critical)"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifications.push}
                                            onChange={(e) => setNotifications(prev => ({
                                                ...prev, push: e.target.checked
                                            }))}
                                        />
                                    }
                                    label="Push Notifications"
                                />
                            </Box>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Device Information
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Typography variant="body2">
                                    <strong>Device ID:</strong> esp32_fishfarm_001
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Firmware:</strong> v1.0.0
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Status:</strong> Online
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Last Update:</strong> {new Date().toLocaleTimeString()}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
