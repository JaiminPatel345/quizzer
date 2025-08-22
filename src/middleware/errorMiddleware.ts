import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import type { AppError } from '../utils/errorHandler.js';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Route ${req.originalUrl} not found`) as AppError;
  error.statusCode = 404;
  next(error);
};

export const globalErrorHandler = (
    error: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
  // Log the error
  logger.error('Global error handler:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Determine status code and message
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details: any = null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values((error as any).errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if ((error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry found';
    const field = Object.keys((error as any).keyValue)[0];
    details = { field, message: `${field} already exists` };
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON format';
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
