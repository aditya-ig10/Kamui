const { app, BrowserWindow, Menu, ipcMain, session, shell, webContents, powerMonitor, nativeTheme, dialog } = require('electron')

// native smooth wheel/touchpad scrolling in guest renderers
app.commandLine.appendSwitch('enable-smooth-scrolling')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { execSync } = require('child_process')
const { SHORTCUTS, comboToAccelerator } = require('./lib/shortcuts.js')

let mainWindow = null
let incogWindow = null
const ACCENT_MAINS = {
  violet: '#6001D2', slate: '#2F5BEA', teal: '#0D7C8A', forest: '#14663F', flare: '#E8390B', ink: '#1F2937',
}
const DEV_SERVER_URL = 'http://127.0.0.1:3451' // next dev (npm run dev)
const PORT = 3451
const guestPages = []
let lastGuest = null
let appReady = false
const IS_MAC = process.platform === 'darwin'

// ---------------------------------------------------------------------------
// Performance budget (set on every boot before app ready)
// - always-on light features; heavier ones honor Settings → Performance
// ---------------------------------------------------------------------------
function configurePerf() {
  const perf = readData('settings', {})?.perf || {}
  // smoother text/compositing at a lower power cost than the default AA path
  app.commandLine.appendSwitch('enable-features', 'CalculateNativeWinOcclusion,SmoothScrolling')
  // battery saver: drop GPU compositing when the user prefers power savings
  if (perf.hardware === false) {
    app.disableHardwareAcceleration()
    console.log('[kamui] hardware acceleration: disabled (per settings)')
  }
}

// ---------------------------------------------------------------------------
// Next.js runtime (renderer UI)
// ---------------------------------------------------------------------------
async function startNext() {
  const dev = process.argv.includes('--dev')
  if (dev) {
    // next dev is expected to be running externally (`npm run dev`)
    console.log(`[kamui] dev mode — using ${DEV_SERVER_URL}`)
    return DEV_SERVER_URL
  }

  if (!fs.existsSync(path.join(__dirname, '.next', 'BUILD_ID'))) {
    console.log('[kamui] building UI (first run)…')
    try {
      execSync('npx next build', { cwd: __dirname, stdio: 'inherit' })
    } catch (err) {
      console.error('[kamui] next build failed — see output above')
      app.quit()
      return
    }
  }

  const next = require('next')({ dev: false, dir: __dirname })
  await next.prepare()

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => next.getRequestHandler()(req, res))
    server.on('error', (err) => {
      console.error('[kamui] UI server error:', err.message)
      app.quit()
    })
    server.listen(PORT, '127.0.0.1', () => resolve(`http://127.0.0.1:${PORT}`))
  })
}

// ---------------------------------------------------------------------------
// Data storage (JSON files in userData)
// ---------------------------------------------------------------------------
const dataFile = (name) => path.join(app.getPath('userData'), `${name}.json`)

function readData(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(dataFile(name), 'utf8'))
  } catch {
    return fallback
  }
}

