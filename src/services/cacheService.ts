import { redisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

class CacheService {
  private defaultTTL = parseInt(process.env.CACHE_TTL || '300'); // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = redisConnection.getClient();
      if (!client || !redisConnection.isClientConnected()) {
        logger.warn('Redis not connected, cache miss for key:', key);
        return null;
      }

      const cached = await client.get(key);
      if (!cached) return null;

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const client = redisConnection.getClient();
      if (!client || !redisConnection.isClientConnected()) {
        logger.warn('Redis not connected, skipping cache set for key:', key);
        return false;
      }

      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;

      await client.setEx(key, expiration, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  }

  async del(key: string | string[]): Promise<boolean> {
    try {
      const client = redisConnection.getClient();
      if (!client || !redisConnection.isClientConnected()) {
        return false;
      }

      const keys = Array.isArray(key) ? key : [key];
      await client.del(keys);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = redisConnection.getClient();
      if (!client || !redisConnection.isClientConnected()) {
        return false;
      }

      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  }

  async flush(): Promise<boolean> {
    try {
      const client = redisConnection.getClient();
      if (!client || !redisConnection.isClientConnected()) {
        return false;
      }

      await client.flushDb();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  // Specific cache methods for the application
  generateQuizCacheKey(userId: string, grade: number, subject: string, difficulty: string): string {
    return `quiz:${userId}:${grade}:${subject}:${difficulty}`;
  }

  generateUserHistoryCacheKey(userId: string, filters: any): string {
    const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `history:${userId}:${filterHash}`;
  }

  generateLeaderboardCacheKey(type: string, grade?: number, subject?: string): string {
    return `leaderboard:${type}:${grade || 'all'}:${subject || 'all'}`;
  }

  async cacheQuizData(key: string, quiz: any): Promise<boolean> {
    const quizTTL = parseInt(process.env.QUIZ_CACHE_TTL || '1800'); // 30 minutes
    return await this.set(key, quiz, quizTTL);
  }

  async cacheLeaderboard(key: string, leaderboard: any): Promise<boolean> {
    const leaderboardTTL = parseInt(process.env.LEADERBOARD_CACHE_TTL || '300'); // 5 minutes
    return await this.set(key, leaderboard, leaderboardTTL);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const client = redisConnection.getClient();
      if (!client || !redisConnection.isClientConnected()) {
        return;
      }

      // Get all keys related to this user
      const keys = await client.keys(`*${userId}*`);
      if (keys.length > 0) {
        await this.del(keys);
        logger.info(`Invalidated ${keys.length} cache entries for user ${userId}`);
      }
    } catch (error) {
      logger.error('Error invalidating user cache:', { userId, error });
    }
  }

  async invalidateLeaderboardCache(): Promise<void> {
    try {
      const client = redisConnection.getClient();
      if (!client || !redisConnection.isClientConnected()) {
        return;
      }

      const keys = await client.keys('leaderboard:*');
      if (keys.length > 0) {
        await this.del(keys);
        logger.info(`Invalidated ${keys.length} leaderboard cache entries`);
      }
    } catch (error) {
      logger.error('Error invalidating leaderboard cache:', error);
    }
  }
}

export const cacheService = new CacheService();
