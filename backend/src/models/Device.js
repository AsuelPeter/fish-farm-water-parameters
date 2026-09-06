// ============================================================
// Device Model
// ============================================================

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['esp32', 'esp8266', 'rpi', 'arduino'],
        default: 'esp32'
    },
    pondId: {
        type: String,
        ref: 'Pond'
    },
    firmwareVersion: {
        type: String
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'error', 'updating'],
        default: 'offline'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    ip: {
        type: String
    },
    mac: {
        type: String
    },
    sensors: {
        pH: { type: Boolean, default: true },
        DO: { type: Boolean, default: true },
        temperature: { type: Boolean, default: true },
        turbidity: { type: Boolean, default: true },
        waterLevel: { type: Boolean, default: true }
    },
    actuators: {
        waterPump: { type: Boolean, default: true },
        aerator: { type: Boolean, default: true },
        heater: { type: Boolean, default: true },
        inletValve: { type: Boolean, default: true },
        drainValve: { type: Boolean, default: true }
    },
    mqttTopic: {
        type: String
    },
    installedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update lastSeen on data receive
deviceSchema.methods.updateLastSeen = function() {
    this.lastSeen = new Date();
    this.status = 'online';
    return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);
