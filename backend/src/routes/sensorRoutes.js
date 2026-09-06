// ============================================================
// Sensor Routes
// ============================================================

const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');

// GET /api/sensors - Get latest sensor data for all ponds
router.get('/', async (req, res) => {
    try {
        const { pondId, limit = 100, offset = 0 } = req.query;

        const query = pondId ? { pondId } : {};
        const data = await SensorData.find(query)
            .sort({ timestamp: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/sensors/latest - Get latest reading
router.get('/latest', async (req, res) => {
    try {
        const { pondId } = req.query;
        const query = pondId ? { pondId } : {};

        const latest = await SensorData.findOne(query)
            .sort({ timestamp: -1 });

        res.json({
            success: true,
            data: latest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/sensors/history - Get historical data with aggregation
router.get('/history', async (req, res) => {
    try {
        const { pondId, startDate, endDate, interval = '1h' } = req.query;

        const matchQuery = { pondId };
        if (startDate) matchQuery.timestamp = { $gte: new Date(startDate) };
        if (endDate) matchQuery.timestamp = { ...matchQuery.timestamp, $lte: new Date(endDate) };

        // Define aggregation interval
        let dateFormat;
        switch (interval) {
            case '1m': dateFormat = '%Y-%m-%dT%H:%M:00Z'; break;
            case '5m': dateFormat = '%Y-%m-%dT%H:00:00Z'; break;
            case '1h': dateFormat = '%Y-%m-%dT00:00:00Z'; break;
            case '1d': dateFormat = '%Y-%m-01T00:00:00Z'; break;
            default: dateFormat = '%Y-%m-%dT%H:00:00Z';
        }

        const data = await SensorData.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$timestamp' } },
                    avgPH: { $avg: '$ph' },
                    avgDO: { $avg: '$dissolvedOxygen' },
                    avgTemp: { $avg: '$temperature' },
                    avgTurbidity: { $avg: '$turbidity' },
                    avgWaterLevel: { $avg: '$waterLevel' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/sensors/stats - Get statistics
router.get('/stats', async (req, res) => {
    try {
        const { pondId, period = '24h' } = req.query;

        const startDate = new Date();
        switch (period) {
            case '1h': startDate.setHours(startDate.getHours() - 1); break;
            case '24h': startDate.setDate(startDate.getDate() - 1); break;
            case '7d': startDate.setDate(startDate.getDate() - 7); break;
            case '30d': startDate.setDate(startDate.getDate() - 30); break;
        }

        const query = { timestamp: { $gte: startDate } };
        if (pondId) query.pondId = pondId;

        const stats = await SensorData.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    avgPH: { $avg: '$ph' },
                    minPH: { $min: '$ph' },
                    maxPH: { $max: '$ph' },
                    avgDO: { $avg: '$dissolvedOxygen' },
                    minDO: { $min: '$dissolvedOxygen' },
                    maxDO: { $max: '$dissolvedOxygen' },
                    avgTemp: { $avg: '$temperature' },
                    minTemp: { $min: '$temperature' },
                    maxTemp: { $max: '$temperature' },
                    avgTurbidity: { $avg: '$turbidity' },
                    avgWaterLevel: { $avg: '$waterLevel' },
                    totalReadings: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            period,
            data: stats[0] || {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/sensors - Create new sensor reading
router.post('/', async (req, res) => {
    try {
        const sensorData = new SensorData(req.body);
        await sensorData.save();

        res.status(201).json({
            success: true,
            data: sensorData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
