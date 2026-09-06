// ============================================================
// MQTT Service - Handles communication with ESP32 devices
// ============================================================

const mqtt = require('mqtt');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const Device = require('../models/Device');
const alertService = require('./alertService');

let client = null;
let io = null;
let logger = null;

// MQTT Topics
const TOPICS = {
    SENSOR_DATA: 'fishfarm/sensors/data',
    ACTUATOR_COMMAND: 'fishfarm/actuators/command',
    SYSTEM_STATUS: 'fishfarm/system/status',
    ALERTS: 'fishfarm/alerts',
    DEVICE_HEARTBEAT: 'fishfarm/heartbeat'
};

// ============================================================
// Initialize MQTT Client
// ============================================================
const initialize = (socketIo, winstonLogger) => {
    io = socketIo;
    logger = winstonLogger;

    const brokerUrl = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com';
    const port = process.env.MQTT_PORT || 1883;

    client = mqtt.connect(brokerUrl, {
        clientId: process.env.MQTT_CLIENT_ID || `fishfarm_server_${Math.random().toString(16).slice(2, 10)}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        keepalive: 60
    });

    client.on('connect', () => {
        logger.info('[MQTT] Connected to broker');

        // Subscribe to all relevant topics
        client.subscribe([
            TOPICS.SENSOR_DATA,
            TOPICS.SYSTEM_STATUS,
            TOPICS.ALERTS,
            TOPICS.DEVICE_HEARTBEAT
        ], (err) => {
            if (err) {
                logger.error('[MQTT] Subscribe error:', err);
            } else {
                logger.info('[MQTT] Subscribed to topics');
            }
        });
    });

    client.on('message', handleMessage);

    client.on('error', (err) => {
        logger.error('[MQTT] Error:', err.message);
    });

    client.on('offline', () => {
        logger.warn('[MQTT] Client offline');
    });

    client.on('reconnect', () => {
        logger.info('[MQTT] Reconnecting...');
    });
};

// ============================================================
// Handle Incoming MQTT Messages
// ============================================================
const handleMessage = async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        switch (topic) {
            case TOPICS.SENSOR_DATA:
                await handleSensorData(data);
                break;
            case TOPICS.SYSTEM_STATUS:
                await handleSystemStatus(data);
                break;
            case TOPICS.ALERTS:
                await handleDeviceAlert(data);
                break;
            case TOPICS.DEVICE_HEARTBEAT:
                await handleHeartbeat(data);
                break;
            default:
                logger.debug(`[MQTT] Unhandled topic: ${topic}`);
        }
    } catch (error) {
        logger.error(`[MQTT] Message handling error: ${error.message}`);
    }
};

// ============================================================
// Process Sensor Data
// ============================================================
const handleSensorData = async (data) => {
    const { device_id, timestamp, ph, dissolved_oxygen, temperature,
            turbidity, water_level, flow_rate, actuators, system } = data;

    logger.debug(`[SENSOR] Data from ${device_id}: pH=${ph}, DO=${dissolved_oxygen}, Temp=${temperature}`);

    // Save to MongoDB
    const sensorReading = new SensorData({
        pondId: 'pond_001', // Map from device
        deviceId: device_id,
        ph,
        dissolvedOxygen: dissolved_oxygen,
        temperature,
        turbidity,
        waterLevel: water_level,
        flowRate: flow_rate,
        actuators: {
            waterPump: actuators?.water_pump || false,
            aerator: actuators?.aerator || false,
            heater: actuators?.heater || false,
            inletValve: actuators?.inlet_valve || false,
            drainValve: actuators?.drain_valve || false
        },
        timestamp: new Date()
    });

    await sensorReading.save();

    // Update device last seen
    await Device.findOneAndUpdate(
        { deviceId: device_id },
        { lastSeen: new Date(), status: 'online', ip: system?.ip }
    );

    // Update pond last reading
    const Pond = require('../models/Pond');
    await Pond.findOneAndUpdate(
        { deviceId: device_id },
        {
            lastReading: {
                timestamp: new Date(),
                ph,
                dissolvedOxygen: dissolved_oxygen,
                temperature
            }
        }
    );

    // Check thresholds and generate alerts
    await checkThresholds(device_id, data);

    // Emit to WebSocket clients
    if (io) {
        io.to(`sensors_pond_001`).emit('sensor_data', {
            device_id,
            ph,
            dissolvedOxygen: dissolved_oxygen,
            temperature,
            turbidity,
            waterLevel: water_level,
            flowRate: flow_rate,
            actuators,
            timestamp: new Date()
        });
    }
};

// ============================================================
// Check Thresholds and Generate Alerts
// ============================================================
const checkThresholds = async (deviceId, data) => {
    const Pond = require('../models/Pond');
    const pond = await Pond.findOne({ deviceId });

    if (!pond) return;

    const t = pond.thresholds;
    const alerts = [];

    // pH checks
    if (data.ph < t.phMin) {
        alerts.push({
            type: 'PH_LOW',
            severity: 'warning',
            message: `pH level low: ${data.ph.toFixed(2)} (min: ${t.phMin})`,
            readings: { ph: data.ph }
        });
    } else if (data.ph > t.phMax) {
        alerts.push({
            type: 'PH_HIGH',
            severity: 'warning',
            message: `pH level high: ${data.ph.toFixed(2)} (max: ${t.phMax})`,
            readings: { ph: data.ph }
        });
    }

    // Dissolved Oxygen checks
    if (data.dissolved_oxygen < t.doMin) {
        alerts.push({
            type: 'DO_LOW',
            severity: 'critical',
            message: `Dissolved oxygen critically low: ${data.dissolved_oxygen.toFixed(2)} mg/L`,
            readings: { dissolvedOxygen: data.dissolved_oxygen }
        });
    }

    // Temperature checks
    if (data.temperature < t.tempMin) {
        alerts.push({
            type: 'TEMP_LOW',
            severity: 'warning',
            message: `Temperature low: ${data.temperature.toFixed(1)}°C`,
            readings: { temperature: data.temperature }
        });
    } else if (data.temperature > t.tempMax) {
        alerts.push({
            type: 'TEMP_HIGH',
            severity: 'critical',
            message: `Temperature high: ${data.temperature.toFixed(1)}°C`,
            readings: { temperature: data.temperature }
        });
    }

    // Turbidity check
    if (data.turbidity > t.turbidityMax) {
        alerts.push({
            type: 'TURBIDITY_HIGH',
            severity: 'warning',
            message: `Turbidity high: ${data.turbidity.toFixed(1)} NTU`,
            readings: { turbidity: data.turbidity }
        });
    }

    // Water level checks
    if (data.water_level < t.waterLevelMin) {
        alerts.push({
            type: 'LEVEL_LOW',
            severity: 'critical',
            message: `Water level critically low: ${data.water_level.toFixed(3)} m`,
            readings: { waterLevel: data.water_level }
        });
    } else if (data.water_level > t.waterLevelMax) {
        alerts.push({
            type: 'LEVEL_HIGH',
            severity: 'warning',
            message: `Water level high: ${data.water_level.toFixed(3)} m`,
            readings: { waterLevel: data.water_level }
        });
    }

    // Save and send alerts
    for (const alertData of alerts) {
        const alert = new Alert({
            pondId: pond.pondId,
            deviceId,
            ...alertData
        });
        await alert.save();

        // Send notifications
        await alertService.sendNotification(alert);

        // Emit to WebSocket
        if (io) {
            io.to('alerts').emit('new_alert', alert);
        }
    }
};

// ============================================================
// Handle System Status
// ============================================================
const handleSystemStatus = async (data) => {
    const { device_id, status, uptime, free_heap, wifi_rssi } = data;

    await Device.findOneAndUpdate(
        { deviceId: device_id },
        {
            status: status === 'online' ? 'online' : 'offline',
            lastSeen: new Date()
        }
    );

    if (io) {
        io.emit('device_status', { device_id, status, uptime, free_heap, wifi_rssi });
    }
};

// ============================================================
// Handle Device Alert
// ============================================================
const handleDeviceAlert = async (data) => {
    const alert = new Alert({
        pondId: 'pond_001',
        deviceId: data.device_id,
        type: data.type,
        severity: data.severity,
        message: data.message,
        readings: data.readings
    });

    await alert.save();
    await alertService.sendNotification(alert);

    if (io) {
        io.to('alerts').emit('new_alert', alert);
    }
};

// ============================================================
// Handle Heartbeat
// ============================================================
const handleHeartbeat = async (data) => {
    await Device.findOneAndUpdate(
        { deviceId: data.device_id },
        {
            lastSeen: new Date(),
            status: 'online'
        }
    );
};

// ============================================================
// Publish Command to Device
// ============================================================
const publishCommand = (data) => {
    if (!client || !client.connected) {
        logger.error('[MQTT] Cannot publish: not connected');
        return false;
    }

    const command = {
        command: data.action,
        ...data.params,
        timestamp: Date.now()
    };

    client.publish(TOPICS.ACTUATOR_COMMAND, JSON.stringify(command));
    logger.info(`[MQTT] Command published: ${data.action}`);
    return true;
};

// ============================================================
// Update Device Thresholds
// ============================================================
const updateThresholds = (deviceId, thresholds) => {
    if (!client || !client.connected) return false;

    const command = {
        command: 'set_thresholds',
        ...thresholds
    };

    client.publish(TOPICS.ACTUATOR_COMMAND, JSON.stringify(command));
    logger.info(`[MQTT] Thresholds updated for ${deviceId}`);
    return true;
};

// ============================================================
// Check Connection Status
// ============================================================
const isConnected = () => {
    return client && client.connected;
};

// ============================================================
// Disconnect
// ============================================================
const disconnect = () => {
    if (client) {
        client.end();
        logger.info('[MQTT] Disconnected');
    }
};

module.exports = {
    initialize,
    publishCommand,
    updateThresholds,
    isConnected,
    disconnect,
    TOPICS
};
