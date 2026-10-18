// ============================================================
// Alerts Page
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Button,
    IconButton,
    Paper,
    Grid,
    Badge,
} from '@mui/material';
import {
    Warning as WarningIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    CheckCircle,
    DoneAll,
    Delete,
    Refresh,
} from '@mui/icons-material';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Alerts({ pondId }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchAlerts = async () => {
        try {
            const response = await api.get('/alerts', {
                params: { pondId, limit: 100 }
            });
            setAlerts(response.data.data);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, [pondId]);

    const handleAcknowledge = async (id) => {
        try {
            await api.put(`/alerts/${id}/acknowledge`);
            toast.success('Alert acknowledged');
            fetchAlerts();
        } catch (error) {
            toast.error('Failed to acknowledge alert');
        }
    };

    const handleAcknowledgeAll = async () => {
        try {
            await api.put('/alerts/acknowledge-all');
            toast.success('All alerts acknowledged');
            fetchAlerts();
        } catch (error) {
            toast.error('Failed to acknowledge alerts');
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return <ErrorIcon color="error" />;
            case 'warning': return <WarningIcon color="warning" />;
            default: return <InfoIcon color="info" />;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return true;
        if (filter === 'unacknowledged') return !alert.acknowledged;
        return alert.severity === filter;
    });

    const unackCount = alerts.filter(a => !a.acknowledged).length;
    const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        Alerts & Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {unackCount} unacknowledged alerts ({criticalCount} critical)
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchAlerts}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DoneAll />}
                        onClick={handleAcknowledgeAll}
                        disabled={unackCount === 0}
                    >
                        Acknowledge All
                    </Button>
                </Box>
            </Box>

            {/* Filter Chips */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                {['all', 'unacknowledged', 'critical', 'warning', 'info'].map(f => (
                    <Chip
                        key={f}
                        label={f.charAt(0).toUpperCase() + f.slice(1)}
                        onClick={() => setFilter(f)}
                        color={filter === f ? 'primary' : 'default'}
                        variant={filter === f ? 'filled' : 'outlined'}
                    />
                ))}
            </Box>

            {/* Alert Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.dark' }}>
                        <Typography variant="h4" fontWeight={700}>{criticalCount}</Typography>
                        <Typography variant="body2">Critical Alerts</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.dark' }}>
                        <Typography variant="h4" fontWeight={700}>
                            {alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length}
                        </Typography>
                        <Typography variant="body2">Warnings</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.dark' }}>
                        <Typography variant="h4" fontWeight={700}>
                            {alerts.filter(a => a.acknowledged).length}
                        </Typography>
                        <Typography variant="body2">Resolved</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Alerts List */}
            <Card>
                <CardContent>
                    <List>
                        {filteredAlerts.length === 0 ? (
                            <ListItem>
                                <ListItemText
                                    primary="No alerts"
                                    secondary={filter === 'all' ? 'System is operating normally' : `No ${filter} alerts`}
                                />
                            </ListItem>
                        ) : (
                            filteredAlerts.map((alert) => (
                                <ListItem
                                    key={alert._id}
                                    sx={{
                                        mb: 1,
                                        bgcolor: alert.acknowledged ? 'grey.50' : `${getSeverityColor(alert.severity)}.light`,
                                        borderRadius: 2,
                                        opacity: alert.acknowledged ? 0.7 : 1,
                                    }}
                                    secondaryAction={
                                        !alert.acknowledged && (
                                            <IconButton
                                                edge="end"
                                                onClick={() => handleAcknowledge(alert._id)}
                                                title="Acknowledge"
                                            >
                                                <CheckCircle color="success" />
                                            </IconButton>
                                        )
                                    }
                                >
                                    <ListItemIcon>
                                        <Badge
                                            color={getSeverityColor(alert.severity)}
                                            variant="dot"
                                            invisible={alert.acknowledged}
                                        >
                                            {getSeverityIcon(alert.severity)}
                                        </Badge>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle2" fontWeight={600}>
                                                    {alert.type}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={alert.severity}
                                                    color={getSeverityColor(alert.severity)}
                                                    variant="outlined"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="body2">{alert.message}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(alert.createdAt).toLocaleString()}
                                                    {alert.acknowledged && ' — Acknowledged'}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))
                        )}
                    </List>
                </CardContent>
            </Card>
        </Box>
    );
}
