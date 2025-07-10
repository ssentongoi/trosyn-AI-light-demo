import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  // Server
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  
  // File Storage
  documentsDir: string;
  maxFileSize: string;
  
  // CORS
  allowedOrigins: string[];
  
  // Logging
  logs: {
    level: string;
    dir: string;
  };
  
  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
  };
  
  // Database
  database: {
    url: string;
    name: string;
  };
  
  // Rate Limit
  rateLimit: {
    windowMs: number;
    max: number;
  };
  
  // Request Limit
  requestLimit: string;
  
  // CORS
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
  };
}

// Default configuration
const config: Config = {
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test' | undefined) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) 
    : ['http://localhost:3000', 'http://localhost:3001'],
  maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
  requestLimit: process.env.REQUEST_LIMIT || '10mb',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  logs: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d', // 1 day
  },
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017',
    name: process.env.DATABASE_NAME || 'trosyn-dev',
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS 
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-Request-ID',
      'X-Response-Time'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Response-Time',
      'Content-Disposition',
      'Content-Length'
    ]
  },
  documentsDir: process.env.DOCUMENTS_DIR || '',
};

// Validate required configurations
if (!config.documentsDir) {
  throw new Error('DOCUMENTS_DIR environment variable is required');
}

export { config };
