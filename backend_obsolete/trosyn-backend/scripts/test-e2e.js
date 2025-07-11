const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3002'; // Using a different port to avoid conflicts

// Paths
const rootDir = path.resolve(__dirname, '..');
const serverPath = path.join(rootDir, 'dist', 'server.js');

// Check if server is already running
function isPortInUse(port) {
  try {
    require('net').connect({ port }).on('error', () => {}).end();
    return true;
  } catch (err) {
    return false;
  }
}

// Start the server
async function startServer() {
  if (isPortInUse(process.env.PORT)) {
    console.log(`Port ${process.env.PORT} is already in use. Trying to kill existing process...`);
    try {
      await new Promise((resolve) => {
        const killCmd = process.platform === 'win32' 
          ? `taskkill /F /IM node.exe /FI "WINDOWTITLE eq node*"`
          : `pkill -f "node.*server" || true`;
        
        require('child_process').exec(killCmd, (error) => {
          if (error) {
            console.warn('Could not kill existing process:', error.message);
          }
          resolve(null);
        });
      });
    } catch (err) {
      console.warn('Error killing existing process:', err);
    }
  }

  return new Promise((resolve, reject) => {
    console.log('Starting test server...');
    const serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe',
      cwd: rootDir
    });

    let serverStarted = false;
    const startupTimeout = 10000; // 10 seconds
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        serverProcess.kill();
        reject(new Error(`Server failed to start within ${startupTimeout}ms`));
      }
    }, startupTimeout);

    // Log server output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server] ${output}`);
      
      // Check for server ready message
      if (output.includes('Server is running')) {
        clearTimeout(timeout);
        serverStarted = true;
        console.log('Test server started successfully');
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data}`);
    });

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start server: ${error.message}`));
    });

    serverProcess.on('exit', (code) => {
      if (!serverStarted) {
        clearTimeout(timeout);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
  });
}

// Run tests
async function runTests() {
  let serverProcess;
  
  try {
    // Start the server
    serverProcess = await startServer();
    
    // Wait a bit for the server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run Cypress tests
    console.log('Running Cypress tests...');
    const { exec } = require('child_process');
    // Unset the problematic environment variable that causes Cypress to fail on macOS
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    const cypress = exec('npx cypress run --config-file cypress.config.ts', {
      cwd: rootDir,
      env: { ...env, FORCE_COLOR: '1' }
    });

    cypress.stdout.pipe(process.stdout);
    cypress.stderr.pipe(process.stderr);
    
    await new Promise((resolve, reject) => {
      cypress.on('close', (code) => {
        if (code === 0) {
          console.log('Cypress tests completed successfully');
          resolve();
        } else {
          reject(new Error(`Cypress tests failed with code ${code}`));
        }
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    if (serverProcess) {
      console.log('Stopping test server...');
      serverProcess.kill();
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT. Cleaning up...');
  process.exit(0);
});

// Run the tests
runTests().catch(error => {
  console.error('Test run failed:', error);
  process.exit(1);
});
