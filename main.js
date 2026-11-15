const { app, BrowserWindow, globalShortcut, ipcMain, screen, desktopCapturer, nativeImage, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs   = require('fs');
const { machineIdSync } = require('node-machine-id');

// ── Paths ──────────────────────────────────────────────────────────────────
const DATA_DIR     = path.join(app.getPath('userData'), 'Eluder');
const LICENSE_FILE = path.join(DATA_DIR, 'license.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Supabase Config ────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://yyqqpbobmsbkhutcdwqy.supabase.co';
const ANON_KEY     = 'sb_publishable_bKFL3oxenFBE7Chp8QZGug_BpC4Artl';

// ── Hardware ID ────────────────────────────────────────────────────────────
function getHwid() {
  try { return machineIdSync(true).toUpperCase().substring(0, 16); }
  catch { return require('os').hostname().toUpperCase().substring(0, 16); }
}

// ── License helpers ────────────────────────────────────────────────────────
function loadSavedToken() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const lf = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
    return lf.token || null;
  } catch { return null; }
}

function saveToken(token) {
  fs.writeFileSync(LICENSE_FILE, JSON.stringify({ token }), 'utf8');
}

function supabaseRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url     = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        'apikey':        ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        body ? 'return=minimal' : undefined,
      }
    };
    Object.keys(options.headers).forEach(k => options.headers[k] === undefined && delete options.headers[k]);
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function validateToken(token) {
  token = token.trim().toUpperCase();
  const hwid = getHwid();
  try {
    const r = await supabaseRequest('GET',
      `/rest/v1/licenses?token=eq.${encodeURIComponent(token)}&select=hwid,revoked&limit=1`);
    const rows = JSON.parse(r.body);
    if (!Array.isArray(rows) || rows.length === 0)
      return { ok: false, message: 'Invalid access token.' };
    const row = rows[0];
    if (row.revoked)
      return { ok: false, message: 'This token has been revoked.' };
    if (!row.hwid) {
      // Bind HWID on first activation
      await supabaseRequest('PATCH',
        `/rest/v1/licenses?token=eq.${encodeURIComponent(token)}`,
        { hwid, first_activated_at: new Date().toISOString() });
      saveToken(token);
      return { ok: true, message: 'Activated.' };
    }
    if (row.hwid === hwid) {
      saveToken(token);
      return { ok: true, message: 'OK' };
    }
    return { ok: false, message: 'Token already activated on a different device. Contact @Hackerseb on Telegram.' };
  } catch (e) {
    return { ok: false, message: `Network error: ${e.message}` };
  }
}

// ── Windows ────────────────────────────────────────────────────────────────
let mainWin    = null;
let licenseWin = null;

function createLicenseWindow() {
  licenseWin = new BrowserWindow({
    width:           480,
    height:          340,
    resizable:       false,
    frame:           false,
    transparent:     true,
    alwaysOnTop:     true,
    titleBarStyle:   'hidden',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    }
  });
  licenseWin.loadFile(path.join(__dirname, 'renderer', 'license.html'));
  licenseWin.on('closed', () => { licenseWin = null; });
}

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWin = new BrowserWindow({
    width:           800,
    height:          600,
    x:               Math.floor((width - 800) / 2),
    y:               Math.floor((height - 600) / 2),
    frame:           false,
    transparent:     true,
    alwaysOnTop:     true,
    hasShadow:       true,
    titleBarStyle:   'hidden',
    skipTaskbar:     true,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webviewTag:       true,     // allow <webview>
    }
  });

  // ── Screen capture exclusion ──
  // Mac: setContentProtection(true) hides from screenshots/screen recording
  // Windows: same call maps to SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
  mainWin.setContentProtection(true);

  mainWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWin.on('closed', () => { mainWin = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const savedToken = loadSavedToken();

  if (savedToken) {
    // Silently re-validate in background
    const result = await validateToken(savedToken);
    if (result.ok) {
      createMainWindow();
    } else {
      createLicenseWindow();
    }
  } else {
    createLicenseWindow();
  }

  // ── Global shortcuts ──
  globalShortcut.register('Alt+H', () => {
    if (mainWin) {
      mainWin.isVisible() ? mainWin.hide() : mainWin.show();
    }
  });
  globalShortcut.register('Alt+Q', () => { app.quit(); });
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC handlers ──────────────────────────────────────────────────────────
ipcMain.handle('validate-token', async (_, token) => {
  return await validateToken(token);
});

ipcMain.handle('get-hwid', () => getHwid());

ipcMain.handle('license-ok', () => {
  if (licenseWin) licenseWin.close();
  createMainWindow();
});

ipcMain.handle('quit', () => { app.quit(); });

ipcMain.handle('open-telegram', () => {
  shell.openExternal('https://t.me/Hackerseb');
});

ipcMain.handle('set-opacity', (_, val) => {
  if (mainWin) mainWin.setOpacity(val);
});

ipcMain.handle('set-always-on-top', (_, val) => {
  if (mainWin) mainWin.setAlwaysOnTop(val);
});

ipcMain.handle('minimize', () => {
  if (mainWin) mainWin.minimize();
});

ipcMain.handle('close-main', () => {
  if (mainWin) mainWin.close();
});

ipcMain.handle('take-screenshot', async () => {
  try {
    // Temporarily disable content protection to capture screen
    if (mainWin) mainWin.setContentProtection(false);
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    if (mainWin) mainWin.setContentProtection(true);
    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (e) {
    if (mainWin) mainWin.setContentProtection(true);
    return null;
  }
});
