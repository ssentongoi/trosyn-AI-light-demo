import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { isDevelopment } from '../config';

let logStream: fs.WriteStream | null = null;

// This function initializes the logger's file stream.
// It's called lazily to ensure Electron's `app` is ready.
function initializeLogStream() {
  if (logStream) {
    return;
  }

  try {
    // Safely get the logs path, with a fallback for when `app` is not ready.
    const logsDir = app?.getPath('logs') || path.join(process.cwd(), 'logs');

    // Ensure the logs directory exists.
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, 'main.log');
    logStream = fs.createWriteStream(logFile, { flags: 'a' });

  } catch (error) {
    console.error('Failed to initialize log stream:', error);
  }
}

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type LogLevel = keyof typeof logLevels;

class Logger {
  private level: number;
  private context: string;

  constructor(context: string = 'Main', level: LogLevel = 'info') {
    this.context = context;
    this.level = logLevels[level];
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (logLevels[level] > this.level) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}\n`;
    
    // Always log to file
    initializeLogStream();
    if (logStream) {
      logStream.write(logMessage);
    }
    
    // In development, also log to console with colors
    if (isDevelopment || level === 'error') {
      const colors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[35m', // Magenta
        reset: '\x1b[0m'   // Reset
      };
      
      console[level === 'info' ? 'log' : level](
        `${colors[level]}[${timestamp}] [${level.toUpperCase()}] [${this.context}]${colors.reset}`,
        message,
        ...args
      );
    }
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  debug(message: string, ...args: any[]) {
    if (isDevelopment) {
      this.log('debug', message, ...args);
    }
  }
}

export const logger = new Logger('Main', isDevelopment ? 'debug' : 'info');

export default Logger;
