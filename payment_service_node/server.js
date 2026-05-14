require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const crashLogger = require('./utils/crashLogger');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentService = require('./services/paymentService');
const errorHandler = require('./middlewares/errorHandler');
const mongoose = require('mongoose');

const app = express();

let server;

// SECURITY: Set security HTTP headers
app.use(helmet());
app.disable('x-powered-by'); // Hide Express signature

// SECURITY: Strict CORS policy
const corsOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'http://127.0.0.1:5173'].filter((v, i, a) => a.indexOf(v) === i);
app.use(cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
}));

// SECURITY: Global Rate Limiting to prevent brute force & DDoS
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' })); // SECURITY: Limit body size to prevent payload exhaustion
app.use(express.urlencoded({ extended: true, limit: '10kb' })); 

// SECURITY: Zero-Trust Internal Authentication
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'SUPER_SECRET_INTERNAL_KEY_123';
app.use((req, res, next) => {
    // Exempt health checks
    if (req.path.includes('/health')) return next();
    
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== INTERNAL_SECRET) {
        console.error(`[PAYMENT-SECURITY-ALERT] Unauthorized direct access attempt to ${req.path}`);
        return res.status(401).json({ error: 'UNAUTHORIZED_INTERNAL_ACCESS' });
    }
    next();
});

// Routes
app.use('/api/payment', paymentRoutes);
// Alias: frontend routes /payment -> payment service
app.use('/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'payment_service_node',
        db_connected: mongoose.connection?.readyState === 1,
    });
});

app.get('/payment/health', (req, res) => {
    const gw = paymentService.getGatewayStatus();
    res.json({
        ok: true,
        service: 'payment_service_node',
        db_connected: mongoose.connection?.readyState === 1,
        gateways: gw,
    });
});

app.get('/health', (req, res) => {
    const gw = paymentService.getGatewayStatus();
    res.json({
        ok: true,
        service: 'payment_service_node',
        db_connected: mongoose.connection?.readyState === 1,
        gateways: gw,
    });
});

// Gateway readiness check
app.get('/payment/gateway-status', (req, res) => {
    const gw = paymentService.getGatewayStatus();
    res.json({
        ok: true,
        ...gw,
        message: gw.any_online_gateway
            ? 'At least one online gateway is ready. System is LIVE.'
            : 'No online gateways configured. Only UPI/COD available. Paste API keys in .env to enable.',
    });
});

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5002;

async function startServer() {
    const dbState = await connectDB();
    app.locals.dbState = dbState;
    app.locals.dbReady = Boolean(dbState && dbState.connected);

    if (app.locals.dbReady) {
        require('./cron/paymentCron'); // Start cron jobs only when DB is available
    } else {
        console.warn('⚠️  [startup] Cron disabled because DB is not connected.');
    }

    // ── Gateway Readiness Report ──
    const gw = paymentService.getGatewayStatus();
    console.log('\n═══════════════════════════════════════════');
    console.log('  PAYMENT GATEWAY STATUS');
    console.log('═══════════════════════════════════════════');
    console.log(`  Razorpay : ${gw.razorpay === 'READY' ? '✅ READY' : '⚠️  DISABLED'}`);
    console.log(`  PayU     : ${gw.payu === 'READY' ? '✅ READY' : '⚠️  DISABLED'}`);
    console.log(`  Online   : ${gw.any_online_gateway ? '✅ At least one gateway READY' : '⚠️  No online gateway — COD only'}`);
    console.log('═══════════════════════════════════════════\n');

    server = app.listen(PORT, () => {
        console.log(`🚀 Payment service running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // SECURITY: DoS Protection (Timeouts to prevent Slowloris attacks)
    server.keepAliveTimeout = 65000; // Ensure it's higher than load balancer's keep-alive
    server.headersTimeout = 66000;
}

// WHY: Catch sync exceptions leading to app crash. Save state, then exit safely.
process.on('uncaughtException', async (err) => {
    await crashLogger.saveCrashLog(err);
    console.error('CRITICAL: Uncaught Exception:', err);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1); 
    } else {
        console.warn('⚠️  [dev] Uncaught Exception detected but skipping exit because we are in development mode.');
    }
});

// WHY: Catch unhandled promises (e.g., forgot await or missing catch block)
process.on('unhandledRejection', async (reason) => {
    await crashLogger.saveCrashLog(reason);
    console.error('CRITICAL: Unhandled Rejection:', reason);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    } else {
        console.warn('⚠️  [dev] Unhandled Rejection detected but skipping exit because we are in development mode.');
    }
});

startServer().catch(async (err) => {
    await crashLogger.saveCrashLog(err);
    console.error(err);
    process.exit(1);
});
