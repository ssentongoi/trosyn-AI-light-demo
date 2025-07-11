import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import path from 'path';
import { randomUUID } from 'crypto';
import { createServer, Server as HttpServer } from 'http';
import { logger, stream } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import responseEnhancer from './middleware/response.middleware';
import { config } from './config/config';

// Extend Express Request type to include custom properties
declare global {
  namespace Express {
    interface Request {
      id?: string;  // Make id optional to match other declarations
      requestTime?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Initialize express app
const app: Application = express();

// Create HTTP server
const server: HttpServer = createServer(app);

// 1. GLOBAL MIDDLEWARE

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// Enable CORS with specific options
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
}));

// Development logging
if (config.nodeEnv === 'development') {
  app.use(morgan('combined', { 
    stream,
    skip: (req) => req.path === '/health' // Skip logging for health checks
  }));
  logger.info('Morgan HTTP request logging enabled');
}

// Add request ID and response time headers
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  const startTime = process.hrtime();
  
  // Add request ID to request and response
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Add request time
  req.requestTime = new Date().toISOString();
  
  // Log the request
  const { method, originalUrl, ip, headers } = req;
  logger.info(`[${requestId}] ${method} ${originalUrl}`, {
    ip,
    userAgent: headers['user-agent'],
    referer: headers.referer || 'direct',
  });
  
  // Add response time header
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = (seconds * 1e3 + nanoseconds / 1e6).toFixed(2);
    
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Skip logging for health checks
    if (req.path !== '/health') {
      logger.info(`[${requestId}] ${method} ${originalUrl} - ${res.statusCode} [${duration}ms]`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length') || '0',
      });
    }
  });
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.max || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => req.ip || 'unknown-ip',
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later',
      requestId: req.id,
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks and internal requests
    return req.path === '/health' || req.ip === '::1' || req.ip === '127.0.0.1';
  },
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ 
  limit: config.requestLimit || '10kb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: config.requestLimit || '10kb',
  parameterLimit: 50,
  type: 'application/x-www-form-urlencoded'
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`NoSQL injection attempt detected`, {
      requestId: req.id,
      key,
      ip: req.ip,
      url: req.originalUrl,
    });
  }
}));

// Data sanitization against XSS
// xss-clean middleware with safe defaults
// This will strip out any potentially dangerous HTML
app.use(xss({
  allowedTags: [], // No tags allowed by default
  allowedAttributes: {}, // No attributes allowed by default
  allowComments: false, // Disable HTML comments
  allowDocType: false, // Disable DOCTYPE declarations
  allowDataAttributes: false // Disable data-* attributes
}));

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'filter',
      'sort',
      'limit',
      'page',
      'fields',
      'populate',
    ],
  })
);

// Compression middleware
app.use(
  compression({
    level: 6, // Compression level (0-9, where 0 is no compression and 9 is maximum compression)
    threshold: '1kb', // Only compress responses larger than 1kb
    filter: (req: Request, res: Response) => {
      // Skip compression for certain content types
      if (req.headers['x-no-compression'] || 
          req.headers['content-type']?.includes('image') ||
          req.headers['content-type']?.includes('video') ||
          req.headers['content-type']?.includes('audio') ||
          req.headers['content-encoding'] === 'gzip') {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Response enhancer middleware (adds custom response methods)
app.use(responseEnhancer);

// 2. ROUTES

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: 'connected', // You can add database connection status here
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    cpuUsage: process.cpuUsage()
  };

  return res.sendSuccess(healthCheck, 'Service is healthy');
});

// API documentation route
app.get('/api-docs', (_req: Request, res: Response) => {
  // You can serve API documentation here or redirect to your API docs
  res.redirect('https://documenter.getpostman.com/view/your-api-docs');
});

// Serve static files in production
if (config.nodeEnv === 'production') {
  const publicPath = path.join(__dirname, 'public');
  
  // Serve static files with cache control
  app.use(express.static(publicPath, {
    maxAge: '1y', // Cache for 1 year
    etag: true,
    lastModified: true,
    setHeaders: (res: Response, path: string) => {
      // Set longer cache for static assets
      if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.jpg') || path.endsWith('.png')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  
  // Handle SPA - serve index.html for all other routes
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// 404 handler - handle any route that doesn't match
app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString()
  });
});

// Error handling - must be the last middleware
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  
  if (reason instanceof Error) {
    logger.error(`Reason: ${reason.message}`, {
      name: reason.name,
      stack: reason.stack,
      promise: promise
    });
  } else {
    logger.error(`Reason: ${String(reason)}`);
  }
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(`Name: ${err.name}, Message: ${err.message}`, {
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Close server & exit process after giving time to log the error
  setTimeout(() => {
    server.close(() => {
      process.exit(1);
    });
  }, 1000);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  
  // Close all connections and exit gracefully
  server.close(() => {
    logger.info('💥 Process terminated!');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if something is blocking the graceful shutdown
  setTimeout(() => {
    logger.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
});

// Handle process exit
process.on('exit', (code: number) => {
  logger.info(`Process exiting with code ${code}`);
});

// Handle unhandled promise rejections in the global scope
process.on('rejectionHandled', (promise: Promise<unknown>) => {
  logger.warn('A promise rejection was handled asynchronously', { promise });
});

// Handle multiple resolves in the same promise
process.on('multipleResolves', (type: string, promise: Promise<unknown>, value: unknown) => {
  logger.error('Multiple resolves detected for a promise', {
    type,
    promise,
    value,
    timestamp: new Date().toISOString()
  });
});

export { app };
