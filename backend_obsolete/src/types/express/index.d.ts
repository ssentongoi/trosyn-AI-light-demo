// Type definitions for Express
import { Request, Response, NextFunction } from 'express';

/**
 * Extend the Express Request type to include custom properties
 * that we add to the request object in our middleware.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Timestamp when the request was received
       * Added by the requestTime middleware
       */
      requestTime?: string;
      
      /**
       * Authenticated user information
       * Added by the authentication middleware
       */
      user?: {
        id: string;
        email: string;
        role?: string;
        [key: string]: unknown;
      };
      
      /**
       * Request ID for tracing
       * Added by the request ID middleware
       */
      id?: string;
    }
    
    /**
     * Extend the Response type to include custom methods
     */
    interface Response {
      /**
       * Send a success response with a standardized format
       */
      sendSuccess: (data: unknown, message?: string, statusCode?: number) => void;
      
      /**
       * Send an error response with a standardized format
       */
      sendError: (message: string, statusCode?: number, error?: unknown) => void;
    }
  }
}

// Export the extended types for use in other files
export {};
