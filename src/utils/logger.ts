import winston from 'winston';
import path from 'path';
import { mkdirSync } from 'fs';

// Create logs directory if it doesn't exist
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
  defaultMeta: { service: 'quiz-app-backend' },
  transports: [
    // Console transport - ALWAYS show in development
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug' // Show all logs in console
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],

  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Add file transports only if logs directory exists
try {
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: logFormat
  }));

  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: logFormat
  }));

  console.log('✅ File logging configured');
} catch (error) {
  console.warn('⚠️  File logging disabled:', error);
}

// Test the logger
logger.info('Logger initialized successfully');
logger.debug('Debug logging enabled');
