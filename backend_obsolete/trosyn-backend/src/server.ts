import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer, Server } from 'http';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const server = createServer(app);

export { server as httpServer };

// Configuration
const PORT = process.env.PORT || (process.env.NODE_ENV === 'test' ? 3001 : 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';

// Security headers configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
};

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'test' ? '*' : process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(helmet(helmetConfig));
app.use(cors(corsOptions));
app.use(express.json());

// Only use morgan in development
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };

  res.status(200).json(healthCheck);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found'
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  const errorResponse = {
    status: 'error',
    message: 'Something went wrong!',
    ...(NODE_ENV === 'development' || NODE_ENV === 'test' ? { 
      error: err.message, 
      stack: err.stack,
      name: err.name
    } : {})
  };

  // Log error in development/test or for server errors in production
  if (NODE_ENV !== 'production') {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    console.error(err.stack);
  }

  res.status(500).json(errorResponse);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider restarting the server or handling the error appropriately
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Consider restarting the server or handling the error appropriately
  process.exit(1);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Start server
const startServer = () => {
  return new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`Server is running in ${NODE_ENV} mode on http://localhost:${PORT}`);
      resolve();
    });
  });
};

// Only start the server if this file is run directly (not when imported for tests)
if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Export for testing
export { app, server, startServer };

export default app;
