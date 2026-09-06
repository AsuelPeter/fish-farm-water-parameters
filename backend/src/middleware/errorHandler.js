// ============================================================
// Error Handler Middleware
// ============================================================

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    console.error(`[ERROR] ${err.stack}`);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        error.message = 'Resource not found';
        return res.status(404).json({ success: false, error: error.message });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        error.message = 'Duplicate field value entered';
        return res.status(400).json({ success: false, error: error.message });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        error.message = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: error.message });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        return res.status(401).json({ success: false, error: error.message });
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired';
        return res.status(401).json({ success: false, error: error.message });
    }

    res.status(err.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
