import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { 
  sendSuccess, 
  sendError, 
  sendValidationError, 
  sendNotFound, 
  sendUnauthorized, 
  sendForbidden, 
  sendRateLimitExceeded 
} from '../utils/response.utils';

// Extend the Express Response type to include our custom methods
declare global {
  namespace Express {
    interface Response {
      sendSuccess: (data?: unknown, message?: string, statusCode?: number) => void;
      sendError: (message: string, statusCode?: number, error?: unknown) => void;
      sendValidationError: (errors: Record<string, string[]> | string[], message?: string) => void;
      sendNotFound: (message?: string) => void;
      sendUnauthorized: (message?: string) => void;
      sendForbidden: (message?: string) => void;
      sendRateLimitExceeded: (message?: string) => void;
    }
  }
}

/**
 * Middleware to enhance the Express Response object with custom methods
 * for sending standardized responses.
 * 
 * This middleware adds the following methods to the response object:
 * - sendSuccess: Send a successful response with optional data and message
 * - sendError: Send an error response with status code and error details
 * - sendValidationError: Send a 400 response with validation errors
 * - sendNotFound: Send a 404 Not Found response
 * - sendUnauthorized: Send a 401 Unauthorized response
 * - sendForbidden: Send a 403 Forbidden response
 * - sendRateLimitExceeded: Send a 429 Too Many Requests response
 */
export const responseEnhancer = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Add custom response methods to the response object
    res.sendSuccess = function(
      data: unknown = null,
      message: string = 'Success',
      statusCode: number = 200
    ) {
      return sendSuccess(this, data, message, statusCode);
    };

    res.sendError = function(
      message: string,
      statusCode: number = 500,
      error?: unknown
    ) {
      return sendError(this, message, statusCode, error);
    };

    res.sendValidationError = function(
      errors: Record<string, string[]> | string[],
      message: string = 'Validation failed'
    ) {
      return sendValidationError(this, errors, message);
    };

    res.sendNotFound = function(message: string = 'Resource not found') {
      return sendNotFound(this, message);
    };

    res.sendUnauthorized = function(message: string = 'Unauthorized') {
      return sendUnauthorized(this, message);
    };

    res.sendForbidden = function(message: string = 'Forbidden') {
      return sendForbidden(this, message);
    };

    res.sendRateLimitExceeded = function(
      message: string = 'Too many requests, please try again later'
    ) {
      return sendRateLimitExceeded(this, message);
    };

    next();
  } catch (error) {
    // If there's an error setting up the response methods, log it and continue
    logger.error('Error setting up response methods', { error });
    next(error);
  }
};

// Export the middleware as default
export default responseEnhancer;
