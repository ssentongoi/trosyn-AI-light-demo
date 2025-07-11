import dotenv from 'dotenv';
import { app } from 'electron';
import path from 'path';

// Helper function to safely get app path
const getAppPath = () => {
  try {
    return app?.getAppPath() || process.cwd();
  } catch (error) {
    return process.cwd();
  }
};

// Load environment variables from .env file
dotenv.config({
  path: path.join(getAppPath(), '.env')
});

const isPackaged = () => {
  try {
    return app?.isPackaged || false;
  } catch (error) {
    return false;
  }
};

export const isDevelopment = process.env.NODE_ENV === 'development' || !isPackaged();
export const isProduction = !isDevelopment;

const getAppName = () => {
  try {
    return app?.getName() || 'TrosynAI';
  } catch (error) {
    return 'TrosynAI';
  }
};

const getAppVersion = () => {
  try {
    return app?.getVersion() || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
};

export const config = {
  app: {
    name: getAppName(),
    version: getAppVersion(),
  },
  renderer: {
    port: process.env.VITE_PORT || 3001,
    url: isDevelopment 
      ? `http://localhost:${process.env.VITE_PORT || 3001}`
      : `file://${path.join(__dirname, '../renderer/index.html')}`
  },
  database: {
    name: 'trosyn-db',
    version: '1.0.0'
  },
  isDevelopment,
  isProduction
} as const;

export type AppConfig = typeof config;
