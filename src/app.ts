import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { connectDatabase, redisConnection } from './config/index.js';
import { generalLimiter, notFoundHandler, globalErrorHandler } from './middleware/index.js';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for API
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
          ? ['https://your-frontend-domain.com']
          : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compression middleware
    this.app.use(compression());

    // HTTP request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        }
      }
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Rate limiting
    this.app.use(generalLimiter);
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'AI-Powered Quiz Application API',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth',
          quiz: '/api/quiz',
          submission: '/api/submission',
          leaderboard: '/api/leaderboard',
          notification: '/api/notification'
        },
        documentation: 'https://api-docs-url.com'
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(globalErrorHandler);
  }

  public async initialize(): Promise<void> {
    try {
      // Connect to MongoDB
      await connectDatabase();
      logger.info('MongoDB connection established');

      // Connect to Redis
      await redisConnection.connect();
      logger.info('Redis connection established');

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Application initialization failed:', error);
      throw error;
    }
  }

  public getExpressApp(): express.Application {
    return this.app;
  }
}

export default App;
