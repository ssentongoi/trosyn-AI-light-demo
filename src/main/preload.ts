const { contextBridge, ipcRenderer } = require('electron')

// Type definitions for the exposed API
interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Simple type for the API we're exposing
const electronAPI: ElectronAPI = {
  // Example API method
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  
  // Add more methods as needed
  on: (channel: string, callback: (...args: any[]) => void): void => {
    // Whitelist channels
    const validChannels = ['app:version']
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (_event: any, ...args: any[]) => callback(...args))
    }
  },
  
  // Remove event listeners
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
