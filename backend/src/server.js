// ============================================================
// Fish Farm IoT - Simplified Backend Server
// Works without MongoDB/InfluxDB for demo purposes
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================
// IN-MEMORY DATA STORE (for demo without MongoDB)
// ============================================================
let sensorData = {
    pondId: 'pond_001',
    deviceId: 'esp32_fishfarm_001',
    ph: 7.24,
    dissolvedOxygen: 6.82,
    temperature: 27.5,
    turbidity: 38.2,
    waterLevel: 0.85,
    flowRate: 12.4,
    timestamp: new Date(),
    actuators: {
        waterPump: true,
        aerator: true,
        heater: false,
        inletValve: false,
        drainValve: false
    }
};

let alerts = [
    { id: 1, type: 'DO_LOW', severity: 'critical', message: 'Dissolved oxygen critically low: 4.2 mg/L', acknowledged: false, createdAt: new Date(Date.now() - 120000) },
    { id: 2, type: 'TURBIDITY_HIGH', severity: 'warning', message: 'Turbidity above threshold: 65 NTU', acknowledged: false, createdAt: new Date(Date.now() - 900000) },
    { id: 3, type: 'SYSTEM', severity: 'info', message: 'Aerator automatically activated', acknowledged: true, createdAt: new Date(Date.now() - 900000) }
];

let thresholds = {
    phMin: 6.5, phMax: 8.5,
    doMin: 5.0, doMax: 9.0,
    tempMin: 24.0, tempMax: 30.0,
    turbidityMax: 50.0,
    waterLevelMin: 0.3, waterLevelMax: 1.2
};

// Simulate sensor data updates
setInterval(() => {
    sensorData.ph = 6.5 + Math.random() * 2;
    sensorData.dissolvedOxygen = 5 + Math.random() * 3;
    sensorData.temperature = 24 + Math.random() * 6;
    sensorData.turbidity = 20 + Math.random() * 40;
    sensorData.waterLevel = 0.5 + Math.random() * 0.5;
    sensorData.flowRate = 8 + Math.random() * 8;
    sensorData.timestamp = new Date();

    // Check thresholds and create alerts
    if (sensorData.dissolvedOxygen < thresholds.doMin) {
        const existing = alerts.find(a => a.type === 'DO_LOW' && !a.acknowledged);
        if (!existing) {
            alerts.unshift({
                id: Date.now(),
                type: 'DO_LOW',
                severity: 'critical',
                message: `Dissolved oxygen low: ${sensorData.dissolvedOxygen.toFixed(1)} mg/L`,
                acknowledged: false,
                createdAt: new Date()
            });
        }
    }

    io.emit('sensor_data', sensorData);
}, 5000);

// ============================================================
// API ROUTES
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get latest sensor data
app.get('/api/sensors/latest', (req, res) => {
    res.json({ success: true, data: sensorData });
});

// Get sensor history (mock)
app.get('/api/sensors/history', (req, res) => {
    const history = [];
    for (let i = 24; i >= 0; i--) {
        const t = new Date();
        t.setHours(t.getHours() - i);
        history.push({
            _id: t.toISOString(),
            avgPH: 6.5 + Math.random() * 2,
            avgDO: 5 + Math.random() * 3,
            avgTemp: 24 + Math.random() * 6,
            avgTurbidity: 20 + Math.random() * 40,
            avgWaterLevel: 0.5 + Math.random() * 0.5
        });
    }
    res.json({ success: true, data: history });
});

// Get stats
app.get('/api/sensors/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            avgPH: 7.2, minPH: 6.1, maxPH: 8.3,
            avgDO: 6.5, minDO: 4.2, maxDO: 8.8,
            avgTemp: 27.0, minTemp: 24.5, maxTemp: 29.8,
            avgTurbidity: 35.0,
            totalReadings: 1250
        }
    });
});

// Get alerts
app.get('/api/alerts', (req, res) => {
    res.json({ success: true, data: alerts, count: alerts.length });
});

// Acknowledge alert
app.put('/api/alerts/:id/acknowledge', (req, res) => {
    const alert = alerts.find(a => a.id === parseInt(req.params.id));
    if (alert) {
        alert.acknowledged = true;
        res.json({ success: true, data: alert });
    } else {
        res.status(404).json({ success: false, error: 'Alert not found' });
    }
});

// Acknowledge all alerts
app.put('/api/alerts/acknowledge-all', (req, res) => {
    alerts.forEach(a => a.acknowledged = true);
    res.json({ success: true, message: 'All alerts acknowledged' });
});

// Send actuator command
app.post('/api/actuators/command', (req, res) => {
    const { deviceId, action } = req.body;
    console.log(`[COMMAND] ${action} sent to ${deviceId}`);

    // Update actuator state
    switch (action) {
        case 'pump_on': sensorData.actuators.waterPump = true; break;
        case 'pump_off': sensorData.actuators.waterPump = false; break;
        case 'aerator_on': sensorData.actuators.aerator = true; break;
        case 'aerator_off': sensorData.actuators.aerator = false; break;
        case 'heater_on': sensorData.actuators.heater = true; break;
        case 'heater_off': sensorData.actuators.heater = false; break;
        case 'inlet_on': sensorData.actuators.inletValve = true; break;
        case 'inlet_off': sensorData.actuators.inletValve = false; break;
        case 'drain_on': sensorData.actuators.drainValve = true; break;
        case 'drain_off': sensorData.actuators.drainValve = false; break;
    }

    io.emit('sensor_data', sensorData);
    res.json({ success: true, message: `Command '${action}' executed` });
});

// Update thresholds
app.post('/api/actuators/thresholds', (req, res) => {
    const { thresholds: newThresholds } = req.body;
    if (newThresholds) {
        Object.assign(thresholds, newThresholds);
    }
    res.json({ success: true, message: 'Thresholds updated', thresholds });
});

// Dashboard overview
app.get('/api/dashboard/overview', (req, res) => {
    res.json({
        success: true,
        data: {
            ponds: { total: 1 },
            devices: { active: 1, total: 1 },
            alerts: {
                unacknowledged: alerts.filter(a => !a.acknowledged).length,
                critical: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
                today: alerts.length
            },
            latestReadings: [sensorData]
        }
    });
});

// Dashboard charts
app.get('/api/dashboard/charts', (req, res) => {
    const timeSeries = [];
    for (let i = 24; i >= 0; i--) {
        const t = new Date();
        t.setHours(t.getHours() - i);
        timeSeries.push({
            _id: t.toISOString(),
            avgPH: 6.5 + Math.random() * 2,
            avgDO: 5 + Math.random() * 3,
            avgTemp: 24 + Math.random() * 6,
            avgTurbidity: 20 + Math.random() * 40,
            avgWaterLevel: 0.5 + Math.random() * 0.5
        });
    }
    res.json({ success: true, data: { timeSeries } });
});

// WebSocket
io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    socket.emit('sensor_data', sensorData);
    socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n🐟 Fish Farm IoT Server running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📡 Simulating sensor data every 5 seconds...\n`);
});
