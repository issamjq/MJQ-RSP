'use strict';

/**
 * Minimal structured logger.
 * Replace with winston/pino in a larger deployment.
 */

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function log(level, message, meta = {}) {
  if (levels[level] > levels[currentLevel]) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(Object.keys(meta).length ? { meta } : {}),
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else {
    console.log(output);
  }
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
