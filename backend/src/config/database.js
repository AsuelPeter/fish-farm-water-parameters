// ============================================================
// Database Configuration (MongoDB + InfluxDB)
// ============================================================

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/fishfarm',
            {
                // Mongoose 7+ handles these automatically
            }
        );

        console.log(`[DB] MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => {
            console.error(`[DB] MongoDB error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('[DB] MongoDB disconnected');
        });

    } catch (error) {
        console.error(`[DB] MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
