import type { Response } from 'express';
import { logger } from './logger.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string | number;
  path?: string;
  value?: any;
  errors?: any;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (res: Response, functionName: string, error: AppError | Error): void => {
  // Log the error with context
  logger.error(`Error in ${functionName}:`, {
    message: error.message,
    stack: error.stack,
    functionName,
    timestamp: new Date().toISOString(),
    ...(error as AppError).statusCode && { statusCode: (error as AppError).statusCode }
  });

  // Determine status code and message
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = null;

  if ((error as AppError).isOperational) {
    // Operational error - safe to send to client
    statusCode = (error as AppError).statusCode || 500;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values((error as any).errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  } else if (error.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId)
    statusCode = 400;
    message = 'Invalid ID format';
  } else if ((error as any).code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    message = 'Duplicate entry found';
    const field = Object.keys((error as any).keyValue)[0];
    details = { field, message: `${field} already exists` };
  } else if (error.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'SyntaxError') {
    // JSON parsing error
    statusCode = 400;
    message = 'Invalid JSON format';
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    error: {
      message,
      functionName,
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error: Error) => {
      handleError(res, fn.name || 'asyncHandler', error);
    });
  };
};

// Specific error classes
export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

export class BadRequestError extends CustomError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}
