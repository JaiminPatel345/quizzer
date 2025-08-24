// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  debug: process.env.NODE_ENV === 'development'
});

import mongoose from 'mongoose';
import AuthServiceApp from './app.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = Number(process.env.PORT) || Number(process.env.AUTH_SERVICE_PORT) || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting Auth Service...');

    // Connect to database
    await connectDatabase();

    // Initialize app
    const authApp = new AuthServiceApp();
    const app = authApp.getExpressApp();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`✅ Auth Service running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`Auth Service running on port ${PORT} in ${NODE_ENV} mode`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`${signal} received, shutting down Auth Service gracefully...`);
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('✅ Auth Service shutdown complete');
          logger.info('Auth Service shutdown complete');
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
    console.error('❌ Failed to start Auth Service:', error);
    logger.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('❌ Auth Service startup failed:', error);
  process.exit(1);
});
