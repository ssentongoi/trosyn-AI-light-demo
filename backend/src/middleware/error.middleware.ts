import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Extended error interface with additional properties
 * that our application might use
 */
interface AppError extends Error {
  statusCode?: number;
  status?: string;
  code?: string | number;
  details?: unknown;
  isOperational?: boolean;
  errors?: Record<string, unknown>;
  path?: string;
  value?: unknown;
  errmsg?: string;
}

/**
 * Determine if the error is an operational error
 * This is exported for testing purposes
 */
export const isOperationalError = (error: unknown): error is AppError => {
  return error instanceof Error && (error as AppError).isOperational === true;
};

/**
 * Handle JWT errors
 */
const handleJWTError = (): AppError => {
  const error = new Error('Invalid token. Please log in again!') as AppError;
  error.statusCode = 401;
  error.isOperational = true;
  return error;
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = (): AppError => {
  const error = new Error('Your token has expired! Please log in again.') as AppError;
  error.statusCode = 401;
  error.isOperational = true;
  return error;
};

/**
 * Handle MongoDB validation errors
 */
const handleValidationErrorDB = (err: AppError): AppError => {
  const errors = Object.values(err.errors || {}).map((el: unknown) => {
    if (el instanceof Error) {
      return el.message;
    }
    return 'Invalid input data';
  });
  
  const message = `Invalid input data. ${errors.join('. ')}`;
  const error = new Error(message) as AppError;
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

/**
 * Handle MongoDB duplicate field errors
 */
const handleDuplicateFieldsDB = (err: AppError): AppError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  const error = new Error(message) as AppError;
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

/**
 * Handle MongoDB cast errors
 */
const handleCastErrorDB = (err: AppError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  const error = new Error(message) as AppError;
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

/**
 * Send detailed error response in development
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode || 500).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    name: err.name
  });
};

/**
 * Send minimal error response in production
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};

/**
 * Global error handling middleware
 * Handles all errors thrown in routes
 */
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log the error with explicit properties
  const logContext: Record<string, unknown> = {
    name: err.name,
    stack: err.stack
  };
  
  if (err.details) logContext.details = err.details;
  if (err.code) logContext.code = err.code;
  
  logger.error(`[${err.statusCode}] ${err.message}`, logContext);
  
  // Handle different environments
  if (config.nodeEnv === 'development') {
    sendErrorDev(err, res);
  } else if (config.nodeEnv === 'production') {
    // Create a new error object with explicit properties to avoid spread issues
    const error: AppError = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      status: err.status,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details,
      isOperational: err.isOperational,
      errors: err.errors,
      path: err.path,
      value: err.value,
      errmsg: err.errmsg
    };
    
    // Ensure the error has the Error prototype methods
    Object.setPrototypeOf(error, Object.getPrototypeOf(err));
    
    // Handle specific error types in production
    if (error.name === 'JsonWebTokenError') {
      const jwtError = handleJWTError();
      Object.assign(error, jwtError);
    } else if (error.name === 'TokenExpiredError') {
      const jwtExpiredError = handleJWTExpiredError();
      Object.assign(error, jwtExpiredError);
    } else if (error.name === 'ValidationError') {
      const validationError = handleValidationErrorDB(error);
      Object.assign(error, validationError);
    } else if (error.name === 'CastError') {
      const castError = handleCastErrorDB(error);
      Object.assign(error, castError);
    } else if (error.code === 11000) {
      const duplicateError = handleDuplicateFieldsDB(error);
      Object.assign(error, duplicateError);
    }
    
    sendErrorProd(error, res);
  }
};

/**
 * Catch unhandled promise rejections
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    
    if (reason instanceof Error) {
      logger.error(`Unhandled Rejection at: ${promise}`, {
        reason: reason.message,
        stack: reason.stack
      });
    } else {
      logger.error(`Unhandled Rejection at: ${promise}`, { reason });
    }
    
    // Close server & exit process
    process.exit(1);
  });};

/**
 * Catch uncaught exceptions
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    logger.error(`Name: ${err.name}, Message: ${err.message}`, {
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    // Close server & exit process after giving time to log the error
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};
