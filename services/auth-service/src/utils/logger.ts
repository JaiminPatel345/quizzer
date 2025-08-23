import winston from 'winston';
import path from 'path';
import { mkdirSync } from 'fs';

const logsDir = path.resolve(process.cwd(), 'logs');
try {
  mkdirSync(logsDir, { recursive: true });
  console.log('📁 Logs directory created at:', logsDir);
} catch (error) {
  console.warn('⚠️  Could not create logs directory:', error);
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      return log;
    })
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  ],
  exceptionHandlers: [
    new winston.transports.Console({ format: consoleFormat })
  ],
  rejectionHandlers: [
    new winston.transports.Console({ format: consoleFormat })
  ]
});

try {
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880,
    maxFiles: 5,
    format: logFormat
  }));

  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 5242880,
    maxFiles: 5,
    format: logFormat
  }));
} catch (error) {
  console.warn('⚠️  File logging disabled:', error);
}

logger.info('Auth Service Logger initialized successfully');
