// ============================================================
// Dashboard Routes
// ============================================================

const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const Pond = require('../models/Pond');
const Device = require('../models/Device');

// GET /api/dashboard/overview - Get dashboard overview
router.get('/overview', async (req, res) => {
    try {
        // Total ponds
        const totalPonds = await Pond.countDocuments({ isActive: true });

        // Active devices
        const activeDevices = await Device.countDocuments({ status: 'online' });
        const totalDevices = await Device.countDocuments();

        // Unacknowledged alerts
        const unackAlerts = await Alert.countDocuments({ acknowledged: false });
        const criticalAlerts = await Alert.countDocuments({
            acknowledged: false,
            severity: 'critical'
        });

        // Latest readings across all ponds
        const latestReadings = await SensorData.aggregate([
            { $sort: { timestamp: -1 } },
            { $group: {
                _id: '$pondId',
                latestReading: { $first: '$$ROOT' }
            }},
            { $limit: 10 }
        ]);

        // Today's alerts count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAlerts = await Alert.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            success: true,
            data: {
                ponds: { total: totalPonds },
                devices: { active: activeDevices, total: totalDevices },
                alerts: {
                    unacknowledged: unackAlerts,
                    critical: criticalAlerts,
                    today: todayAlerts
                },
                latestReadings: latestReadings.map(r => r.latestReading)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/dashboard/charts - Get chart data
router.get('/charts', async (req, res) => {
    try {
        const { pondId, period = '24h' } = req.query;

        const startDate = new Date();
        switch (period) {
            case '1h': startDate.setHours(startDate.getHours() - 1); break;
            case '24h': startDate.setDate(startDate.getDate() - 1); break;
            case '7d': startDate.setDate(startDate.getDate() - 7); break;
            case '30d': startDate.setDate(startDate.getDate() - 30); break;
        }

        const matchQuery = { timestamp: { $gte: startDate } };
        if (pondId) matchQuery.pondId = pondId;

        // Time series data for charts
        const timeSeries = await SensorData.aggregate([
            { $match: matchQuery },
            { $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%dT%H:%M:00Z', date: '$timestamp' }
                },
                avgPH: { $avg: '$ph' },
                avgDO: { $avg: '$dissolvedOxygen' },
                avgTemp: { $avg: '$temperature' },
                avgTurbidity: { $avg: '$turbidity' },
                avgWaterLevel: { $avg: '$waterLevel' }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Alert distribution
        const alertDistribution = await Alert.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: {
                _id: { type: '$type', severity: '$severity' },
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                timeSeries,
                alertDistribution
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/dashboard/ponds - Get all ponds with latest data
router.get('/ponds', async (req, res) => {
    try {
        const ponds = await Pond.find({ isActive: true })
            .populate('owner', 'name email');

        // Enrich with latest sensor data
        const enrichedPonds = await Promise.all(
            ponds.map(async (pond) => {
                const latestReading = await SensorData.findOne({ pondId: pond.pondId })
                    .sort({ timestamp: -1 });

                return {
                    ...pond.toObject(),
                    currentData: latestReading || null
                };
            })
        );

        res.json({
            success: true,
            count: enrichedPonds.length,
            data: enrichedPonds
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
