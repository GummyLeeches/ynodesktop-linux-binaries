const { app, BrowserWindow, session, ipcMain } = require("electron");
const DiscordRPC = require("discord-rpc");
const Store = require("electron-store");
const promptInjection = require("./promptinjection");
const titlebar = require("./titlebar");
const path = require('path')

const store = new Store();

const client = new DiscordRPC.Client({ transport: "ipc" });
client.login({ clientId: "1028080411772977212" }).catch(console.error);

const mappedIcons = [
  "amillusion",
  "answeredprayers",
  "braingirl",
  "deepdreams",
  "flow",
  "someday",
  "unevendream",
  "yno-logo",
  "yume2kki",
  "yumenikki",
];

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1052,
    height: 768,
    title: "Yume Nikki Online Project",
    icon: "logo.png",
    resizable: false,
    frame: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  var loopInterval = null;
  win.setMenu(null);
  win.setTitle("Yume Nikki Online Project");

  win.on("close", () => {
    saveSession();
    client.clearActivity();
    clearInterval(loopInterval);
    client.destroy();
    win.destroy();
  });

  win.webContents.on("did-finish-load", () => {
    promptInjection(win); // Custom prompt hack
    win.webContents.executeJavaScript(`if (document.title != "Yume Nikki Online Project") {
      document.getElementById('content').style.overflow = 'hidden'
      window.scrollTo(0, 0)}`) // Disable scroll ingame
  });

  win.webContents.on("did-start-loading", () => {
    titlebar(win); // Custom titlebar hack
  });

  win.loadURL("https://ynoproject.net/").then(() => {
    loopInterval = setInterval(() => {
      clientLoop(win);
      //win.webContents.openDevTools();
    }, 1000);
  });
};

app.whenReady().then(() => {
  // Load login session from disk
  if (store.get("sessionId")) {
    session.defaultSession.cookies.set({
      url: "https://ynoproject.net",
      name: "sessionId",
      value: store.get("sessionId"),
      sameSite: "strict",
    });
  }
  ipcMain.on('minimize', () => {
    BrowserWindow.getFocusedWindow().minimize();
  });
  createWindow();
});

function clientLoop(win) {
  const web = win.webContents;
  web.executeJavaScript(`document.title`).then((title) => {
    let splitTitle = title.split(" - ");
    if (splitTitle[1]?.trim() == "YNOproject") {
      updatePresence(web, splitTitle[0].trim());
    } else {
      updatePresence(web);
    }
  });
}

function updatePresence(web, gamename = null) {
  if (!client) return;
  web.executeJavaScript("window.onbeforeunload=null;");

  if (gamename == null) {
    client.setActivity({
      largeImageKey: "yno-logo",
      largeImageText: "Yume Nikki Online Project",
      details: "Choosing a game...",
      instance: false,
    });
  } else {
    web
      .executeJavaScript(
        `
        (function() {
          return {
            name: window.location.pathname.replaceAll('/', ''),
            location: document.querySelector("#locationText > a")?.textContent,
            connected: document.querySelector("#connStatusText")?.textContent
          }
        })()
      `
      )
      .then((data) => {
        const condensedName = gamename
          .toLowerCase()
          .replace(" ", "")
          .replace(".", "");
        client.setActivity({
          largeImageKey: mappedIcons.includes(condensedName)
            ? condensedName + "-icon"
            : `https://ynoproject.net/images/door_${data.name}.gif`,
          largeImageText: gamename,
          smallImageKey: "yno-logo",
          smallImageText: "Yume Nikki Online Project",
          details: "Dreaming on " + gamename,
          state: data.connected === "Connected" ? data.location : undefined,
          instance: false,
        });
      });
  }
}

function saveSession() {
  session.defaultSession.cookies
    .get({ url: "https://ynoproject.net" })
    .then((cookies) => {
      const sess = cookies.find((cookie) => cookie.name == "sessionId");
      if (sess) store.set("sessionId", sess.value);
    });
}
