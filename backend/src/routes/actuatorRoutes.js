// ============================================================
// Actuator Routes
// ============================================================

const express = require('express');
const router = express.Router();
const mqttService = require('../services/mqttService');

// POST /api/actuators/command - Send command to device
router.post('/command', async (req, res) => {
    try {
        const { deviceId, action, params = {} } = req.body;

        if (!deviceId || !action) {
            return res.status(400).json({
                success: false,
                error: 'deviceId and action are required'
            });
        }

        const validActions = [
            'pump_on', 'pump_off',
            'aerator_on', 'aerator_off',
            'heater_on', 'heater_off',
            'drain_on', 'drain_off',
            'inlet_on', 'inlet_off',
            'feed',
            'status'
        ];

        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                error: `Invalid action. Valid actions: ${validActions.join(', ')}`
            });
        }

        const result = mqttService.publishCommand({
            deviceId,
            action,
            params
        });

        if (result) {
            res.json({
                success: true,
                message: `Command '${action}' sent to device ${deviceId}`
            });
        } else {
            res.status(503).json({
                success: false,
                error: 'MQTT connection not available'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/actuators/thresholds - Update device thresholds
router.post('/thresholds', async (req, res) => {
    try {
        const { deviceId, thresholds } = req.body;

        if (!deviceId || !thresholds) {
            return res.status(400).json({
                success: false,
                error: 'deviceId and thresholds are required'
            });
        }

        const result = mqttService.updateThresholds(deviceId, thresholds);

        if (result) {
            res.json({
                success: true,
                message: `Thresholds updated for device ${deviceId}`
            });
        } else {
            res.status(503).json({
                success: false,
                error: 'MQTT connection not available'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/actuators/schedule - Set automatic feeding schedule
router.post('/schedule', async (req, res) => {
    try {
        const { deviceId, schedule } = req.body;

        // Store schedule in database
        // This would trigger periodic feed commands

        res.json({
            success: true,
            message: 'Feeding schedule set',
            schedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
