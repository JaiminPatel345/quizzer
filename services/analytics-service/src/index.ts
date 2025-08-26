// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  debug: process.env.NODE_ENV === 'development'
});

import AnalyticsServiceApp from './app.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';

const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.' : '127.0.0.1';
const PORT = Number(process.env.PORT) || Number(process.env.ANALYTICS_SERVICE_PORT) || process.env.NODE_ENV === 'production' ? 80 : 3005;

async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting Analytics Service...');

    // Connect to database
    await connectDatabase();

    // Initialize app
    const analyticsApp = new AnalyticsServiceApp();
    const app = analyticsApp.getExpressApp();

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`✅ Analytics Service running on http://${HOST}:${PORT} in ${NODE_ENV} mode`);
      logger.info(`Analytics Service running on http://${HOST}:${PORT} in ${NODE_ENV} mode`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`${signal} received, shutting down Analytics Service gracefully...`);
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('✅ Analytics Service shutdown complete');
          logger.info('Analytics Service shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start Analytics Service:', error);
    logger.error('Failed to start Analytics Service:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('❌ Analytics Service startup failed:', error);
  process.exit(1);
});
