// MUST be the very first imports - before anything else
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Fix for ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Configure dotenv with explicit path to root .env
dotenv.config({
    path: path.resolve(process.cwd(), '.env'),
    debug: process.env.NODE_ENV === 'development', // Shows dotenv debug info
});
// Verify environment variables are loaded (remove after testing)
console.log('=== Environment Variables Check ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('REDIS_URL exists:', !!process.env.REDIS_URL);
console.log('====================================');
// Now import other modules AFTER dotenv is configured
import App from './app.js';
import { logger } from './utils/logger.js';
// Validate required environment variables
const requiredEnvVars = [
    'MONGODB_URI',
    'REDIS_URL',
    'JWT_SECRET',
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('Current working directory:', process.cwd());
    console.error('Looking for .env file at:', path.resolve(process.cwd(), '.env'));
    process.exit(1);
}
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
async function startServer() {
    try {
        console.log('🚀 Starting server initialization...');
        // Initialize application
        const app = new App();
        await app.initialize();
        // Start server
        const server = app.getExpressApp().listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
            console.log(`📱 API endpoints available at http://localhost:${PORT}/api`);
            console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
            // Also log with winston
            logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
        });
        // Graceful shutdown handlers
        const gracefulShutdown = (signal) => {
            console.log(`${signal} received, shutting down gracefully...`);
            logger.info(`${signal} received, shutting down gracefully...`);
            server.close(async () => {
                console.log('HTTP server closed');
                logger.info('HTTP server closed');
                try {
                    // Close database connections
                    const { disconnectDatabase } = await import('./config/database.js');
                    const { redisConnection } = await import('./config/redis.js');
                    await disconnectDatabase();
                    await redisConnection.disconnect();
                    console.log('All connections closed successfully');
                    logger.info('All connections closed successfully');
                    process.exit(0);
                }
                catch (error) {
                    console.error('Error during shutdown:', error);
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
        };
        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
startServer().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map