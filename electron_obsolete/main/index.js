import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}
// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;
const createWindow = async () => {
    // Create the browser window with common options
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false, // Don't show until ready-to-show
        titleBarStyle: 'hiddenInset', // Better looking title bar
        backgroundColor: '#ffffff'
    });
    // Load the index.html file or the dev server
    if (process.env.NODE_ENV === 'development') {
        await mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    // Show window when page is ready
    mainWindow.on('ready-to-show', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
    // Dereference the window object when closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};
// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();
    // On macOS it's common to re-create a window when the dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
// IPC handlers can be added here
ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
});
