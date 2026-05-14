const redis = require('redis');

let client;
let useMemoryFallback = false;
const memoryStore = new Map();
const memoryExpiryTimers = new Map();

if (process.env.NODE_ENV === 'test' || !process.env.REDIS_URL) {
  console.log('âš ï¸ [REDIS] No Redis URL found or in Test Mode. Using In-Memory Fallback.');
  useMemoryFallback = true;
}

if (!useMemoryFallback) {
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.on('error', () => {
    console.error('âŒ [REDIS] Connection Error. Falling back to In-Memory store.');
    useMemoryFallback = true;
  });

  client.connect().catch(() => {
    useMemoryFallback = true;
  });
}

function scheduleExpiry(key, ttlSeconds) {
  if (!ttlSeconds || ttlSeconds <= 0) return;
  const existing = memoryExpiryTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    memoryExpiryTimers.delete(key);
    memoryStore.delete(key);
  }, ttlSeconds * 1000);
  memoryExpiryTimers.set(key, timer);
}

function ensureHash(key) {
  const current = memoryStore.get(key);
  if (current && current.type === 'hash') return current;
  const created = { type: 'hash', value: new Map() };
  memoryStore.set(key, created);
  return created;
}

const redisClient = {
  async set(key, value, options) {
    if (useMemoryFallback) {
      memoryStore.set(key, { type: 'string', value: String(value) });
      if (options && options.EX) scheduleExpiry(key, options.EX);
      return 'OK';
    }
    return client.set(key, value, options);
  },

  async get(key) {
    if (useMemoryFallback) {
      const entry = memoryStore.get(key);
      if (!entry || entry.type !== 'string') return null;
      return entry.value;
    }
    return client.get(key);
  },

  async del(key) {
    if (useMemoryFallback) {
      const timer = memoryExpiryTimers.get(key);
      if (timer) clearTimeout(timer);
      memoryExpiryTimers.delete(key);
      return memoryStore.delete(key);
    }
    return client.del(key);
  },

  async expire(key, ttlSeconds) {
    if (useMemoryFallback) {
      if (!memoryStore.has(key)) return 0;
      scheduleExpiry(key, ttlSeconds);
      return 1;
    }
    return client.expire(key, ttlSeconds);
  },

  async hSet(key, obj) {
    if (useMemoryFallback) {
      const hash = ensureHash(key);
      for (const [field, value] of Object.entries(obj || {})) {
        hash.value.set(field, String(value));
      }
      return Object.keys(obj || {}).length;
    }
    return client.hSet(key, obj);
  },

  async hGetAll(key) {
    if (useMemoryFallback) {
      const entry = memoryStore.get(key);
      if (!entry || entry.type !== 'hash') return {};
      return Object.fromEntries(entry.value.entries());
    }
    return client.hGetAll(key);
  },

  async hIncrBy(key, field, amount) {
    if (useMemoryFallback) {
      const hash = ensureHash(key);
      const current = parseInt(hash.value.get(field) || '0', 10);
      const next = current + Number(amount || 0);
      hash.value.set(field, String(next));
      return next;
    }
    return client.hIncrBy(key, field, amount);
  },

  on(event, cb) {
    if (!useMemoryFallback) client.on(event, cb);
  },
};

module.exports = redisClient;
