import type { Response, NextFunction } from 'express';
import {
  getAuthServiceClient,
} from '../config/serviceClient.js';
import { handleError, UnauthorizedError, ServiceUnavailableError } from '../utils/errorHandler.js';
import type {AuthRequest} from '../types/index.js';
import {logger} from '../utils/logger.js';

export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const authServiceClient = getAuthServiceClient()

    // Validate token with auth service
    try {
      const authResponse = await authServiceClient.post<{
        success: boolean;
        data: {
          user: {
            _id: string;
            username: string;
            email: string;
          };
          isValid: boolean;
        };
      }>('/api/auth/validate', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!authResponse.success || !authResponse.data.isValid) {
        throw new UnauthorizedError('Invalid token');
      }

      req.user = authResponse.data.user;
      req.userId =authResponse.data.user._id as any ;

      next();
    } catch (serviceError: any) {
      // Handle connection errors (service unavailable)
      if (serviceError?.code === 'ECONNREFUSED' ||
          serviceError?.code === 'ETIMEDOUT' ||
          serviceError?.code === 'ENOTFOUND' ||
          serviceError?.cause?.code === 'ECONNREFUSED') {
        logger.error('Auth service connection failed:', {
          code: serviceError.code,
          message: serviceError.message,
          url: serviceError.config?.url
        });
        throw new ServiceUnavailableError('Authentication service');
      }

      // Handle HTTP response errors
      if (serviceError?.response?.status === 401) {
        throw new UnauthorizedError('Invalid or expired token');
      }

      if (serviceError?.response?.status) {
        logger.error('Auth service error:', {
          status: serviceError.response.status,
          statusText: serviceError.response.statusText,
          url: serviceError.config?.url
        });
        throw new ServiceUnavailableError('Authentication service');
      }

      // Log unexpected errors
      logger.error('Unexpected auth service error:', {
        message: serviceError.message,
        stack: serviceError.stack
      });
      throw new ServiceUnavailableError('Authentication service');
    }

  } catch (error) {
    handleError(res, 'authenticateToken', error as Error);
  }
};
