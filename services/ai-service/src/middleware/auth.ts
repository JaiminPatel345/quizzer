import type { Response, NextFunction } from 'express';
import { getAuthServiceClient } from '../config/serviceClient.js';
import { handleError, UnauthorizedError } from '../utils/errorHandler.js';
import type { AuthRequest } from '../types/index.js';

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

    // Validate token with auth service
    try {
      const authServiceClient = getAuthServiceClient();
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
      req.userId = authResponse.data.user._id as any;

      next();
    } catch (serviceError: any) {
      if (serviceError.response?.status === 401) {
        throw new UnauthorizedError('Invalid or expired token');
      }
      throw new Error('Authentication service unavailable');
    }

  } catch (error) {
    handleError(res, 'authenticateToken', error as Error);
  }
};
