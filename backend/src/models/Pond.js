// ============================================================
// Pond Model
// ============================================================

const mongoose = require('mongoose');

const pondSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    pondId: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    location: {
        type: String
    },
    dimensions: {
        length: Number,
        width: Number,
        depth: Number,
        volume: Number // in cubic meters
    },
    fishSpecies: {
        type: String
    },
    fishCount: {
        type: Number,
        default: 0
    },
    deviceId: {
        type: String,
        ref: 'Device'
    },
    thresholds: {
        phMin: { type: Number, default: 6.5 },
        phMax: { type: Number, default: 8.5 },
        doMin: { type: Number, default: 5.0 },
        doMax: { type: Number, default: 9.0 },
        tempMin: { type: Number, default: 24.0 },
        tempMax: { type: Number, default: 30.0 },
        turbidityMax: { type: Number, default: 50.0 },
        waterLevelMin: { type: Number, default: 0.3 },
        waterLevelMax: { type: Number, default: 1.2 }
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastReading: {
        timestamp: Date,
        ph: Number,
        dissolvedOxygen: Number,
        temperature: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Pond', pondSchema);