function writeData(name, value) {
  try {
    fs.mkdirSync(path.dirname(dataFile(name)), { recursive: true })
    fs.writeFileSync(dataFile(name), JSON.stringify(value, null, 2))
    return true
  } catch (err) {
    console.error(`Failed to save ${name}:`, err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Secure DNS (DNS-over-HTTPS). Must be configured before app ready; resolves
// on every boot from settings.json. 'system' (default) = Chromium's resolver.
// ---------------------------------------------------------------------------
function configureDns() {
  const s = readData('settings', {}) || {}
  const PRESETS = {
    cloudflare: 'https://cloudflare-dns.com/dns-query',
    google: 'https://dns.google/dns-query',
    quad9: 'https://dns.quad9.net/dns-query',
    adguard: 'https://dns.adguard-dns.com/dns-query',
  }
  let template = PRESETS[s.dnsMode] || ''
  if (!template && s.dnsMode === 'custom' && /^https:\/\/[a-z0-9.-]+(:\d+)?(\/[\w./-]*)?$/i.test(String(s.dnsUrl || ''))) {
    template = String(s.dnsUrl)
  }
  if (template) {
    // Chromium parses `-force-fieldtrial-params` values by splitting on '/',
    // so a URL template must be fully percent-encoded or the config breaks.
    // Preset providers run in `automatic` mode: DoH is preferred but Chromium
    // falls back to the system resolver if the DoH endpoint is unreachable
    // (e.g. blocked networks), so browsing never breaks. Custom providers are
    // privacy-critical (filtering lists), so they run DoH-only (`secure`).
    const mode = s.dnsMode === 'custom' ? 'secure' : 'automatic'
    const enc = encodeURIComponent(template)
    app.commandLine.appendSwitch('enable-features', 'DnsOverHttps<DoH')
    app.commandLine.appendSwitch('force-fieldtrials', 'DoH/Group1')
    app.commandLine.appendSwitch('force-fieldtrial-params', `DoH.Group1:kDnsOverHttpsMode/${mode}/kDnsOverHttpsTemplates/${enc}`)
    console.log(`[kamui] secure DNS (${mode}):`, template)
  }
}
configureDns()

function emitToGuests(event, payload) {
  for (const g of guestPages) {
    if (!g.webContents.isDestroyed()) g.webContents.send(`guest:${event}`, payload)
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
const DEFAULTS = {
  settings: {
    theme: 'auto',
    accent: 'violet',
    searchEngine: 'duckduckgo',
    homepage: '',
    startupPage: 'newtab',
    profileName: '',
  },
}

function registerIpc() {
  ipcMain.handle('data:get', (_e, key) => {
    const fallback = DEFAULTS[key] !== undefined ? structuredClone(DEFAULTS[key]) : null
    return readData(key, fallback)
  })

  ipcMain.handle('data:set', (_e, key, value) => {
    const ok = writeData(key, value)
    if (ok && key === 'settings') {
      mainWindow?.webContents.send('data:changed', 'settings')
      emitToGuests('data-changed', { key })
      if (appReady) buildMenu() // shortcut overrides may have changed
      if (appReady) { // dock icon should follow accent changes
        const hex = value?.accent === 'custom'
          ? (value?.accentCustom || null)
          : ACCENT_MAINS[value?.accent] || null
        if (hex) applyDockIcon(hex)
      }
    }
    return ok
  })

  ipcMain.handle('app:paths', () => ({
    home: app.getPath('home'),
    downloads: app.getPath('downloads'),
    internalPreload: path.join(__dirname, 'internal-preload.js'),
  }))

  ipcMain.handle('app:open-external', (_e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url)
  })

  ipcMain.handle('app:show-in-folder', (_e, file) => {
    if (typeof file === 'string' && fs.existsSync(file)) shell.showItemInFolder(file)
  })

  ipcMain.handle('win:minimize', () => mainWindow?.minimize())
  ipcMain.handle('win:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('win:close', () => mainWindow?.close())
  ipcMain.handle('app:restart', () => { app.relaunch(); app.exit(0) })
  // internal pages can trigger shell actions (e.g. "New Private Window")
  ipcMain.handle('shell:action', (_e, id) => {
    if (id === 'new-incognito-tab') { openIncognitoWindow(); return }
    if (typeof id === 'string' && /^[\w-]+$/.test(id)) mainWindow?.webContents.send(`accel:${id}`)
  })
  ipcMain.handle('app:new-incognito-window', () => openIncognitoWindow())
  ipcMain.handle('dock:icon', (_e, hex) => applyDockIcon(hex))
  // current title/url for a guest tab (used by the shell to resync tab names)
  ipcMain.handle('tab:meta', (_e, tabWcId) => {
    try {
      const wc = webContents.fromId(Number(tabWcId))
      return wc ? { title: wc.getTitle(), url: wc.getURL() } : null
    } catch { return null }
  })

  // dock DevTools for a guest tab into a shell-provided webview pane
  ipcMain.handle('dt:attach', (_e, { tabWcId, dtWcId, attach }) => {
    try {
      const tab = webContents.fromId(Number(tabWcId))
      const dt = webContents.fromId(Number(dtWcId))
      if (!tab || !dt) return
      if (attach !== false) {
        tab.setDevToolsWebContents(dt)
        tab.openDevTools({ mode: 'right' })
      } else {
        tab.closeDevTools()
      }
    } catch (err) { console.log('[kamui] dt attach failed:', err.message) }
  })

  const pageWc = (id, sender) => webContents.fromId(Number(id)) || webContents.fromId(Number(sender) || 0)
  ipcMain.handle('page:print', (e, tabWcId) => {
    const wc = pageWc(tabWcId, null)
    if (!wc) return
    wc.print({}, (ok, err) => { if (!ok && err) console.log('[kamui] print:', err) })
  })
  ipcMain.handle('page:save', async (e, tabWcId) => {
    const wc = pageWc(tabWcId, e.sender.id)
    if (!wc) return
    let name = 'page'
    try {
      name = (new URL(wc.getURL())).hostname.replace(/^www\./, '') || 'page'
    } catch { /* keep default */ }
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    name = `${name}-${stamp}`
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Page As',
      defaultPath: path.join(app.getPath('downloads'), `${name}.mhtml`),
      filters: [
        { name: 'MHTML web page', extensions: ['mhtml'] },
        { name: 'Webpage, complete', extensions: ['html'] },
      ],
    })
    if (res.canceled || !res.filePath) return
    const ext = path.extname(res.filePath).toLowerCase()
    const type = ext === '.html' ? 'HTMLComplete' : 'MHTML'
    try {
      const ok = await wc.savePage(res.filePath, type)
      if (!ok) console.log('[kamui] savePage failed')
    } catch (err) {
      console.log('[kamui] savePage error:', err.message)
    }
  })
  ipcMain.handle('win:is-maximized', () => !!mainWindow?.isMaximized())
  ipcMain.handle('win:is-fullscreen', () => !!mainWindow?.isFullScreen())

  // GPU / power status for Settings → Performance
  ipcMain.handle('perf:gpu', () => {
    try {
      const status = app.getGPUFeatureStatus()
      const battery = IS_MAC && powerMonitor
        ? (powerMonitor.isOnBatteryPower ? powerMonitor.isOnBatteryPower() : null)
        : null
      return { status, battery }
    } catch { return { status: {}, battery: null } }
  })
}

// ---------------------------------------------------------------------------
// Download manager
// ---------------------------------------------------------------------------
function setupDownloads() {
  const ses = session.fromPartition('persist:kamui')
  ses.on('will-download', (_e, item) => {
    const entry = {
      url: item.getURL(),
      file: item.getSavePath(),
      name: item.getFilename(),
      size: item.getTotalBytes(),
      received: 0,
      done: false,
      time: Date.now(),
    }
    mainWindow?.webContents.send('download:started', entry)

    item.on('updated', (_ev, state) => {
      entry.received = item.getReceivedBytes()
      entry.size = item.getTotalBytes() || entry.size
      entry.paused = state === 'progressing' && item.isPaused()
      mainWindow?.webContents.send('download:progress', entry)
    })

    item.once('done', (_ev, state) => {
      entry.done = state === 'completed'
      entry.interrupted = state === 'interrupted'
      entry.time = Date.now()
      const list = readData('downloads', [])
      list.unshift(entry)
      writeData('downloads', list.slice(0, 100))
      mainWindow?.webContents.send('download:done', entry)
      emitToGuests('data-changed', { key: 'downloads' })
    })
  })
}

// ---------------------------------------------------------------------------
// Guests (webview contents): window-open -> new tab, context menus, permissions
// ---------------------------------------------------------------------------
function setupGuests() {
  const ses = session.fromPartition('persist:kamui')

  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = [
      'media', 'audioCapture', 'videoCapture', 'display-capture',
      'geolocation', 'notifications', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock',
    ]
    callback(allowed.includes(permission))
  })

  // the in-memory incognito partition gets the same policy
  session.fromPartition('incognito').setPermissionRequestHandler(ses.setPermissionRequestHandler)

  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() === 'webview') {
      // route shell actions to the window that hosts the webview (main or private)
      const hostSend = (ch, ...args) => {
        try {
          const target = contents.hostWebContents || mainWindow?.webContents
          target?.send?.(ch, ...args)
        } catch (_e) {}
      }
      contents.on('focus', () => { lastGuest = contents })
      contents.on('did-fail-load', (_ev, code, desc, url) => console.log('[kamui][webview] FAIL:', code, desc, url))
      contents.on('render-process-gone', (_ev, details) => console.log('[kamui][webview] gone:', JSON.stringify(details)))
      // smooth programmatic/anchor scrolling in every guest document (re-injects per navigation)
      contents.on('dom-ready', () => {
        contents.insertCSS('html { scroll-behavior: smooth !important; }', { cssOrigin: 'author' }).catch(() => {})
        // relay scroll state so the shell chrome can switch to its frosted look
        contents.executeJavaScript(`(() => {
          const d = document
          let last = null
          const edge = () => {
            const d = document
            const se = d.scrollingElement || d.documentElement || {}
            return (window.scrollY || se.scrollTop || 0) > 10 ? 1 : 0
          }
          last = edge()
          document.addEventListener('scroll', (e) => {
            const t = e.target
            const inner = t && t !== document && t !== d.documentElement && t !== d.body
              ? (t.scrollTop || ((t.scrollingElement || {}).scrollTop) || 0)
              : 0
            const v = Math.max(inner, edge()) > 10 ? 1 : 0
            if (v !== last) { last = v; console.log('KAMUI_SCROLL:' + v) }
          }, { capture: true, passive: true })
          return true
        })()`, true).catch(() => {})
      })
      // the injected listener above only emits on state flips
      let scrollState = false
      contents.on('console-message', (_ev, level, msg) => {
        if (msg && msg.startsWith('KAMUI_SCROLL:')) {
          const scrolled = msg.endsWith(':1')
          if (scrolled !== scrollState) {
            scrollState = scrolled
            if (process.env.KAMUI_DEBUG) console.log('[kamui] chrome:scrolled', scrolled, contents.id)
            hostSend('chrome:scrolled', scrolled, contents.id)
          }
          return
        }
        if (level >= 2) console.log('[kamui][guest]', msg)
      })
      contents.on('did-navigate', (_e, url) => {
        hostSend('guest:navigated', contents.id, url, contents.getTitle())
      })
      contents.on('did-navigate-in-page', (_e, url) => {
        hostSend('guest:navigated', contents.id, url, contents.getTitle())
      })
      contents.on('page-title-updated', (_e, title) => {
        hostSend('guest:title', contents.id, title, contents.getURL())
      })
      contents.on('page-favicon-updated', (_e, favicons) => {
        hostSend('guest:favicon', contents.id, favicons?.[0] || null)
      })

      // Instant butter-smooth accelerators from webviews
      contents.on('before-input-event', (_event, input) => {
        if (input.type === 'keyDown' && (input.meta || input.control) && !input.alt) {
          const key = input.key.toLowerCase()
          if (key === 't') {
            hostSend('accel:new-tab')
            _event.preventDefault()
          } else if (key === 'w') {
            hostSend('accel:close-tab')
            _event.preventDefault()
          } else if (key === 'r') {
            hostSend('accel:reload')
            _event.preventDefault()
          } else if (key === 'l') {
            hostSend('accel:focus-omnibox')
            _event.preventDefault()
          }
        }
      })

      contents.setWindowOpenHandler(({ url }) => {
        if (url && !url.startsWith(process.env.KAMUI_INTERNAL_ORIGIN || 'http://127.0.0.1:3451')) {
          hostSend('accel:new-tab-with-url', url)
        }
        return { action: 'deny' }
      })

      contents.on('context-menu', (_e, props) => {
        const menu = []
        if (props.linkURL) {
          menu.push({ label: 'Open Link in New Tab', click: () => hostSend('accel:new-tab-with-url', props.linkURL) })
          menu.push({ label: 'Open Link in Background Tab', click: () => hostSend('accel:new-tab-background', props.linkURL) })
          if (/^https?:/.test(props.linkURL)) {
            menu.push({ label: 'Copy Link Address', click: () => contents.copy() })
            menu.push({ label: 'Open Link in Default Browser', click: () => shell.openExternal(props.linkURL) })
          }
          menu.push({ type: 'separator' })
        }
        if (props.mediaType === 'image') {
          menu.push({ label: 'Open Image in New Tab', click: () => hostSend('accel:new-tab-with-url', props.srcURL) })
          menu.push({ label: 'Save Image As…', click: () => contents.downloadURL(props.srcURL) })
          menu.push({ type: 'separator' })
        }
        if (props.isEditable) {
          for (const role of ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']) {
            menu.push({ role, label: role[0].toUpperCase() + role.slice(1) })
          }
        } else if (props.selectionText) {
          menu.push({ label: 'Copy', role: 'copy' })
        }
        menu.push({ type: 'separator' })
        menu.push({ label: 'Back', enabled: contents.navigationHistory.canGoBack(), click: () => contents.goBack() })
        menu.push({ label: 'Forward', enabled: contents.navigationHistory.canGoForward(), click: () => contents.goForward() })
        menu.push({ label: 'Reload', click: () => contents.reload() })
        menu.push({ type: 'separator' })
        menu.push({ label: 'Inspect Element', click: () => contents.inspectElement(props.x, props.y) })
        Menu.buildFromTemplate(menu).popup()
      })
    }
  })
}

