import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import {logger} from './utils/logger.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';

class AuthServiceApp {
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
      contentSecurityPolicy: false, crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
          ? [process.env.FRONTEND_URL as string] //If i need to make frontend
          : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        },
      },
    }));

    // Body parsing
    this.app.use(express.json({limit: '10mb'}));
    this.app.use(express.urlencoded({extended: true, limit: '10mb'}));

    // Trust proxy
    this.app.set('trust proxy', 1);

    // General rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 100, // limit each IP to 100 requests per windowMs
    }));
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    });

    // Auth routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/user', userRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Auth Service API',
        version: '1.0.0',
        endpoints: {
          health: '/health', auth: '/api/auth', user: '/api/user',
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false, error: {
          message: `Route ${req.originalUrl} not found`, code: 'ROUTE_NOT_FOUND',
        },
      });
    });

    // Global error handler
    this.app.use((
        error: any, req: express.Request, res: express.Response,
        next: express.NextFunction,
    ) => {
      logger.error('Global error handler:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
      });

      res.status(error.statusCode || 500).json({
        success: false, error: {
          message: error.message || 'Internal Server Error',
          timestamp: new Date().toISOString(),
        },
      });
    });
  }

  public getExpressApp(): express.Application {
    return this.app;
  }
}

export default AuthServiceApp;
