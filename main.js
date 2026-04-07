delete process.env.ELECTRON_RUN_AS_NODE;

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const llm = require('./llm');

let mainWindow;
let tray;
let commandWindow;
let settingsWindow;

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) { }
  return {};
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: 200,
    x: 0,
    y: height - 160,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.loadFile('index.html');
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
}

function createCommandWindow() {
  if (commandWindow && !commandWindow.isDestroyed()) {
    commandWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  commandWindow = new BrowserWindow({
    width: 520,
    height: 600,
    x: Math.floor(width / 2 - 260),
    y: Math.floor(height / 2 - 300),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  commandWindow.loadFile('command.html');
  commandWindow.on('closed', () => {
    commandWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 280,
    x: Math.floor(width / 2 - 225),
    y: Math.floor(height / 2 - 140),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTrayIcon() {
  const svgPath = path.join(__dirname, 'assets', 'tray-icon.svg');
  if (!fs.existsSync(svgPath)) return nativeImage.createEmpty();
  const svgContent = fs.readFileSync(svgPath, 'utf-8');
  const base64 = Buffer.from(svgContent).toString('base64');
  const img = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${base64}`);
  return img.resize({ width: 16, height: 16 });
}

function executeAction(action) {
  const knownApps = {
    'notepad': 'notepad',
    'chrome': 'chrome',
    'calculator': 'calc',
    'calc': 'calc',
    'explorer': 'explorer',
    'files': 'explorer',
    'cmd': 'cmd',
    'terminal': 'cmd',
    'paint': 'mspaint',
    'settings': 'ms-settings:',
    'task manager': 'taskmgr',
    'taskmgr': 'taskmgr',
    'control panel': 'control',
    'control': 'control',
    'vscode': 'code',
    'vs code': 'code',
  };

  switch (action.type) {
    case 'open_app': {
      const target = (action.target || '').toLowerCase();
      const appCmd = knownApps[target] || target;
      exec(`start "" "${appCmd}"`, { shell: 'cmd.exe' }, () => { });
      return `Opened ${action.target}`;
    }
    case 'open_path': {
      exec(`start "" "${action.target}"`, { shell: 'cmd.exe' }, () => { });
      return `Opened ${action.target}`;
    }
    case 'search_web': {
      const url = `https://www.google.com/search?q=${encodeURIComponent(action.query)}`;
      shell.openExternal(url);
      return `Searching: ${action.query}`;
    }
    case 'open_url': {
      let url = action.url;
      if (!url.startsWith('http')) url = 'https://' + url;
      shell.openExternal(url);
      return `Opening ${url}`;
    }
    case 'run_command': {
      exec(action.command, { shell: 'cmd.exe' }, () => { });
      return `Ran: ${action.command}`;
    }
    default:
      return null;
  }
}

app.whenReady().then(() => {
  const config = loadConfig();
  if (config.apiKey) {
    llm.initialize(config.apiKey);
  }

  createWindow();

  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayImage;
  if (fs.existsSync(trayIconPath)) {
    trayImage = nativeImage.createFromPath(trayIconPath);
  } else {
    trayImage = createTrayIcon();
  }
  if (trayImage.isEmpty()) trayImage = nativeImage.createEmpty();

  tray = new Tray(trayImage);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Chat', click: () => createCommandWindow() },
    { label: 'Settings', click: () => createSettingsWindow() },
    {
      label: 'Show/Hide Agent', click: () => {
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Humungousaur Agent');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => createCommandWindow());
});

ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.on('open-command-panel', () => {
  createCommandWindow();
});

ipcMain.on('check-api-key', (event) => {
  event.reply('api-key-status', llm.isInitialized());
});

ipcMain.on('save-api-key', (event, apiKey) => {
  try {
    llm.initialize(apiKey);
    saveConfig({ apiKey });
    event.reply('api-key-saved', { success: true });
    if (commandWindow && !commandWindow.isDestroyed()) {
      commandWindow.webContents.send('api-key-status', true);
    }
  } catch (e) {
    event.reply('api-key-saved', { success: false, error: e.message });
  }
});

ipcMain.on('get-api-key', (event) => {
  const config = loadConfig();
  event.reply('current-api-key', config.apiKey || '');
});

ipcMain.on('chat-message', async (event, message) => {
  if (!llm.isInitialized()) {
    event.reply('chat-response', {
      message: "RAWR! I need my power source first! Set up your Gemini API key in Settings (right-click my tray icon).",
      action: null
    });
    return;
  }

  try {
    const response = await llm.sendMessage(message);

    if (response.action) {
      const actionResult = executeAction(response.action);
      event.reply('chat-response', {
        message: response.message || actionResult,
        action: response.action,
        actionResult
      });
    } else {
      event.reply('chat-response', {
        message: response.message,
        action: null
      });
    }
  } catch (e) {
    let errorMsg = e.message || 'Unknown error';
    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('401')) {
      errorMsg = "GRRR! That API key is busted! Check your Gemini API key in Settings.";
    } else if (errorMsg.includes('RATE_LIMIT') || errorMsg.includes('429')) {
      errorMsg = "Whoa, slow down! Even I need a breather. Try again in a moment.";
    } else {
      errorMsg = `Something went wrong: ${errorMsg}`;
    }
    event.reply('chat-response', { message: errorMsg, action: null, error: true });
  }
});

ipcMain.on('reset-chat', () => {
  llm.resetChat();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
