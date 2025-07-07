// Minimal test file to verify Electron app object
const { app } = require('electron');

console.log('Electron app object:', app);
console.log('App path:', app.getAppPath());

app.whenReady().then(() => {
  console.log('App is ready!');
  app.quit();
});
