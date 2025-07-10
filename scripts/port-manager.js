const { exec, spawn } = require('child_process');
const portfinder = require('portfinder');
const kill = require('kill-port');
const path = require('path');
const fs = require('fs');
const util = require('util');

const DEFAULT_PORT = 3001;
const MAX_PORT_ATTEMPTS = 10;
const MAX_ELECTRON_RETRIES = 3;
const VITE_STARTUP_TIMEOUT = 30000; // 30 seconds

// Enable debug logging
const DEBUG = true;
const LOG_FILE = 'port-manager-debug.log';

// Track child processes
const childProcesses = [];

// Clear log file at start
if (fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

// Helper to log to both console and file
function debugLog(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? '\n' + (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : ''}`;
  
  if (DEBUG) {
    console.log(logMessage);
  }
  
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Helper function to log with timestamps
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Log to console based on level
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else if (DEBUG || level !== 'debug') {
    console.log(logMessage);
  }
  
  // Always write to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
  }
}

// Helper function to execute a command with better error handling
function executeCommand(command, options = {}) {
  log(`Executing command: ${command}`, 'debug');
  return new Promise((resolve, reject) => {
    log(`Executing: ${command}`, 'debug');
    
    const execOptions = {
      ...options,
      cwd: options.cwd || process.cwd(),
      env: { 
        ...process.env, 
        ...(options.env || {}),
        FORCE_COLOR: '1' // Force colors in output
      },
      maxBuffer: 1024 * 1024 * 5 // 5MB buffer for large outputs
    };
    
    log(`Command options: ${JSON.stringify(execOptions, null, 2)}`, 'debug');
    
    const child = exec(command, execOptions);
    let stdout = '';
    let stderr = '';

    // Pipe output to our logger
    child.stdout.on('data', (data) => {
      const strData = data.toString();
      stdout += strData;
      log(`[STDOUT] ${strData.trim()}`, 'debug');
      if (options.stdio !== 'ignore') {
        process.stdout.write(data);
      }
    });

    child.stderr.on('data', (data) => {
      const strData = data.toString();
      stderr += strData;
      log(`[STDERR] ${strData.trim()}`, 'error');
      if (options.stdio !== 'ignore') {
        process.stderr.write(data);
      }
    });

    child.on('error', (error) => {
      log(`Command error: ${error.message}`, 'error');
      reject(error);
    });

    child.on('close', (code, signal) => {
      log(`Command exited with code ${code} and signal ${signal}`, 'debug');
      
      if (code === 0) {
        resolve({ code, signal, stdout, stderr });
      } else {
        const error = new Error(`Command failed with code ${code}`);
        error.code = code;
        error.signal = signal;
        error.stdout = stdout;
        error.stderr = stderr;
        log(`Command failed: ${error.message}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`, 'error');
        reject(error);
      }
    });
  });
}

// Clean up all child processes
function cleanup() {
  log('Cleaning up child processes...', 'info');
  childProcesses.forEach(proc => {
    if (!proc.killed) {
      log(`Killing process ${proc.pid}`, 'debug');
      proc.kill('SIGTERM');
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  log('Received SIGINT. Cleaning up...', 'info');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM. Cleaning up...', 'info');
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.stack || error.message}`, 'error');
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${util.inspect(promise)}. Reason: ${reason}`, 'error');
});

async function startApp() {
  try {
    log('Starting application...', 'info');
    log(`Current working directory: ${process.cwd()}`, 'debug');
    log(`Node version: ${process.version}`, 'debug');
    log(`Platform: ${process.platform} ${process.arch}`, 'debug');
    
    // Ensure we're in the correct directory
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found. Please run this script from the project root.');
    }

    // Check if Vite is installed
    try {
      const { stdout: viteVersion } = await executeCommand('yarn vite --version', { stdio: 'pipe' });
      log(`Vite version: ${viteVersion.trim()}`, 'info');
    } catch (error) {
      log('Vite is not installed or not in PATH. Installing Vite...', 'warn');
      await executeCommand('yarn add -D vite');
    }

    // Kill any existing processes on the default port range
    log(`🔍 Checking for processes on ports ${DEFAULT_PORT} to ${DEFAULT_PORT + MAX_PORT_ATTEMPTS - 1}...`, 'info');
    
    const killPromises = [];
    for (let port = DEFAULT_PORT; port < DEFAULT_PORT + MAX_PORT_ATTEMPTS; port++) {
      killPromises.push(
        kill(port, 'tcp')
          .then(() => log(`✅ Killed processes on port ${port}`, 'debug'))
          .catch(error => {
            // Ignore errors when no process is found
            if (!error.message.includes('No process running on port')) {
              log(`⚠️  Warning killing port ${port}: ${error.message}`, 'warn');
            } else {
              log(`ℹ️  No processes found on port ${port}`, 'debug');
            }
          })
      );
    }
    
    // Wait for all port kills to complete
    await Promise.all(killPromises);
    log('✅ Port cleanup complete', 'info');

    // Find an available port
    log(`🔍 Finding an available port starting from ${DEFAULT_PORT}...`, 'info');
    let port;
    try {
      port = await portfinder.getPortPromise({
        port: DEFAULT_PORT,
        stopPort: DEFAULT_PORT + MAX_PORT_ATTEMPTS - 1,
        host: 'localhost'
      });
      log(`✅ Found available port: ${port}`, 'info');
    } catch (error) {
      log(`❌ Failed to find an available port: ${error.message}`, 'error');
      process.exit(1);
    }

    // Start Vite
    log(`🚀 Starting Vite on port ${port}...`, 'info');
    
    const viteCommand = `vite`;
    const viteArgs = [
      '--port', port,
      '--host', 'localhost',
      '--mode', 'development',
      '--debug'
    ];
    
    log(`Executing Vite: ${viteCommand} ${viteArgs.join(' ')}`, 'debug');
    
    const vite = spawn('yarn', [viteCommand, ...viteArgs], { 
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        FORCE_COLOR: '1',
        DEBUG: 'vite:*',
        ELECTRON_RUN_AS_NODE: '1' // Prevent Electron from being loaded as a Node module
      },
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // Track the Vite process
    childProcesses.push(vite);
    
    // Add process tracking for cleanup
    vite.on('exit', (code, signal) => {
      const index = childProcesses.indexOf(vite);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }
    });

    // Handle Vite output
    let isViteReady = false;
    let viteStartupTimeout = setTimeout(() => {
      if (!isViteReady) {
        const error = new Error(`Vite failed to start within ${VITE_STARTUP_TIMEOUT/1000} seconds`);
        log(`❌ ${error.message}`, 'error');
        if (vite) {
          log('Vite process info:', 'error');
          log(`  PID: ${vite.pid}`, 'error');
          log(`  Killed: ${vite.killed}`, 'error');
          log(`  Exit code: ${vite.exitCode}`, 'error');
          log(`  Signal: ${vite.signalCode}`, 'error');
        }
        process.exit(1);
      }
    }, VITE_STARTUP_TIMEOUT);

    // Buffer to collect output
    let viteOutputBuffer = '';
    
    const processViteOutput = (data) => {
      const output = data.toString();
      viteOutputBuffer += output;
      
      // Split by lines and process each line
      const lines = viteOutputBuffer.split('\n');
      viteOutputBuffer = lines.pop() || ''; // Keep the last incomplete line
      
      for (const line of lines) {
        if (line.trim()) {
          log(`[Vite] ${line}`, 'debug');
          
          // Check if Vite is ready
          if ((line.includes('Local') || line.includes('Network') || line.includes('ready in') || 
               line.includes('server running at')) && !isViteReady) {
            clearTimeout(viteStartupTimeout);
            isViteReady = true;
            log('✅ Vite dev server is ready', 'info');
            startElectron(port).catch(error => {
              log(`❌ Failed to start Electron: ${error.message}`, 'error');
              process.exit(1);
            });
          }
        }
      }
    };
    
    vite.stdout.on('data', processViteOutput);
    vite.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      // Filter out common non-error messages
      if (!errorOutput.includes('deprecated') && 
          !errorOutput.includes('warning') &&
          !errorOutput.includes('sourcemap') &&
          !errorOutput.includes('source map')) {
        log(`[Vite Error] ${errorOutput.trim()}`, 'error');
      } else {
        log(`[Vite Warning] ${errorOutput.trim()}`, 'debug');
      }
    });

    // Handle Vite process exit
    vite.on('exit', (code, signal) => {
      clearTimeout(viteStartupTimeout);
      const index = childProcesses.indexOf(vite);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }
      
      if (code !== 0 && code !== null) {
        log(`❌ Vite process exited with code ${code} and signal ${signal}`, 'error');
        if (!isViteReady) {
          log('Vite failed to start. Check the logs above for errors.', 'error');
          process.exit(1);
        }
      } else {
        log('ℹ️  Vite process exited', 'info');
      }
    });

  } catch (error) {
    log(`❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

async function compileTypeScript() {
  log('🔨 Compiling TypeScript files...', 'info');
  try {
    // Use the project's build script to compile TypeScript
    await executeCommand('yarn build:main');
    log('✅ TypeScript compilation completed', 'info');
    return true;
  } catch (error) {
    log(`❌ TypeScript compilation failed: ${error.message}`, 'error');
    return false;
  }
}

async function startElectron(port, retryCount = 0) {
  log(`⚡ Starting Electron (attempt ${retryCount + 1}/${MAX_ELECTRON_RETRIES})...`, 'info');
  
  // Compile TypeScript first
  const compiled = await compileTypeScript();
  if (!compiled) {
    throw new Error('TypeScript compilation failed');
  }
  
  // Ensure we have the correct path to Electron
  const electronPath = path.resolve(process.cwd(), 'node_modules/.bin/electron');
  const electronArgs = [
    '--inspect=5858',  // Enable debugger
    '.'
  ];
  
  log(`Executing Electron: ${electronPath} ${electronArgs.join(' ')}`, 'debug');
  
  const electronEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined, // Ensure Electron runs in GUI mode
    VITE_PORT: port.toString(),
    ELECTRON_ENABLE_LOGGING: '1',
    DEBUG: 'electron*,main,renderer',
    NODE_OPTIONS: '--trace-warnings --unhandled-rejections=strict',
    ELECTRON_FORCE_WINDOW_MENU_BAR: '1',
    NODE_ENV: 'development',
    IS_ELECTRON: 'true'
  };

  log('Electron environment variables:', 'debug');
  Object.entries(electronEnv).forEach(([key, value]) => {
    if (key.includes('ELECTRON') || key.includes('NODE') || key.includes('VITE')) {
      log(`  ${key}=${value}`, 'debug');
    }
  });

  const electron = spawn(electronPath, electronArgs, {
    cwd: process.cwd(),
    env: electronEnv,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    windowsHide: true
  });
  
  // Track the Electron process
  childProcesses.push(electron);

  // Handle Electron output
  let electronOutputBuffer = '';
  let isElectronReady = false;
  const electronStartupTimeout = setTimeout(() => {
    if (!isElectronReady) {
      log(`⚠️  Electron is taking too long to start. Check for errors above.`, 'warn');
    }
  }, 10000); // 10 second timeout

  const processElectronOutput = (data) => {
    const output = data.toString();
    electronOutputBuffer += output;
    
    // Split by lines and process each line
    const lines = electronOutputBuffer.split('\n');
    electronOutputBuffer = lines.pop() || ''; // Keep the last incomplete line
    
    for (const line of lines) {
      if (line.trim()) {
        log(`[Electron] ${line}`, 'debug');
        
        // Check if Electron is ready
        if ((line.includes('Window loaded') || line.includes('App ready') || 
             line.includes('Loading app from:')) && !isElectronReady) {
          clearTimeout(electronStartupTimeout);
          isElectronReady = true;
          log('✅ Electron app is running', 'info');
        }
      }
    }
  };

  electron.stdout.on('data', processElectronOutput);
  
  electron.stderr.on('data', (data) => {
    const errorOutput = data.toString();
    // Filter out common non-error messages
    if (!errorOutput.includes('Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED') &&
        !errorOutput.includes('DeprecationWarning') &&
        !errorOutput.includes('sourcemap') &&
        !errorOutput.includes('source map')) {
      log(`[Electron Error] ${errorOutput.trim()}`, 'error');
    } else {
      log(`[Electron Warning] ${errorOutput.trim()}`, 'debug');
    }
  });

  // Handle Electron process exit
  electron.on('exit', (code, signal) => {
    clearTimeout(electronStartupTimeout);
    const index = childProcesses.indexOf(electron);
    if (index > -1) {
      childProcesses.splice(index, 1);
    }
    
    log(`Electron process exited with code ${code} and signal ${signal}`, 'info');
    
    // Handle non-zero exit code with retry logic
    if (code !== 0 && code !== null) {
      log(`❌ Electron process exited with an error`, 'error');
      
      if (retryCount < MAX_ELECTRON_RETRIES - 1) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        log(`🔄 Retrying Electron in ${delay/1000} seconds... (${retryCount + 2}/${MAX_ELECTRON_RETRIES})`, 'warn');
        
        setTimeout(() => {
          startElectron(port, retryCount + 1).catch(error => {
            log(`❌ Failed to restart Electron: ${error.message}`, 'error');
            process.exit(1);
          });
        }, delay);
      } else {
        log(`❌ Max retries (${MAX_ELECTRON_RETRIES}) reached for Electron. Giving up.`, 'error');
        process.exit(1);
      }
    } else if (code === 0) {
      log('✅ Electron app closed successfully', 'info');
      // Exit the port manager when Electron closes cleanly
      setTimeout(() => process.exit(0), 100);
    }
  });

  // Handle Electron process errors
  electron.on('error', (error) => {
    clearTimeout(electronStartupTimeout);
    log(`❌ Failed to start Electron: ${error.message}`, 'error');
    log(error.stack, 'error');
    
    if (retryCount < MAX_ELECTRON_RETRIES - 1) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      log(`🔄 Retrying Electron in ${delay/1000} seconds... (${retryCount + 2}/${MAX_ELECTRON_RETRIES})`, 'warn');
      
      setTimeout(() => {
        startElectron(port, retryCount + 1).catch(error => {
          log(`❌ Failed to restart Electron: ${error.message}`, 'error');
          process.exit(1);
        });
      }, delay);
    } else {
      log(`❌ Max retries (${MAX_ELECTRON_RETRIES}) reached for Electron. Giving up.`, 'error');
      process.exit(1);
    }
  });

  return electron;
}

// Start the application
startApp();
