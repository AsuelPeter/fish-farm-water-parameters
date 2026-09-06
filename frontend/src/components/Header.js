// ============================================================
// Header Component
// ============================================================

import React, { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Badge,
    Box,
    Chip,
    Menu,
    MenuItem,
    Avatar,
    Tooltip,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Notifications as NotificationsIcon,
    Circle as CircleIcon,
    AccountCircle,
    Refresh,
} from '@mui/icons-material';
import { useSocket } from '../hooks/useSocket';
import { useSensors } from '../hooks/useSensors';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMenuClick, currentPond, onPondChange }) {
    const { connected } = useSocket();
    const { sensorData } = useSensors();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                bgcolor: 'white',
                color: 'text.primary',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
        >
            <Toolbar>
                <IconButton
                    edge="start"
                    onClick={onMenuClick}
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>

                <Typography variant="h6" sx={{ flexGrow: 0, mr: 3 }}>
                    Water Regulation Dashboard
                </Typography>

                {/* Connection Status */}
                <Chip
                    icon={<CircleIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />}
                    label={connected ? 'Connected' : 'Disconnected'}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 2 }}
                />

                {/* Current Pond */}
                <Chip
                    label={`Pond: ${currentPond}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mr: 2 }}
                />

                {/* Live Readings Summary */}
                {sensorData && (
                    <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                        <Chip
                            size="small"
                            label={`pH: ${(sensorData.ph || 0).toFixed(1)}`}
                            color={sensorData.ph >= 6.5 && sensorData.ph <= 8.5 ? 'success' : 'warning'}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`DO: ${(sensorData.dissolvedOxygen || sensorData.dissolved_oxygen || 0).toFixed(1)} mg/L`}
                            color={(sensorData.dissolvedOxygen || sensorData.dissolved_oxygen) >= 5 ? 'success' : 'error'}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`Temp: ${(sensorData.temperature || 0).toFixed(1)}°C`}
                            color={sensorData.temperature >= 24 && sensorData.temperature <= 30 ? 'success' : 'warning'}
                            variant="outlined"
                        />
                    </Box>
                )}

                <Box sx={{ flexGrow: 1 }} />

                {/* Refresh */}
                <Tooltip title="Refresh">
                    <IconButton onClick={handleRefresh}>
                        <Refresh />
                    </IconButton>
                </Tooltip>

                {/* Notifications */}
                <Tooltip title="Alerts">
                    <IconButton onClick={() => navigate('/alerts')}>
                        <Badge badgeContent={3} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                </Tooltip>

                {/* User Menu */}
                <Tooltip title="Account">
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                            <AccountCircle />
                        </Avatar>
                    </IconButton>
                </Tooltip>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                >
                    <MenuItem onClick={() => setAnchorEl(null)}>Profile</MenuItem>
                    <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
                        Settings
                    </MenuItem>
                    <MenuItem onClick={() => setAnchorEl(null)}>Logout</MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
}
