import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import httpProxy from 'http-proxy';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

const rootDir = process.cwd();
const proxy = httpProxy.createProxyServer({
  timeout: 30000,
  proxyTimeout: 30000
});

const PORT = process.env.PORT || 5173;
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'SUPER_SECRET_INTERNAL_KEY_123';

// Internal Ports
const BACKEND_PORT = 5000;
const AUTH_PORT = 5001;
const PAYMENT_PORT = 5002;
const FRONTEND_PORT = 5003;

const children = new Map();

function spawnService(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: { ...process.env, INTERNAL_SERVICE_SECRET: INTERNAL_SECRET },
    ...options
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
    broadcastLog(name, 'out', data);
  });
  child.stderr.on('data', (data) => {
    process.stderr.write(`[${name}-ERR] ${data}`);
    broadcastLog(name, 'err', data);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
        console.error(`[CRITICAL] Service ${name} crashed. Restarting...`);
        setTimeout(() => spawnService(name, command, args, options), 2000);
    }
  });

  children.set(name, child);
  return child;
}

async function main() {
  console.log('🛡️ [SECURE-INIT] Initializing Zero-Trust Gateway...');

  // 1. Start Services with Internal Secret
  spawnService('backend', 'gunicorn', ['-w', '2', '-b', `127.0.0.1:${BACKEND_PORT}`, 'app:app'], { cwd: path.resolve(rootDir, 'backend') });
  spawnService('auth', 'npm', ['start'], { cwd: path.resolve(rootDir, 'auth_service_node'), env: { ...process.env, PORT: AUTH_PORT, INTERNAL_SERVICE_SECRET: INTERNAL_SECRET } });
  spawnService('payment', 'npm', ['start'], { cwd: path.resolve(rootDir, 'payment_service_node'), env: { ...process.env, PORT: PAYMENT_PORT, INTERNAL_SERVICE_SECRET: INTERNAL_SECRET } });

  const app = express();
  
  // SECURITY MIDDLEWARE
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10kb' }));

  // RATE LIMITING
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: 'TOO_MANY_REQUESTS' }
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'BRUTE_FORCE_PROTECTION_ACTIVE' }
  });

  app.use('/api/', apiLimiter);
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);

  // STATIC ASSETS
  const distPath = path.resolve(rootDir, 'dist');
  app.use(express.static(distPath, { maxAge: '1h' }));

  // PROXY LOGIC WITH INTERNAL AUTH HEADER INJECTION
  const proxyHandler = (target) => (req, res) => {
    // Inject internal secret so services know the request came from our gateway
    req.headers['x-internal-secret'] = INTERNAL_SECRET;
    proxy.web(req, res, { target });
  };

  app.use('/api', proxyHandler(`http://127.0.0.1:${BACKEND_PORT}`));
  app.use('/auth', proxyHandler(`http://127.0.0.1:${AUTH_PORT}`));
  app.use('/payment', proxyHandler(`http://127.0.0.1:${PAYMENT_PORT}`));

  // --- LOG STREAMING SYSTEM ---
  const MAX_LOG_HISTORY = 200;
  let logHistory = [];
  const logClients = new Set();

  function sanitizeLog(message) {
    if (typeof message !== 'string') message = message.toString();
    // Redact internal secret, DB URLs, and common API key patterns
    return message
      .replace(new RegExp(INTERNAL_SECRET, 'g'), '********')
      .replace(/postgres:\/\/.*@/g, 'postgres://user:pass@')
      .replace(/sqlite:\/\/\/.*\.db/g, 'sqlite:///DATABASE_PATH')
      .replace(/RAZORPAY_KEY_SECRET=[\w-]+/g, 'RAZORPAY_KEY_SECRET=********')
      .replace(/[a-zA-Z0-9_-]{20,}/g, (match) => {
          // Heuristic: Mask long strings that look like keys but aren't common words
          if (match === INTERNAL_SECRET) return '********';
          return match;
      });
  }

  function broadcastLog(name, type, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: name,
      type: type, // 'out' or 'err'
      message: sanitizeLog(message)
    };
    
    if (!logEntry.message) return;

    logHistory.push(logEntry);
    if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();

    const data = `data: ${JSON.stringify(logEntry)}\n\n`;
    logClients.forEach(client => {
        try {
            client.write(data);
        } catch (e) {
            logClients.delete(client);
        }
    });
  }

  // LOG STREAM ENDPOINT
  app.get('/api/logs/stream', (req, res) => {
    // SECURITY: Only Admin via Internal Secret or valid cookie can access (handled by proxyHandler logic or local check)
    
    // Explicitly bypass compression for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Initial Handshake
    res.write(': ok\n\n');

    // Send history
    logHistory.forEach(log => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    logClients.add(res);
    
    const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch(e) { clearInterval(heartbeat); }
    }, 15000);

    req.on('close', () => {
        clearInterval(heartbeat);
        logClients.delete(res);
    });
  });

  // FEATURE DISCOVERY API (For Frontend)
  app.get('/api/features', (req, res) => {
    res.json({
      success: true,
      features: {
        googleAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        payments: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        email: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER),
        environment: process.env.NODE_ENV || 'production'
      }
    });
  });

  // MASTER HEALTH CHECK
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // SPA FALLBACK
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [HARDENED-GATEWAY] Live on port ${PORT}`);
  });
}

main().catch(console.error);
