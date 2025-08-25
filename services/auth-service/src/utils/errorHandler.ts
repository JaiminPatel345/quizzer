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
    statusCode: (error as AppError).statusCode
  });

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = null;

  // Check if it's our custom operational error
  if ((error as AppError).isOperational && (error as AppError).statusCode) {
    statusCode = (error as AppError).statusCode!;
    message = error.message;
  }
  // Check for specific custom error types
  else if (error instanceof BadRequestError) {
    statusCode = 400;
    message = error.message;
  }
  else if (error instanceof NotFoundError) {
    statusCode = 404;
    message = error.message;
  }
  else if (error instanceof UnauthorizedError) {
    statusCode = 401;
    message = error.message;
  }
  // Handle axios errors from service calls
  else if ((error as any).response) {
    const axiosError = error as any;
    statusCode = axiosError.response.status || 500;
    
    // Try to extract the error message from the response
    if (axiosError.response.data?.error?.message) {
      message = axiosError.response.data.error.message;
    } else if (axiosError.response.data?.message) {
      message = axiosError.response.data.message;
    } else {
      message = axiosError.message || 'Service communication error';
    }
    
    // Extract additional details if available
    if (axiosError.response.data?.error?.details) {
      details = axiosError.response.data.error.details;
    }
  }
  else if (error.name === 'ValidationError') {
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
      statusCode,
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
