const { app, BrowserWindow } = require("electron");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
  });

  win.loadURL('https://ynoproject.net/');
};

app.whenReady().then(() => {
  createWindow();
});
