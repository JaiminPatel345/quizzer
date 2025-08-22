import type { Request, Response, NextFunction } from 'express';
import type { Schema } from 'joi';
import { handleError, BadRequestError } from '../utils/errorHandler.js';

export const validateRequest = (schema: {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: string[] = [];

      // Validate request body
      if (schema.body) {
        const { error } = schema.body.validate(req.body);
        if (error) {
          errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      // Validate query parameters
      if (schema.query) {
        const { error } = schema.query.validate(req.query);
        if (error) {
          errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      // Validate route parameters
      if (schema.params) {
        const { error } = schema.params.validate(req.params);
        if (error) {
          errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      if (errors.length > 0) {
        throw new BadRequestError(`Validation failed: ${errors.join('; ')}`);
      }

      next();
    } catch (error) {
      handleError(res, 'validateRequest', error as Error);
    }
  };
};

// Common validation helpers
export const validateObjectId = (value: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateDateRange = (from?: string, to?: string): { isValid: boolean; error?: string } => {
  if (!from && !to) {
    return { isValid: true };
  }

  if (from && isNaN(Date.parse(from))) {
    return { isValid: false, error: 'Invalid from date format' };
  }

  if (to && isNaN(Date.parse(to))) {
    return { isValid: false, error: 'Invalid to date format' };
  }

  if (from && to && new Date(from) > new Date(to)) {
    return { isValid: false, error: 'From date cannot be after to date' };
  }

  return { isValid: true };
};
