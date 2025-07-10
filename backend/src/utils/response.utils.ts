import { Response } from 'express';
import { logger } from './logger';

/**
 * Standardized success response format
 * @param res Express Response object
 * @param data Data to send in the response
 * @param message Optional success message
 * @param statusCode HTTP status code (default: 200)
 */
export const sendSuccess = (
  res: Response,
  data: unknown = null,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Standardized error response format
 * @param res Express Response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 500)
 * @param error Optional error object (only included in development)
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: unknown
): void => {
  const response: Record<string, unknown> = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Error && error.stack) {
      response.stack = error.stack;
    }
  }

  // Log the error
  logger.error(`[${statusCode}] ${message}`, {
    statusCode,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  res.status(statusCode).json(response);
};

/**
 * Standardized validation error response
 * @param res Express Response object
 * @param errors Validation errors (e.g., from express-validator)
 * @param message Optional custom error message
 */
export const sendValidationError = (
  res: Response,
  errors: Record<string, string[]> | string[],
  message: string = 'Validation failed'
): void => {
  sendError(res, message, 400, { errors });
};

/**
 * Standardized not found response
 * @param res Express Response object
 * @param message Optional custom not found message
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): void => {
  sendError(res, message, 404);
};

/**
 * Standardized unauthorized response
 * @param res Express Response object
 * @param message Optional custom unauthorized message
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): void => {
  res.setHeader('WWW-Authenticate', 'Bearer');
  sendError(res, message, 401);
};

/**
 * Standardized forbidden response
 * @param res Express Response object
 * @param message Optional custom forbidden message
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden'
): void => {
  sendError(res, message, 403);
};

/**
 * Standardized rate limit exceeded response
 * @param res Express Response object
 * @param message Optional custom rate limit message
 */
export const sendRateLimitExceeded = (
  res: Response,
  message: string = 'Too many requests, please try again later'
): void => {
  res.setHeader('Retry-After', '3600'); // 1 hour
  sendError(res, message, 429);
};
