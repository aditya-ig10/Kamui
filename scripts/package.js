// Packages Kamui Browser as a self-contained macOS .app bundle:
//   1. renders app icons (scripts/genicon.js)
//   2. copies the Electron binary and rebrands it (plist, exec names, helpers)
//   3. packs application code + production deps under Contents/Resources/app
//   4. ad-hoc signs the bundle so it launches on Apple Silicon
//
//   node scripts/package.js [--out dist] [--install]
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'dist')
const APP_NAME = 'Kamui Browser'
const BUNDLE_ID = 'com.kamui.browser'
const VERSION = require(path.join(ROOT, 'package.json')).version

function sh(cmd, opts = {}) {
  console.log('[pack]', cmd)
  execSync(cmd, { stdio: 'inherit', ...opts })
}

function copy(src, dest, { omit } = {}) {
  fs.cpSync(src, dest, { recursive: true, force: true, dereference: false, verbatimSymlinks: true,
    filter: (src) => {
      if (omit && omit.test(src)) return false
      return true
    } })
}

function main() {
  const appDist = path.join(OUT, `${APP_NAME}.app`)
  const contents = path.join(appDist, 'Contents')
  fs.rmSync(appDist, { recursive: true, force: true })
  fs.mkdirSync(path.join(contents, 'MacOS'), { recursive: true })
  fs.mkdirSync(path.join(contents, 'Resources'), { recursive: true })
  fs.mkdirSync(path.join(contents, 'Frameworks'), { recursive: true })

  // 1. icons
  sh(`"${path.join(ROOT, 'node_modules', '.bin', 'electron')}" "${path.join(__dirname, 'genicon.js')}"`)

  // 2. Electron runtime — copy framework, helper apps, main executable
  const el = path.join(ROOT, 'node_modules', 'electron', 'dist', 'Electron.app')
  const contentsSrc = path.join(el, 'Contents')
  copy(path.join(contentsSrc, 'Frameworks'), path.join(contents, 'Frameworks'))
  copy(path.join(contentsSrc, 'MacOS'), path.join(contents, 'MacOS'))
  execSync(`cp -p "${contentsSrc}/Info.plist" "${contents}/Info.plist"`)

  // 3. app payload (code + icon + production deps)
  const payload = path.join(contents, 'Resources', 'app')
  fs.mkdirSync(payload, { recursive: true })
  const omit = /(\/node_modules\/electron\/dist\/)|(\/\.git\/)|(\/\.next\/cache\/)/
  for (const f of ['main.js', 'package.json', 'chrome-preload.js', 'internal-preload.js', 'next.config.mjs', 'tsconfig.json']) {
    if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(payload, f))
  }
  for (const d of ['lib', 'styles', 'public', 'assets']) {
    if (fs.existsSync(path.join(ROOT, d))) copy(path.join(ROOT, d), path.join(payload, d), { omit })
  }
  copy(path.join(ROOT, '.next'), path.join(payload, '.next'), { omit: /\.next\/cache/ })
  copy(path.join(ROOT, 'node_modules'), path.join(payload, 'node_modules'), { omit })
  fs.copyFileSync(path.join(ROOT, 'build', 'kamui.icns'), path.join(contents, 'Resources', 'kamui.icns'))

  // 4. rebrand plists
  const pl = path.join(contents, 'Info.plist')
  sh(`plutil -replace CFBundleExecutable -string "Kamui" "${pl}"`)
  sh(`plutil -replace CFBundleIdentifier -string "${BUNDLE_ID}" "${pl}"`)
  sh(`plutil -replace CFBundleName -string "${APP_NAME}" "${pl}"`)
  sh(`plutil -replace CFBundleDisplayName -string "${APP_NAME}" "${pl}"`)
  sh(`plutil -replace CFBundleIconFile -string "kamui.icns" "${pl}"`)
  sh(`plutil -replace CFBundleVersion -string "${VERSION}" "${pl}"`)
  sh(`plutil -replace CFBundleShortVersionString -string "${VERSION}" "${pl}"`)
  sh(`plutil -replace NSHighResolutionCapable -bool true "${pl}"`)
  sh(`mv "${path.join(contents, 'MacOS')}/Electron" "${path.join(contents, 'MacOS')}/Kamui"`)

  // Chromium derives helper paths as "<MainExec> Helper (Role).app", so every
  // helper must be renamed + its plist updated to match the new exec name.
  // Electron resolves helpers as "<CFBundleName of main bundle> Helper[ (Role)]",
  // so with the main bundle named "Kamui Browser" the helpers must be
  // "Kamui Browser Helper.app" / "Kamui Browser Helper (Renderer).app" etc.
  const fw = path.join(contents, 'Frameworks')
  const helperBase = `${APP_NAME} Helper`
  for (const hl of fs.readdirSync(fw)) {
    if (!/Electron Helper.*\.app/.test(hl) || !hl.endsWith('.app')) continue
    const role = hl.slice('Electron Helper'.length).replace(/^ /, '').replace(/\.app$/, '') // e.g. "(Renderer)"
    const stem = role ? `${helperBase} ${role}` : helperBase
    const hdestPath = path.join(fw, stem + '.app')
    if (hl !== stem + '.app') execSync(`mv "${path.join(fw, hl)}" "${hdestPath}"`)
    const hpl = path.join(hdestPath, 'Contents', 'Info.plist')
    sh(`plutil -replace CFBundleExecutable -string "${stem}" "${hpl}"`)
    sh(`plutil -replace CFBundleIdentifier -string "${BUNDLE_ID}.helper${role ? role.replace(/[()]/g, '').toLowerCase() : ''}" "${hpl}"`)
    sh(`plutil -replace CFBundleName -string "${stem}" "${hpl}"`)
    const oldExe = 'Electron Helper' + (role ? ' ' + role : '')
    if (fs.existsSync(path.join(hdestPath, 'Contents', 'MacOS', oldExe))) {
      sh(`mv "${path.join(hdestPath, 'Contents', 'MacOS', oldExe)}" "${path.join(hdestPath, 'Contents', 'MacOS', stem)}"`)
    }
  }

  // 5. ad-hoc signature — sign nested frameworks/helpers first, bundle last
  // (--deep chokes on the unsealed contents Electron ships in Frameworks/)
  for (const fwName of ['Mantle.framework', 'ReactiveObjC.framework', 'Squirrel.framework', 'Electron Framework.framework']) {
    const p = path.join(contents, 'Frameworks', fwName)
    if (fs.existsSync(p)) sh(`codesign --force --sign - "${p}"`)
  }
  for (const h of fs.readdirSync(fw)) {
    if (h.endsWith('.app')) sh(`codesign --force --sign - "${path.join(fw, h)}"`)
  }
  sh(`codesign --force --sign - "${appDist}"`)
  console.log('[pack] bundle ready:', appDist)

  // optional install
  if (process.argv.includes('--install')) {
    const dest = `/Applications/${APP_NAME}.app`
    sh(`rm -rf "${dest}"`)
    sh(`cp -pR "${appDist}" /Applications/`)
    console.log('[pack] installed:', dest)
  }
}
main()
