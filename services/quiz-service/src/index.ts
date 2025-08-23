// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  debug: process.env.NODE_ENV === 'development'
});

import QuizServiceApp from './app.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';

const PORT = process.env.QUIZ_SERVICE_PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting Quiz Service...');

    // Connect to database
    await connectDatabase();

    // Initialize app
    const quizApp = new QuizServiceApp();
    const app = quizApp.getExpressApp();


    // Start server
    const server = app.listen(PORT, () => {
      console.log(`✅ Quiz Service running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`Quiz Service running on port ${PORT} in ${NODE_ENV} mode`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`${signal} received, shutting down Quiz Service gracefully...`);
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('✅ Quiz Service shutdown complete');
          logger.info('Quiz Service shutdown complete');
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
    console.error('❌ Failed to start Quiz Service:', error);
    logger.error('Failed to start Quiz Service:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('❌ Quiz Service startup failed:', error);
  process.exit(1);
});
