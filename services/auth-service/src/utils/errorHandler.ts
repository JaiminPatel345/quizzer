import type { Response } from 'express';
import { logger } from './logger.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
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
  logger.error(`Error in ${functionName}:`, {
    message: error.message,
    stack: error.stack,
    functionName,
    timestamp: new Date().toISOString(),
    ...(error as AppError).statusCode && { statusCode: (error as AppError).statusCode }
  });

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = null;

  if ((error as AppError).isOperational) {
    statusCode = (error as AppError).statusCode || 500;
    message = error.message;
  } else if (error.name === 'ValidationError') {
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
  }

  const errorResponse: any = {
    success: false,
    error: {
      message,
      functionName,
      timestamp: new Date().toISOString()
    }
  };

  if (details) errorResponse.error.details = details;
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

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

export class BadRequestError extends CustomError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}
