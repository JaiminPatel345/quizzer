import type {NextFunction, Request, Response} from 'express';
import type {Schema} from 'joi';
import {BadRequestError, handleError} from '../utils/errorHandler.js';

export const validateRequest = (schema: {
  body?: Schema; query?: Schema; params?: Schema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: string[] = [];

      // Validate request body
      if (schema.body) {
        const {error} = schema.body.validate(req.body);
        if (error) {
          errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      // Validate query parameters
      if (schema.query) {
        const {error} = schema.query.validate(req.query);
        if (error) {
          errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      // Validate route parameters
      if (schema.params) {
        const {error} = schema.params.validate(req.params);
        if (error) {
          errors.push(`Params: ${error.details.map(d => d.message).
              join(', ')}`);
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
