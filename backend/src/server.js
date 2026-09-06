// ============================================================
// Fish Farm IoT - Backend Server
// Main Entry Point
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const connectDB = require('./config/database');
const mqttService = require('./services/mqttService');
const sensorRoutes = require('./routes/sensorRoutes');
const actuatorRoutes = require('./routes/actuatorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { errorHandler } = require('./middleware/errorHandler');

// ============================================================
// LOGGER CONFIGURATION
// ============================================================
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// ============================================================
// EXPRESS APP SETUP
// ============================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// ============================================================
// DATABASE CONNECTION
// ============================================================
connectDB();

// ============================================================
// MQTT SERVICE INITIALIZATION
// ============================================================
mqttService.initialize(io, logger);

// ============================================================
// ROUTES
// ============================================================
app.use('/api/sensors', sensorRoutes);
app.use('/api/actuators', actuatorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mqtt: mqttService.isConnected(),
        uptime: process.uptime()
    });
});

// ============================================================
// SOCKET.IO EVENTS
// ============================================================
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('subscribe_sensors', (pondId) => {
        socket.join(`sensors_${pondId}`);
        logger.debug(`Client ${socket.id} subscribed to sensors for pond ${pondId}`);
    });

    socket.on('subscribe_alerts', () => {
        socket.join('alerts');
        logger.debug(`Client ${socket.id} subscribed to alerts`);
    });

    socket.on('command', (data) => {
        mqttService.publishCommand(data);
    });

    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Make io accessible to routes
app.set('io', io);

// ============================================================
// ERROR HANDLING
// ============================================================
app.use(errorHandler);

// ============================================================
// SERVER START
// ============================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    logger.info(`🐟 Fish Farm IoT Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 API: http://localhost:${PORT}/api`);
    logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    mqttService.disconnect();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
