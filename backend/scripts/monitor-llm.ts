import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { LlamaClient } from '../services/llama/llamaClient.js';

// Workaround for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Configuration
const CONFIG = {
  checkInterval: 5 * 60 * 1000, // 5 minutes
  logFile: './logs/llm-monitor.log',
  metricsFile: './logs/llm-metrics.json',
  maxLogEntries: 1000,
  llamaServerUrl: process.env.LLAMA_SERVER_URL || 'http://localhost:8080/completion',
};

// Ensure logs directory exists
if (!existsSync('./logs')) {
  mkdirSync('./logs');
}

// Initialize metrics file if it doesn't exist
if (!existsSync(CONFIG.metricsFile)) {
  writeFileSync(CONFIG.metricsFile, JSON.stringify({
    startTime: new Date().toISOString(),
    checks: 0,
    errors: 0,
    avgResponseTime: 0,
    history: []
  }, null, 2));
}

const client = new LlamaClient(CONFIG.llamaServerUrl);

// Log function with timestamp
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
  
  // Write to console
  console.log(logEntry.trim());
  
  // Append to log file
  writeFileSync(CONFIG.metricsFile, logEntry, { flag: 'a' });
}

// Load metrics
function loadMetrics() {
  try {
    const data = readFileSync(CONFIG.metricsFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    log('Error loading metrics, resetting', { error: error.message });
    return {
      startTime: new Date().toISOString(),
      checks: 0,
      errors: 0,
      avgResponseTime: 0,
      history: []
    };
  }
}

// Save metrics
function saveMetrics(metrics: any) {
  try {
    // Keep only the last N history entries
    if (metrics.history.length > CONFIG.maxLogEntries) {
      metrics.history = metrics.history.slice(-CONFIG.maxLogEntries);
    }
    
    writeFileSync(CONFIG.metricsFile, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Error saving metrics:', error);
  }
}

// Check LLM service health
async function checkServiceHealth() {
  const startTime = Date.now();
  let success = false;
  let responseTime = 0;
  let error = null;
  
  try {
    const testPrompt = 'Hello, are you working?';
    const response = await client.complete({
      prompt: testPrompt,
      n_predict: 5,
      temperature: 0.1
    });
    
    responseTime = Date.now() - startTime;
    success = !!response?.content;
    
    if (!success) {
      error = 'Empty response from LLM';
    }
  } catch (err) {
    responseTime = Date.now() - startTime;
    error = err.message;
    success = false;
  }
  
  // Update metrics
  const metrics = loadMetrics();
  metrics.checks++;
  
  if (!success) {
    metrics.errors++;
  }
  
  // Update average response time (exponential moving average)
  const alpha = 0.2; // Smoothing factor
  metrics.avgResponseTime = metrics.avgResponseTime 
    ? alpha * responseTime + (1 - alpha) * metrics.avgResponseTime
    : responseTime;
  
  // Add to history
  metrics.history.push({
    timestamp: new Date().toISOString(),
    responseTime,
    success,
    error: error || null
  });
  
  saveMetrics(metrics);
  
  // Log the result
  if (success) {
    log('LLM health check passed', { responseTime: `${responseTime}ms` });
  } else {
    log('LLM health check failed', { error, responseTime: `${responseTime}ms` });
  }
  
  return { success, responseTime, error };
}

// Start monitoring
function startMonitoring() {
  log('Starting LLM service monitoring', { 
    checkInterval: `${CONFIG.checkInterval}ms`,
    llamaServerUrl: CONFIG.llamaServerUrl
  });
  
  // Initial check
  checkServiceHealth().catch(error => {
    log('Error in initial health check', { error: error.message });
  });
  
  // Schedule periodic checks
  setInterval(() => {
    checkServiceHealth().catch(error => {
      log('Error in scheduled health check', { error: error.message });
    });
  }, CONFIG.checkInterval);
}

// Handle process termination
process.on('SIGINT', () => {
  log('Stopping LLM service monitoring');
  process.exit(0);
});

// Start the monitoring
startMonitoring();
