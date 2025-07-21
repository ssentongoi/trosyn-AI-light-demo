/**
 * Environment Configuration Types
 * 
 * This file contains TypeScript type definitions for environment configuration.
 */

interface EnvironmentFeatures {
  USE_MOCK_SERVICES: boolean;
  // Add other feature flags as needed
}

interface EnvironmentConfig {
  // Environment detection
  IS_BROWSER: boolean;
  IS_APP: boolean;
  
  // Development mode flags
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
  
  // Feature flags
  FEATURES: EnvironmentFeatures;
}

declare const env: EnvironmentConfig;

export default env;

export const IS_BROWSER: boolean;
export const IS_APP: boolean;
export const IS_DEVELOPMENT: boolean;
export const IS_PRODUCTION: boolean;
export const FEATURES: EnvironmentFeatures;
