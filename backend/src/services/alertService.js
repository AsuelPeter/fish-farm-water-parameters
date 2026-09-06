// ============================================================
// Alert Service - Email and SMS Notifications
// ============================================================

const nodemailer = require('nodemailer');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/alerts.log' }),
        new winston.transports.Console()
    ]
});

// ============================================================
// Email Transporter
// ============================================================
let emailTransporter = null;

const initEmailTransporter = () => {
    try {
        emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        logger.info('[ALERT] Email transporter initialized');
    } catch (error) {
        logger.error('[ALERT] Email transporter init failed:', error.message);
    }
};

// ============================================================
// Send Email Alert
// ============================================================
const sendEmailAlert = async (alert) => {
    if (!emailTransporter) {
        initEmailTransporter();
    }

    if (!emailTransporter || !process.env.ALERT_EMAIL) {
        logger.debug('[ALERT] Email not configured, skipping');
        return;
    }

    const severityEmoji = {
        info: 'ℹ️',
        warning: '⚠️',
        critical: '🚨'
    };

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${alert.severity === 'critical' ? '#dc3545' : alert.severity === 'warning' ? '#ffc107' : '#17a2b8'}; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">${severityEmoji[alert.severity]} Fish Farm Alert</h1>
                <h2 style="margin: 10px 0 0 0;">${alert.type}</h2>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
                <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
                <p><strong>Pond:</strong> ${alert.pondId}</p>
                <p><strong>Device:</strong> ${alert.deviceId}</p>
                <p><strong>Message:</strong> ${alert.message}</p>
                ${alert.readings ? `
                <h3>Current Readings:</h3>
                <ul>
                    ${alert.readings.ph ? `<li>pH: ${alert.readings.ph}</li>` : ''}
                    ${alert.readings.dissolvedOxygen ? `<li>Dissolved O₂: ${alert.readings.dissolvedOxygen} mg/L</li>` : ''}
                    ${alert.readings.temperature ? `<li>Temperature: ${alert.readings.temperature}°C</li>` : ''}
                    ${alert.readings.turbidity ? `<li>Turbidity: ${alert.readings.turbidity} NTU</li>` : ''}
                    ${alert.readings.waterLevel ? `<li>Water Level: ${alert.readings.waterLevel} m</li>` : ''}
                </ul>
                ` : ''}
                <p><strong>Time:</strong> ${new Date(alert.createdAt || Date.now()).toLocaleString()}</p>
            </div>
            <div style="padding: 10px; text-align: center; color: #666; font-size: 12px;">
                <p>Fish Farm IoT Monitoring System</p>
            </div>
        </div>
    `;

    try {
        await emailTransporter.sendMail({
            from: '"Fish Farm Monitor" <noreply@fishfarm.com>',
            to: process.env.ALERT_EMAIL,
            subject: `[${alert.severity.toUpperCase()}] Fish Farm Alert: ${alert.type}`,
            html: htmlContent
        });
        logger.info(`[ALERT] Email sent for ${alert.type}`);
    } catch (error) {
        logger.error(`[ALERT] Email send failed: ${error.message}`);
    }
};

// ============================================================
// Send SMS Alert (via Twilio)
// ============================================================
const sendSMSAlert = async (alert) => {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
        logger.debug('[ALERT] Twilio not configured, skipping SMS');
        return;
    }

    try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

        const message = await client.messages.create({
            body: `[${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message} (Pond: ${alert.pondId})`,
            from: process.env.TWILIO_PHONE,
            to: process.env.ALERT_SMS
        });

        logger.info(`[ALERT] SMS sent: ${message.sid}`);
    } catch (error) {
        logger.error(`[ALERT] SMS send failed: ${error.message}`);
    }
};

// ============================================================
// Send Notification (Email + SMS based on severity)
// ============================================================
const sendNotification = async (alert) => {
    logger.info(`[ALERT] Processing alert: ${alert.type} (${alert.severity})`);

    // Always send email for warnings and critical
    if (alert.severity === 'warning' || alert.severity === 'critical') {
        await sendEmailAlert(alert);
    }

    // Send SMS only for critical alerts
    if (alert.severity === 'critical') {
        await sendSMSAlert(alert);
    }
};

module.exports = {
    sendNotification,
    sendEmailAlert,
    sendSMSAlert,
    initEmailTransporter
};
