// ============================================================
// Alert Routes
// ============================================================

const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

// GET /api/alerts - Get all alerts
router.get('/', async (req, res) => {
    try {
        const { pondId, severity, acknowledged, limit = 50, offset = 0 } = req.query;

        const query = {};
        if (pondId) query.pondId = pondId;
        if (severity) query.severity = severity;
        if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';

        const alerts = await Alert.find(query)
            .sort({ createdAt: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));

        const total = await Alert.countDocuments(query);

        res.json({
            success: true,
            count: alerts.length,
            total,
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/alerts/unacknowledged - Get unacknowledged alerts
router.get('/unacknowledged', async (req, res) => {
    try {
        const alerts = await Alert.find({ acknowledged: false })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            success: true,
            count: alerts.length,
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/alerts/stats - Get alert statistics
router.get('/stats', async (req, res) => {
    try {
        const { pondId, period = '7d' } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        const matchQuery = { createdAt: { $gte: startDate } };
        if (pondId) matchQuery.pondId = pondId;

        const stats = await Alert.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        type: '$type',
                        severity: '$severity'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const severityStats = await Alert.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$severity',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            period: `${period} days`,
            byType: stats,
            bySeverity: severityStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT /api/alerts/:id/acknowledge - Acknowledge alert
router.put('/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        const { acknowledgedBy } = req.body;

        const alert = await Alert.findByIdAndUpdate(
            id,
            {
                acknowledged: true,
                acknowledgedBy: acknowledgedBy || 'system',
                acknowledgedAt: new Date()
            },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found'
            });
        }

        res.json({
            success: true,
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT /api/alerts/acknowledge-all - Acknowledge all alerts
router.put('/acknowledge-all', async (req, res) => {
    try {
        const result = await Alert.updateMany(
            { acknowledged: false },
            {
                acknowledged: true,
                acknowledgedBy: 'system',
                acknowledgedAt: new Date()
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} alerts acknowledged`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Alert.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Alert deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
