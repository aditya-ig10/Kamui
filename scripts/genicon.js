// Generates the .app icons (PNG ladder + .icns) for Kamui Browser from
// assets/logo.svg, tinted by the accent. Must run under Electron:
//   npx electron scripts/genicon.js   (or npm run icon)
// Env: KAMUI_ICON_HEX=#rrggbb (default #6001D2)
'use strict'
const fs = require('fs')
const path = require('path')
const { app, BrowserWindow, nativeTheme } = require('electron')
const { brandIconHtml } = require('../lib/brand.js')

const OUT = path.join(__dirname, '..', 'build')
const SIZES = [16, 32, 64, 128, 256, 512, 1024]

// Keep in sync with ACCENT_HEX in lib/bridge.ts
const ACCENT_HEX = {
  violet: '#6001D2',
  slate: '#2F5BEA',
  teal: '#0D7C8A',
  forest: '#14663F',
  flare: '#E8390B',
  ink: '#1F2937',
}

app.whenReady().then(() => {
  let accent = process.env.KAMUI_ICON_HEX
  // NOTE: `electron <script>` boots as app.name="Electron" (our package.json
  // isn't loaded), so app.getPath('userData') lies. Resolve the data dir the
  // same way the browser itself does: productName || name from OUR package.json.
  let settingsDir = null
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
    settingsDir = path.join(app.getPath('appData'), pkg.productName || pkg.name)
  } catch { /* fall back below */ }
  let settings = {}
  try {
    settings = JSON.parse(fs.readFileSync(
      path.join(settingsDir || app.getPath('userData'), 'settings.json'), 'utf8'))
  } catch (err) { if (process.env.KAMUI_DEBUG) console.log('[icon] settings read failed:', err.message) }
  if (!accent) {
    const saved = settings.accent === 'custom' ? settings.accentCustom : ACCENT_HEX[settings.accent]
    if (saved && /^#[0-9a-fA-F]{6}$/.test(saved)) accent = saved
  }
  accent = accent || '#6001D2'
  const dark = nativeTheme.shouldUseDarkColors
  if (!/^#[0-9a-fA-F]{6}$/.test(accent)) { console.error('bad KAMUI_ICON_HEX'); app.exit(1) }

  const S = 1024
  const html = brandIconHtml(accent, dark)

  let painted = null
  const win = new BrowserWindow({
    show: false, width: S, height: S, frame: false, transparent: true,
    webPreferences: { offscreen: true, backgroundThrottling: false },
  })
  win.webContents.on('paint', (_e, _dirty, img) => { painted = img })
  win.webContents.once('did-finish-load', async () => {
    setTimeout(async () => {
      let img = null
      try { img = await win.webContents.capturePage() } catch { /* painted fallback */ }
      if (!img || img.isEmpty()) img = painted
      img = img.resize({ width: S, height: S })
      fs.mkdirSync(OUT, { recursive: true })
      const base = img.toPNG()
      fs.writeFileSync(path.join(OUT, 'icon.png'), base)
      for (const size of SIZES) {
        fs.writeFileSync(path.join(OUT, `icon-${size}.png`), img.resize({ width: size, height: size }).toPNG())
      }
      // iconset + icns (mac only)
      if (process.platform === 'darwin') {
        const iconset = path.join(OUT, 'appicon.iconset')
        fs.rmSync(iconset, { recursive: true, force: true })
        fs.mkdirSync(iconset, { recursive: true })
        const ladder = [[16, 1], [16, 2], [32, 1], [32, 2], [128, 1], [128, 2], [256, 1], [256, 2], [512, 1], [512, 2]]
        for (const [pts, scale] of ladder) {
          const dl = scale > 1 ? '@2x' : ''
          const dims = pts < 256 ? `${pts}` : pts
          fs.writeFileSync(
            path.join(iconset, `icon_${dims}x${dims}${dl}.png`),
            img.resize({ width: pts * scale, height: pts * scale }).toPNG()
          )
        }
        require('child_process').execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(OUT, 'kamui.icns')])
        fs.rmSync(iconset, { recursive: true, force: true })
      }
      console.log(`[icon] wrote build/icon.png + ladder + kamui.icns (accent ${accent}${dark ? ' · dark' : ' · light'})`)
      win.destroy()
      app.exit(0)
    }, 60)
  })
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  setTimeout(() => { console.error('[icon] raster timeout'); app.exit(1) }, 10000)
})
