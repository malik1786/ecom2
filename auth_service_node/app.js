const fs = require('fs');
const path = require('path');

// --- 1. CORE ENV LOADER ---
const loadEnv = (dir) => {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        return true;
    }
    return false;
};

// ALWAYS prioritize the root folder (one level up)
const rootDir = path.join(__dirname, '..');
const rootLoaded = loadEnv(rootDir);
// Also try local .env as fallback (does NOT override already-set vars)
const localLoaded = loadEnv(__dirname);

console.log('------------------------------------------------');
console.log('[BOOT] Root .env loaded  :', rootLoaded);
console.log('[BOOT] Local .env loaded :', localLoaded);
console.log('[OAUTH-DEBUG] CLIENT ID  =', process.env.GOOGLE_CLIENT_ID || '⚠️  MISSING — fill in root .env');
console.log('[OAUTH-DEBUG] CALLBACK   =', process.env.GOOGLE_CALLBACK_URL || '⚠️  MISSING');
console.log('[OAUTH-DEBUG] FRONTEND   =', process.env.FRONTEND_URL || 'http://127.0.0.1:5173 (default)');
console.log('------------------------------------------------');

// --- 2. IMPORTS ---
const express = require('express');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const supabase = require('./src/config/supabaseClient');

// Configurations
require('./src/config/passport');
const authRoutes = require('./src/routes/authRoutes');

const app = express();

// --- 3. DATABASE STATUS ---
app.locals.dbReady = false;

async function checkDatabase() {
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            return;
        }
        const { error } = await supabase.from('customers').select('count', { count: 'exact', head: true });
        if (error) throw error;
        app.locals.dbReady = true;
        console.log('✅ [SUPABASE] Cloud Database Connected');
    } catch (err) {
        app.locals.dbReady = false;
        console.error('⚠️  [SUPABASE] Cloud Database Error:', err.message);
    }
}

// --- 4. MIDDLEWARES ---
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5173',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(passport.initialize());

// Request Logging
app.use((req, res, next) => {
    if (req.path.includes('/google')) {
        console.log('---------------------------------------------------------');
        console.log(`[AUTH-DEBUG] GOOGLE_CALLBACK_URL = ${process.env.GOOGLE_CALLBACK_URL}`);
        console.log(`[AUTH-DEBUG] FRONTEND_URL = ${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}`);
        console.log(`[AUTH-DEBUG] Incoming Origin = ${req.headers.origin}`);
        console.log(`[AUTH-DEBUG] Request Path = ${req.path}`);
        console.log('---------------------------------------------------------');
    }
    next();
});

// --- 5. AUTH BLOCKER ---
app.use('/auth', (req, res, next) => {
    if (!app.locals.dbReady && req.path !== '/health' && !req.path.includes('/health')) {
        return res.status(503).json({ success: false, error: 'DB_NOT_CONNECTED' });
    }
    return next();
});

// --- 6. ROUTES ---
app.use('/auth', authRoutes);

app.get('/auth/health', (req, res) => {
    res.json({ status: 'ok', dbReady: app.locals.dbReady });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', dbReady: app.locals.dbReady });
});

// --- 7. START ---
async function startServer() {
    await checkDatabase();
    const PORT = process.env.PORT || 5001;

    const server = app.listen(PORT, () => {
        console.log('---------------------------------------------------------');
        console.log(`🚀 Auth Service: http://127.0.0.1:${PORT}`);
        console.log(`📡 DB Status: ${app.locals.dbReady ? 'CONNECTED' : 'OFFLINE'}`);
        console.log('---------------------------------------------------------');
        console.log(`[OAUTH-DEBUG] CLIENT ID    = ${process.env.GOOGLE_CLIENT_ID || '⚠️  MISSING'}`);
        console.log(`[OAUTH-DEBUG] CALLBACK URL = ${process.env.GOOGLE_CALLBACK_URL || '⚠️  MISSING'}`);
        console.log(`[OAUTH-DEBUG] FRONTEND URL = ${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}`);
        console.log('---------------------------------------------------------');

        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            console.log('✅ [GOOGLE] OAuth Handshake: ACTIVE');
        } else {
            console.warn('⚠️  [GOOGLE] OAuth Handshake: DISABLED (Keys Missing)');
        }
    });

    // --- EADDRINUSE GUARD ---
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ [FATAL] Port ${PORT} is already in use.`);
            console.error('   Run: netstat -ano | findstr :5001   then   taskkill /PID <PID> /F');
            process.exit(1);
        } else {
            console.error('[FATAL] Server error:', err);
            process.exit(1);
        }
    });
}

startServer();
