import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Example API method
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    // Add more methods as needed
    on: (channel, callback) => {
        // Whitelist channels
        const validChannels = ['app:version'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    // Remove event listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
