import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

class RedisConnection {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<RedisClientType> {
    try {
      if (this.client && this.isConnected) {
        return this.client;
      }

      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not defined');
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
        }
      });

      // Event handlers
      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;

    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}

export const redisConnection = new RedisConnection();

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisConnection.disconnect();
});

process.on('SIGTERM', async () => {
  await redisConnection.disconnect();
});
