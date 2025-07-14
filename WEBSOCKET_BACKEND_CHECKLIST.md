# WebSocket + Backend Health Checklist

Use this checklist to diagnose and verify WebSocket and backend server connectivity issues.

## ✅ Server Health Check

1. **Backend Server Process**
   - [ ] Check if the backend server process is running
     ```bash
     # For Node.js
     ps aux | grep node
     
     # For Python
     ps aux | grep python
     ```

2. **Environment Verification**
   - [ ] Confirm the correct environment is loaded (development, production, etc.)
   - [ ] Check environment variables:
     ```bash
     # Node.js
     echo $NODE_ENV
     
     # Python
     echo $FLASK_ENV  # or $DJANGO_SETTINGS_MODULE
     ```

3. **Server Logs**
   - [ ] Check backend logs for:
     - Port number
     - Successful startup message
     - Any crash stack traces or unhandled errors
   - [ ] Look for WebSocket server initialization message

4. **Port Verification**
   - [ ] Verify the backend is listening on the expected port:
     ```bash
     # Linux/macOS
     lsof -i :<PORT>
     # or
     netstat -an | grep <PORT>
     
     # Windows
     netstat -ano | findstr :<PORT>
     ```

## ✅ WebSocket Setup Check

5. **WebSocket Server Configuration**
   - [ ] Verify WebSocket server is created with correct binding:
     ```javascript
     // Standalone WebSocket server
     const wss = new WebSocket.Server({ port: 8080 });
     
     // Or with HTTP server
     const wss = new WebSocket.Server({ server: httpServer });
     ```

6. **Port Conflict Check**
   - [ ] Ensure no other process is using the WebSocket port:
     ```bash
     lsof -i :<WEBSOCKET_PORT>
     ```

7. **Event Verification**
   - [ ] Confirm WebSocket server emits:
     - `connection` event
     - `message` event
     - `close` event
   - [ ] Add logging for WebSocket events:
     ```javascript
     wss.on('connection', (ws) => {
       console.log('New WebSocket connection');
       ws.on('message', (message) => {
         console.log('Received:', message);
       });
     });
     ```

## ✅ Frontend Connection Check

8. **WebSocket URL**
   - [ ] Verify frontend connects to the correct WebSocket URL:
     - Development: `ws://localhost:<PORT>`
     - Production: `wss://your-domain.com`
   - [ ] Check for hardcoded URLs in frontend code

9. **Browser DevTools**
   - [ ] Open DevTools > Network > WS tab
   - [ ] Look for WebSocket connection
   - [ ] Verify `101 Switching Protocols` response
   - [ ] Check for any failed connection attempts

10. **Browser Console**
    - [ ] Check for WebSocket errors:
      - `WebSocket connection to 'ws://...' failed`
      - `ECONNREFUSED`
      - `ERR_CONNECTION_REFUSED`

## ✅ Proxy or HTTPS Considerations

11. **Reverse Proxy Configuration**
    - [ ] If using nginx/Apache, verify WebSocket support:
      ```nginx
      location /ws/ {
          proxy_pass http://backend;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_set_header Host $host;
      }
      ```

12. **HTTPS/WSS**
    - [ ] If using HTTPS, ensure WebSocket uses `wss://`
    - [ ] For self-signed certificates, ensure they're trusted
    - [ ] Check for mixed content warnings

## ✅ Electron-Specific Check (if relevant)

13. **Electron Setup**
    - [ ] WebSocket initialized in preload or main process
    - [ ] Proper contextBridge setup:
      ```javascript
      // preload.js
      const { contextBridge, ipcRenderer } = require('electron');
      
      contextBridge.exposeInMainWorld('electron', {
        send: (channel, data) => ipcRenderer.send(channel, data),
        on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
      });
      ```
    - [ ] `contextIsolation` properly configured

## 🔍 Debugging Steps

1. **Test WebSocket Server**
   ```bash
   # Using wscat
   npm install -g wscat
   wscat -c ws://localhost:<PORT>
   
   # Or with curl
   curl --include \
        --no-buffer \
        --header "Connection: Upgrade" \
        --header "Upgrade: websocket" \
        --header "Host: localhost:<PORT>" \
        --header "Origin: http://localhost:<PORT>" \
        --header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
        --header "Sec-WebSocket-Version: 13" \
        http://localhost:<PORT>/
   ```

2. **Network Analysis**
   - [ ] Use Wireshark or tcpdump to monitor WebSocket traffic
   - [ ] Check firewall rules blocking WebSocket ports

3. **Logging**
   - [ ] Add detailed logging on both client and server
   - [ ] Log WebSocket handshake headers
   - [ ] Monitor WebSocket frame exchange

## 📝 Status Report

After completing all checks, document findings:

### ✅ Working Connections
- [ ] Backend server
- [ ] WebSocket server
- [ ] Frontend connection
- [ ] Data flow

### ❌ Issues Found
- [ ] List any issues
- [ ] Document error messages
- [ ] Note which checks failed

### 🔄 Next Steps
- [ ] Immediate actions
- [ ] Required configuration changes
- [ ] Testing needed

## 📚 Additional Resources
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Node.js WebSocket Server](https://github.com/websockets/ws)
