import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Dashboard from './pages/Dashboard';
import SensorDetail from './pages/SensorDetail';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { SocketProvider } from './hooks/useSocket';
import { SensorProvider } from './hooks/useSensors';

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentPond, setCurrentPond] = useState('pond_001');

    return (
        <SocketProvider>
            <SensorProvider pondId={currentPond}>
                <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Header
                            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                            currentPond={currentPond}
                            onPondChange={setCurrentPond}
                        />
                        <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10 }}>
                            <Routes>
                                <Route path="/" element={<Dashboard pondId={currentPond} />} />
                                <Route path="/sensors" element={<SensorDetail pondId={currentPond} />} />
                                <Route path="/alerts" element={<Alerts pondId={currentPond} />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Box>
                    </Box>
                </Box>
            </SensorProvider>
        </SocketProvider>
    );
}

export default App;
