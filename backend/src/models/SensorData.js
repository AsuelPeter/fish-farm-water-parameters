// ============================================================
// Sensor Data Model
// ============================================================

const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    pondId: {
        type: String,
        required: true,
        index: true
    },
    deviceId: {
        type: String,
        required: true,
        index: true
    },
    ph: {
        type: Number,
        min: 0,
        max: 14
    },
    dissolvedOxygen: {
        type: Number,
        min: 0,
        max: 20
    },
    temperature: {
        type: Number,
        min: 0,
        max: 50
    },
    turbidity: {
        type: Number,
        min: 0,
        max: 3000
    },
    waterLevel: {
        type: Number,
        min: 0,
        max: 5
    },
    flowRate: {
        type: Number,
        min: 0
    },
    ammonia: {
        type: Number,
        min: 0
    },
    nitrite: {
        type: Number,
        min: 0
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    actuators: {
        waterPump: { type: Boolean, default: false },
        aerator: { type: Boolean, default: false },
        heater: { type: Boolean, default: false },
        inletValve: { type: Boolean, default: false },
        drainValve: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// TTL index - auto-delete after 90 days
sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound index for common queries
sensorDataSchema.index({ pondId: 1, timestamp: -1 });
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
