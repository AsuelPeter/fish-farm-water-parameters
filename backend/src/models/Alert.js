// ============================================================
// Alert Model
// ============================================================

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    pondId: {
        type: String,
        required: true,
        index: true
    },
    deviceId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'PH_LOW', 'PH_HIGH',
            'DO_LOW', 'DO_HIGH',
            'TEMP_LOW', 'TEMP_HIGH',
            'TURBIDITY_HIGH',
            'LEVEL_LOW', 'LEVEL_HIGH',
            'SENSOR_OFFLINE',
            'ACTUATOR_FAULT',
            'SYSTEM_ERROR'
        ],
        required: true,
        index: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    readings: {
        ph: Number,
        dissolvedOxygen: Number,
        temperature: Number,
        turbidity: Number,
        waterLevel: Number
    },
    acknowledged: {
        type: Boolean,
        default: false,
        index: true
    },
    acknowledgedBy: {
        type: String
    },
    acknowledgedAt: {
        type: Date
    },
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for time-based queries
alertSchema.index({ createdAt: -1 });
alertSchema.index({ pondId: 1, acknowledged: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
