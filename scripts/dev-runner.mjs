import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { access, readFile } from 'node:fs/promises';

// --- NATIVE ENV LOADING (Zero-Dependency) ---
const rootDir = process.cwd();
try {
  const envPath = path.resolve(rootDir, '.env');
  const envContent = await readFile(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  });
  console.log('---------------------------------------------------------');
  console.log('🚀 [dev] ROOT .ENV LOADED SUCCESSFULLY');
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('✅ [dev] GOOGLE OAUTH: ENABLED & READY');
  } else {
    console.log('⚠️  [dev] GOOGLE OAUTH: DISABLED (Keys Missing in .env)');
  }
  console.log('---------------------------------------------------------');
} catch (err) {
  console.warn('[dev] No root .env found or failed to read. Continuing with system env.');
}
import { spawn, spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const startedChildren = [];
let isShuttingDown = false;

const backendCode =
  "from backend.app import app; app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=True)";

// ── TASK 5: Port pre-check guard ─────────────────────────────────────────────
async function checkPortInUse(port) {
  if (!isWindows) return; // netstat -ano is Windows-specific; Linux uses ss/lsof
  return new Promise((resolve) => {
    const ns = spawn('netstat', ['-ano'], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    let output = '';
    ns.stdout.on('data', (d) => { output += d.toString(); });
    ns.on('close', () => {
      const lines = output.split('\n').filter((l) => l.includes(`:${port} `) && l.includes('LISTENING'));
      if (lines.length > 0) {
        const pidMatch = lines[0].trim().split(/\s+/).pop();
        console.warn(`⚠️  [dev] Port ${port} is ALREADY IN USE by PID ${pidMatch}`);
        console.warn(`   To fix: taskkill /PID ${pidMatch} /F`);
      }
      resolve();
    });
    ns.on('error', resolve); // gracefully ignore if netstat is unavailable
  });
}
// ─────────────────────────────────────────────────────────────────────────────


async function fileExists(relativePath) {
  try {
    await access(path.resolve(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function resolvePythonCommand() {
  const localCandidates = isWindows
    ? [
        'venv\\Scripts\\python.exe',
        '.venv\\Scripts\\python.exe',
        'backend\\venv\\Scripts\\python.exe',
        'pyenv\\Scripts\\python.exe',
      ]
    : ['venv/bin/python', '.venv/bin/python', 'backend/venv/bin/python', 'pyenv/bin/python'];

  for (const candidate of localCandidates) {
    if (await fileExists(candidate)) {
      return {
        command: path.resolve(rootDir, candidate),
        args: [],
        display: candidate,
      };
    }
  }

  const fallbackCommands = isWindows
    ? [
        { command: 'python', args: [], display: 'python' },
        { command: 'py', args: ['-3'], display: 'py -3' },
      ]
    : [
        { command: 'python3', args: [], display: 'python3' },
        { command: 'python', args: [], display: 'python' },
      ];

  for (const fallback of fallbackCommands) {
    const result = spawnSync(fallback.command, [...fallback.args, '--version'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    if (!result.error && result.status === 0) {
      return fallback;
    }
  }

  throw new Error(
    'No Python executable was found. Activate or create a project venv first.',
  );
}

function prefixStream(stream, label) {
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.length > 0) {
        console.log(`[${label}] ${line}`);
      }
    }
  });

  stream.on('end', () => {
    if (buffer.length > 0) {
      console.log(`[${label}] ${buffer}`);
    }
  });
}

function healthCheck(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:5000/api/health', (res) => {
      res.resume();
      resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
    });

    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackendReady(attempts = 24, delayMs = 500) {
  for (let index = 0; index < attempts; index += 1) {
    if (await healthCheck()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return false;
}

// --- LOG STREAMING SYSTEM ---
const MAX_LOG_HISTORY = 200;
let logHistory = [];
const logClients = new Set();

function sanitizeLog(message) {
  if (typeof message !== 'string') message = message.toString();
  return message
    .replace(/postgres:\/\/.*@/g, 'postgres://user:pass@')
    .replace(/sqlite:\/\/\/.*\.db/g, 'sqlite:///DATABASE_PATH')
    .replace(/RAZORPAY_KEY_SECRET=[\w-]+/g, 'RAZORPAY_KEY_SECRET=********')
    .replace(/[a-zA-Z0-9_-]{20,}/g, (match) => {
        // Simple heuristic for masking long strings
        return '********';
    });
}

function broadcastLog(name, type, message) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: name,
    type: type,
    message: sanitizeLog(message.toString().trim())
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

// Start a hardened log server on port 5004
const logServer = http.createServer((req, res) => {
  if (req.url === '/api/logs/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(': ok\n\n');
    logHistory.forEach(log => {
      try { res.write(`data: ${JSON.stringify(log)}\n\n`); } catch (e) {}
    });
    logClients.add(res);
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch (e) { clearInterval(heartbeat); }
    }, 15000);
    req.on('close', () => {
      clearInterval(heartbeat);
      logClients.delete(res);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

logServer.on('error', (err) => {
  console.error(`[dev-logs] FATAL BINDING ERROR: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    console.error('CRITICAL: Port 5004 is locked by another process. Kill it and restart.');
    process.exit(1);
  }
});

async function startLogServer() {
  return new Promise((resolve) => {
    logServer.listen(5004, '0.0.0.0', () => {
      console.log('---------------------------------------------------------');
      console.log('🚀 [dev-logs] INFRASTRUCTURE READY: PORT 5004');
      console.log('---------------------------------------------------------');
      resolve();
    });
  });
}

function watchChild(label, child, stopOthersOnExit = true) {
  child.stdout.on('data', (data) => {
    // console.log(`[${label}] ${data}`); // Optional: keep console noise down
    broadcastLog(label, 'out', data);
  });
  child.stderr.on('data', (data) => {
    broadcastLog(label, 'err', data);
  });
  
  prefixStream(child.stdout, label);
  prefixStream(child.stderr, label);
  startedChildren.push(child);

  child.on('error', (error) => {
    if (isShuttingDown) {
      return;
    }

    console.error(`[${label}] ${error.message}`);
    if (stopOthersOnExit) {
      void shutdown(1);
    }
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    const exitMessage = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`---------------------------------------------------------`);
    console.log(`⚠️  [${label}] PROCESS EXIT DETECTED`);
    console.log(`[${label}] Exit Status: ${exitMessage}`);
    console.log(`---------------------------------------------------------`);

    if (stopOthersOnExit && code !== 0 && code !== null) {
      console.log(`🚨 [dev] CRITICAL SERVICE FAILURE: ${label}. Initiating global shutdown...`);
      void shutdown(typeof code === 'number' ? code : 1);
    } else {
      console.log(`ℹ️  [dev] Service ${label} stopped, but keeping other services alive.`);
    }
  });

  return child;
}

async function stopChild(child) {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }

  if (isWindows) {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('exit', resolve);
      killer.on('error', resolve);
    });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

async function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  await Promise.all(startedChildren.map((child) => stopChild(child)));
  process.exit(exitCode);
}

process.on('SIGINT', () => {
  console.log('\n[dev] Stopping dev servers...');
  void shutdown(0);
});

process.on('SIGTERM', () => {
  void shutdown(0);
});

async function main() {
  await startLogServer(); // MANDATORY: Ensure logs are ready before anything else boots

  // ── Port conflict pre-check (Task 5) ────────────────────────────────────
  console.log('[dev] Checking for port conflicts before launching services...');
  await checkPortInUse(5001);
  await checkPortInUse(5002);
  await checkPortInUse(5173);
  console.log('[dev] Port pre-check done.');
  // ────────────────────────────────────────────────────────────────────────

  const python = await resolvePythonCommand();
  const backendAlreadyRunning = await healthCheck();

  if (backendAlreadyRunning) {
    console.log('[dev] Backend already running at http://127.0.0.1:5000');
  } else {
    console.log(`[dev] Starting Flask backend with ${python.display}`);
    watchChild(
      'backend',
      spawn(python.command, [...python.args, '-c', backendCode], {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        detached: !isWindows,
      }),
    );

    const backendReady = await waitForBackendReady();
    if (backendReady) {
      console.log('[dev] Backend ready at http://127.0.0.1:5000');
    } else {
      console.warn('[dev] Backend did not report ready yet. Starting frontend anyway.');
    }
  }

  console.log('[dev] Starting Vite frontend...');
  watchChild(
    'frontend',
    spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev:frontend', '--', '--host', '127.0.0.1', '--port', '5173'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: !isWindows,
      shell: isWindows,
    }),
    false // Don't kill everything if frontend restarts
  );

  console.log('[dev] Starting Auth service (Node.js)...');
  watchChild(
    'auth',
    spawn(isWindows ? 'npm.cmd' : 'npm', ['start'], {
      cwd: path.resolve(rootDir, 'auth_service_node'),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: !isWindows,
      shell: isWindows,
    }),
    false
  );

  console.log('[dev] Starting Payment service (Node.js)...');
  watchChild(
    'payment',
    spawn(isWindows ? 'npm.cmd' : 'npm', ['start'], {
      cwd: path.resolve(rootDir, 'payment_service_node'),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: !isWindows,
      shell: isWindows,
    }),
    false
  );
}

main().catch((error) => {
  console.error(`[dev] ${error.message}`);
  process.exit(1);
});