// ---------------------------------------------------------------------------
// Internal guest page registry
// ---------------------------------------------------------------------------
ipcMain.on('guest:hello', (e, name) => {
  const found = guestPages.find((g) => g.webContents === e.sender)
  if (found) found.name = name
  else guestPages.push({ webContents: e.sender, name })
})

// Editing commands from the in-app Edit menu → the most recently focused guest
ipcMain.handle('guest:edit', (_e, cmd) => {
  const target = lastGuest && !lastGuest.isDestroyed() ? lastGuest : null
  if (target && typeof target[cmd] === 'function') {
    try { target[cmd]() } catch { /* ignore */ }
  }
})

// ---------------------------------------------------------------------------
// Application menu
// ---------------------------------------------------------------------------
function send(action, ...args) {
  mainWindow?.webContents.send(`accel:${action}`, ...args)
}

function shortcutMap() {
  const m = {}
  for (const s of SHORTCUTS) m[s.id] = s.def
  const saved = (readData('settings', {}) || {}).shortcuts || {}
  for (const id of Object.keys(saved)) {
    if (saved[id] && m[id] !== undefined) m[id] = saved[id]
  }
  return m
}

function buildMenu() {
  const m = shortcutMap()
  const label = (id) => (SHORTCUTS.find((s) => s.id === id) || {}).label || id
  const item = (id, opts = {}) => ({
    label: opts.label || label(id),
    accelerator: comboToAccelerator(m[id]),
    click: () => send(id),
    ...opts,
  })

  const template = [
    {
      label: 'Kamui',
      submenu: [
        { label: 'About Kamui Browser', role: 'about' },
        { type: 'separator' },
        item('show-settings', { label: 'Settings…' }),
        { type: 'separator' },
        item('find', { label: 'Find in Page…' }),
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        item('new-tab'),
        item('reopen-tab'),
        { type: 'separator' },
        item('page-print', { label: 'Print…' }),
        { label: 'Save Page As…', click: () => send('page-save') },
        { type: 'separator' },
        item('focus-omnibox'),
        { type: 'separator' },
        item('show-downloads'),
        { type: 'separator' },
        item('close-tab'),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        item('reload'),
        item('stop'),
        { type: 'separator' },
        item('zoom-in'),
        item('zoom-out'),
        item('zoom-reset'),
        { type: 'separator' },
        item('split-toggle'),
        { type: 'separator' },
        { label: 'Developer Tools', accelerator: 'CmdOrCtrl+Alt+I', click: () => send('devtools') },
        { type: 'separator' },
        item('fullscreen'),
        { type: 'separator' },
        { label: 'Next Tab', accelerator: comboToAccelerator(m['next-tab']), visible: false, click: () => send('next-tab') },
        { label: 'Previous Tab', accelerator: comboToAccelerator(m['prev-tab']), visible: false, click: () => send('prev-tab') },
      ],
    },
    {
      label: 'History',
      submenu: [
        item('show-history'),
        { type: 'separator' },
        { label: 'Clear History…', click: () => send('clear-history') },
      ],
    },
    {
      label: 'Bookmarks',
      submenu: [
        item('toggle-bookmark'),
        item('show-bookmarks'),
      ],
    },
    { label: 'Window', role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---------------------------------------------------------------------------
// Private (incognito) window — a separate BrowserWindow with its own chrome,
// using the in-memory `incognito` session (not the persisted one)
// ---------------------------------------------------------------------------
function shellWinOptions() {
  return {
    width: 1400,
    height: 900,
    minWidth: 720,
    minHeight: 480,
    // macOS gets native traffic lights via hiddenInset; Windows/Linux keep
    // the custom frameless chrome with in-app window buttons
    frame: false,
    ...(IS_MAC ? { titleBarStyle: 'hiddenInset' } : {}),
    backgroundColor: '#F5F6F8',
    webPreferences: {
      preload: path.join(__dirname, 'chrome-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
    },
  }
}

function openIncognitoWindow() {
  if (incogWindow && !incogWindow.isDestroyed()) { incogWindow.focus(); return }
  incogWindow = new BrowserWindow({ ...shellWinOptions(), title: 'Kamui — Private', show: false })
  const base = process.env.KAMUI_SHELL_URL || 'http://127.0.0.1:3451/'
  incogWindow.loadURL(base + (base.includes('?') ? '&' : '?') + 'incognito=1')
  incogWindow.once('ready-to-show', () => incogWindow?.show())
  incogWindow.on('closed', () => { incogWindow = null })
  applyDockIcon(lastIconHex)
}

// ---------------------------------------------------------------------------
// Dock icon — the real brand mark (assets/logo.svg) rasterized offscreen in
// the current accent so the dock logo follows the user's palette. Also baked
// as the .app icon at ship (scripts/genicon.js).
// ---------------------------------------------------------------------------
let lastIconHex = null
const iconCache = new Map()
const iconJobs = new Map()
let iconWin = null

const { brandIconHtml } = require('./lib/brand.js')

// Light / dark icon based strictly on macOS system theme
function prefersDarkIcon() {
  if (typeof nativeTheme !== 'undefined') {
    return !!nativeTheme.shouldUseDarkColors
  }
  return false
}

function rasterBrandPng(hex, dark, cb) {
  const key = `${hex.toLowerCase()}:${dark ? 1 : 0}`
  if (iconCache.has(key)) return cb(iconCache.get(key))
  iconJobs.set(key, [...(iconJobs.get(key) || []), cb])
  pumpIconJobs()
}

function pumpIconJobs() {
  const key = iconJobs.keys().next().value
  if (key == null) return
  if (!iconWin || iconWin.destroyed) {
    iconWin = new BrowserWindow({
      show: false, width: 1024, height: 1024, frame: false, transparent: true,
      webPreferences: { offscreen: true, backgroundThrottling: false },
    })
  }
  const win = iconWin
  let painted = null
  win.webContents.on('paint', (_e, _dirty, img) => { painted = img })
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      let img = null
      try { img = await win.webContents.capturePage() } catch { /* painted fallback */ }
      if (!img || img.isEmpty()) img = painted
      if (img && !img.isEmpty()) iconCache.set(key, img)
      const cbs = iconJobs.get(key) || []
      iconJobs.delete(key)
      for (const cb of cbs) { try { cb(iconCache.get(key)) } catch (_e) { /* renderer gone */ } }
      nextIconJob(win)
    }, 40)
  })
  win.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(brandIconHtml(key.split(':')[0], key.endsWith(':1'))))
}

