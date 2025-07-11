import { config } from '../config/config';
import { format, createLogger, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

declare module 'winston' {
  // Add custom log levels
  interface Logform {
    timestamp: string;
    level: string;
    message: string;
    [key: string]: unknown;
  }
}

const { combine, timestamp, printf, colorize, json } = format;

// Define log format
const logFormat = printf(({ level, message, timestamp: time, ...meta }) => {
  let log = `${time} [${level}]: ${message}`;
  
  // Add metadata if it exists
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');

// Define different log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
// @ts-ignore - Add colors to winston
format.colorize().addColors(colors);

// Filter out HTTP logs in test environment
const httpFilter = format((info) => {
  return info.level === 'http' ? false : info;
});

// Define which transports the logger should use
const getTransports = (): (transports.ConsoleTransportInstance | DailyRotateFile)[] => {
  const transportList: (transports.ConsoleTransportInstance | DailyRotateFile)[] = [
    // Console transport with colors
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        logFormat
      ),
    }),
  ];

  // In production, also log to files
  if (config.nodeEnv === 'production') {
    // Error logs
    transportList.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
        format: combine(timestamp(), json()),
      })
    );

    // All logs
    transportList.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(timestamp(), json()),
      })
    );
  }

  return transportList;
};

// Create the logger instance
const logger = createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info', // Log everything in development, only info and above in production
  levels,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    config.nodeEnv === 'development' ? format.simple() : format.json(),
    format.errors({ stack: true }),
    config.nodeEnv === 'production' ? httpFilter() : format.simple()
  ),
  transports: getTransports(),
  exitOnError: false, // Don't exit on handled exceptions
});

// Create a stream object with a 'write' function that will be used by `morgan`
interface StreamOptions {
  write: (message: string) => void;
}

const stream: StreamOptions = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export { logger, stream };
