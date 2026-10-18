// ============================================================
// Sidebar Component
// ============================================================

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Box,
    Divider,
    Avatar,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Sensors as SensorsIcon,
    Notifications as AlertsIcon,
    Settings as SettingsIcon,
    Water as WaterIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Sensors', icon: <SensorsIcon />, path: '/sensors' },
    { text: 'Alerts', icon: <AlertsIcon />, path: '/alerts' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar({ open, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Drawer
            variant="permanent"
            open={open}
            sx={{
                width: open ? DRAWER_WIDTH : 0,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: open ? DRAWER_WIDTH : 0,
                    boxSizing: 'border-box',
                    transition: 'width 0.3s',
                    borderRight: '1px solid rgba(0,0,0,0.08)',
                },
            }}
        >
            <Toolbar sx={{ px: 2, py: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}>
                        <WaterIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} color="primary">
                            Fish Farm
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            IoT Monitoring
                        </Typography>
                    </Box>
                </Box>
            </Toolbar>

            <Divider />

            <List sx={{ px: 1.5, mt: 1 }}>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                            sx={{
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                    '& .MuiListItemIcon-root': { color: 'white' },
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                    v1.0.0 — Automated Water Regulation
                </Typography>
            </Box>
        </Drawer>
    );
}