function nextIconJob(win) {
  const next = iconJobs.keys().next().value
  if (next != null) {
    if (win === iconWin) { win.webContents.removeAllListeners('paint'); win.webContents.removeAllListeners('did-finish-load') }
    pumpIconJobs()
  } else if (iconWin && !iconWin.destroyed) {
    iconWin.destroy()
    iconWin = null
  }
}


function applyDockIcon(hex) {
  if (!IS_MAC || typeof app.dock === 'undefined' || !/^#[0-9a-fA-F]{6}$/.test(hex || '')) return
  lastIconHex = hex
  const dark = prefersDarkIcon()
  rasterBrandPng(hex, dark, (img) => {
    if (!img || (hex.toLowerCase() !== lastIconHex.toLowerCase())) return // superseded by a newer accent
    try { app.dock.setIcon(img) } catch (err) {
      console.log('[kamui] dock icon failed:', err.message)
    }
    const path = require('path')
    if (process.env.KAMUI_SAVE_ICON) {
      try {
        const png = img.toPNG()
        require('fs').writeFileSync(process.env.KAMUI_SAVE_ICON, png)
        console.log('[kamui] dock icon saved:', path.basename(process.env.KAMUI_SAVE_ICON), png.length, 'bytes')
      } catch (err) { console.log('[kamui] icon save failed:', err.message) }
    }
  })
}

// re-render the dock icon when the OS crosses light/dark (matches theme auto)
if (IS_MAC && typeof nativeTheme !== 'undefined') {
  nativeTheme.on('updated', () => {
    if (lastIconHex) applyDockIcon(lastIconHex)
  })
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow(internalUrl) {
  mainWindow = new BrowserWindow({ ...shellWinOptions(), title: 'Kamui Browser', show: false })
  process.env.KAMUI_SHELL_URL = internalUrl

  // startup boost: show as soon as the shell has painted — the guest webview
  // keeps warm-loading underneath
  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (process.env.KAMUI_FORCE_STRIP && !internalUrl.includes('?')) internalUrl += '?strip=1'
  mainWindow.loadURL(internalUrl)
  process.env.KAMUI_INTERNAL_ORIGIN = new URL(internalUrl).origin

  mainWindow.on('maximize', () => mainWindow.webContents.send('win:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win:maximized', false))
  mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('win:fullscreen', true))
  mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('win:fullscreen', false))
  mainWindow.on('closed', () => { mainWindow = null })

  if (process.env.KAMUI_URL) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('accel:new-tab-with-url', process.env.KAMUI_URL)
    })
  }

  // Debug helper: KAMUI_TEST_CLICK='<js in shell>' runs that script in the
  // shell after boot (combine with KAMUI_CAPTURE to verify interaction flows).
  if (process.env.KAMUI_TEST_CLICK) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        mainWindow?.webContents.executeJavaScript(process.env.KAMUI_TEST_CLICK, true).then((res) => {
          if (res !== undefined && res !== null && String(res).length) {
            fs.writeFileSync('/tmp/kamui-diag-out.txt', String(res), { flag: 'w' })
            console.log('[test] click result:', String(res).slice(0, 400))
          }
        }).catch((err) => console.log('[test] click error:', err.message))
      }, 900)
    })
  }

  // Debug helper: KAMUI_GUEST_CLICK='<js in guest webview>' runs that script in
  // the first guest webContents (guest DOM is not reachable from the shell).
  if (process.env.KAMUI_GUEST_CLICK) {
    setTimeout(() => {
      const guest = webContents.getAllWebContents().find((c) => c.getType() === 'webview')
      guest?.executeJavaScript(process.env.KAMUI_GUEST_CLICK, true).catch((err) => console.log('[test] guest click error:', err.message))
    }, 1200)
  }

  // Debug helper: KAMUI_INTERNAL_PAGE=settings|history|bookmarks|downloads
  // opens that internal page after boot (combine with KAMUI_CAPTURE).
  if (process.env.KAMUI_INTERNAL_PAGE) {
    mainWindow.webContents.once('did-finish-load', () => {
      const p = process.env.KAMUI_INTERNAL_PAGE
      const action = { settings: 'show-settings', history: 'show-history', bookmarks: 'show-bookmarks', downloads: 'show-downloads' }[p] || 'show-settings'
      setTimeout(() => mainWindow?.webContents.send(`accel:${action}`), 400)
    })
  }

  // Debug helper: KAMUI_CAPTURE=/path/out.png captures the shell and quits.
  // With KAMUI_CAPTURE_ALL=1 every open window gets "-1.png","-2.png",…
  if (process.env.KAMUI_CAPTURE) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const base = process.env.KAMUI_CAPTURE
          if (process.env.KAMUI_CAPTURE_ALL) {
            const wins = BrowserWindow.getAllWindows()
            for (let i = 0; i < wins.length; i++) {
              try {
                const img = await wins[i].webContents.capturePage()
                fs.writeFileSync(base.replace(/\.png$/, `-w${i}.png`), img.toPNG())
              } catch (err) { console.log('capture win' + i, err.message) }
            }
          } else {
            const img = await mainWindow.webContents.capturePage()
            fs.writeFileSync(base, img.toPNG())
          }
        } catch (err) {
          console.error('capture failed:', err)
        }
        app.quit()
      }, Number(process.env.KAMUI_CAPTURE_DELAY) || 3500)
    })
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    registerIpc()
    setupDownloads()
    setupGuests()
    buildMenu()
    appReady = true

    // dock icon follows the accent palette; refresh when settings change
    applyDockIcon(readData('settings', {})?.accent === 'custom'
      ? (readData('settings', {})?.accentCustom || '#6001D2')
      : ACCENT_MAINS[readData('settings', {})?.accent] || '#6001D2')

    // power state → shell can shorten the sleep-tab timeout on battery
    const tellBattery = () => {
      if (!IS_MAC) return
      const on = !!powerMonitor.isOnBatteryPower()
      console.log('[kamui] power:', on ? 'battery' : 'ac')
      mainWindow?.webContents.send('perf:battery', on)
      incogWindow?.webContents.send('perf:battery', on)
    }
    try {
      powerMonitor.on('on-battery', tellBattery)
      powerMonitor.on('on-ac', tellBattery)
      setTimeout(tellBattery, 1500)
    } catch {}

    const url = await startNext()
    createWindow(url)

    if (process.env.KAMUI_DUMP) {
      setTimeout(() => {
        (async () => {
          const out = []
          for (const c of webContents.getAllWebContents()) {
            const item = { t: c.getType(), u: c.getURL() }
            try {
              const d = await c.executeJavaScript(`document.title + ' || ' + (document.body ? document.body.innerText.slice(0, 200) : 'NOBODY')`)
              item.dom = d
            } catch (err) { item.dom = 'ERR ' + err.message }
            out.push(item)
          }
          console.log('[kamui][dump]', JSON.stringify(out, null, 1))
        })()
      }, Number(process.env.KAMUI_DUMP) || 4000)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(url)
    })
  })

  app.on('window-all-closed', () => {
    // kings are native here: keep the engine warm on macOS (review via dock icon)
    // other platforms honor Settings → Performance → "Run in background"
    if (IS_MAC) return
    const keep = readData('settings', {})?.perf?.background !== false
    if (!keep) app.quit()
  })
}
