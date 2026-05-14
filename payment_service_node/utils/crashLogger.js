const CrashLog = require('../models/CrashLog');
const mongoose = require('mongoose');

// WHY: A fast, in-memory ring buffer ensures we have the last 50 events leading up to a crash, using minimal memory
class CrashLogger {
    constructor() {
        this.buffer = [];
        this.maxSize = 50;
        
        // WHY: Bind methods so they can be safely destructured like { log } = require(...)
        this.log = this.log.bind(this);
        this.saveCrashLog = this.saveCrashLog.bind(this);
    }

    log(message, meta = {}) {
        // Pass through to console for standard docker/pm2 logging
        if (Object.keys(meta).length) {
            console.log(message, meta);
        } else {
            console.log(message);
        }

        this.buffer.push({
            message,
            meta,
            timestamp: new Date()
        });

        // WHY: FIFO auto-trimming prevents memory leaks
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }

    async saveCrashLog(error) {
        // WHY: Wrap in try/catch to ensure we don't cause an infinite crash loop if DB is down
        try {
            console.error("\n[CRASH LOGGER] FATAL ERROR DETECTED. Attempting to save crash log...");
            
            // Allow string errors (rejections) or standard Error objects
            const message = typeof error === 'string' ? error : (error?.message || 'Unknown Error');
            const stack = error?.stack || 'No stack trace available';

            // WHY: Only save if DB is actually connected
            if (mongoose.connection.readyState === 1) {
                await CrashLog.create({
                    message,
                    stack,
                    logs_before_crash: this.buffer
                });
                console.error("[CRASH LOGGER] Crash log saved successfully to MongoDB.");
            } else {
                console.error("[CRASH LOGGER] Database not connected. Could not save to DB.");
                console.error("[CRASH LOGGER] Error Message:", message);
                console.error("[CRASH LOGGER] Stack Trace:", stack);
            }
        } catch (dbError) {
            // WHY: Console fallback if DB fails during the crash phase
            console.error("[CRASH LOGGER] FAILED to save crash log to DB:", dbError.message);
            console.error("[CRASH LOGGER] Original crash context:", JSON.stringify(this.buffer, null, 2));
        }
    }
}

module.exports = new CrashLogger();
