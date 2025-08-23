import mongoose from 'mongoose';
import {logger} from '../utils/logger.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    const options = {
      maxPoolSize: 10, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000,
    };

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, options);

    console.log('✅ MongoDB connected successfully');
    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host, name: mongoose.connection.name,
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    console.error('❌ Analytics Service database connection failed:', error);
    logger.error('Analytics Service database connection failed:', error);
    throw error;
  }
};
