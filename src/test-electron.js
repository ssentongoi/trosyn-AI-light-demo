const { app, BrowserWindow } = require('electron')

console.log('Electron app:', app)
console.log('Electron version:', process.versions.electron)

app.whenReady().then(() => {
  console.log('App is ready')
  const win = new BrowserWindow({ width: 800, height: 600 })
  win.loadURL('https://electronjs.org')
})
