// Accent-aware colorizer for the Kamui brand mark (assets/logo.svg).
// Layer semantics: path 0 = main shape (accent), 1 = depth (darkened accent),
// 2 = highlight (#FEFEFE). Used at runtime (dock icon) and offline (icns).
'use strict'
const fs = require('fs')
const path = require('path')

const LOGO = path.join(__dirname, '..', 'assets', 'logo.svg')
let rawSvg = null

function loadRaw() {
  if (rawSvg === null) {
    rawSvg = fs.readFileSync(LOGO, 'utf8')
    if (!/viewBox="0 0 1095 1095"/.test(rawSvg)) throw new Error('assets/logo.svg changed shape; regenerate')
  }
  return rawSvg
}

function clampByte(v) { return Math.max(0, Math.min(255, Math.round(v))) }

function mix(hex, target, t) {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const b = [1, 3, 5].map((i) => parseInt(target.slice(i, i + 2), 16))
  return '#' + a.map((c, i) => clampByte(c + (b[i] - c) * t).toString(16).padStart(2, '0')).join('')
}

// Returns the brand svg source, with the three layer fills remapped to `accent`.
function brandSvg(accent) {
  const svg = loadRaw()
  const parts = svg.split('<path ')
  const head = parts[0]
  const paths = parts.slice(1)
  if (paths.length !== 3) throw new Error('assets/logo.svg: expected exactly 3 paths')
  const depth = mix(accent, '#000000', 0.55)
  const remapped = paths.map((p, i) => {
    const fill = i === 0 ? accent : i === 1 ? depth : '#FEFEFE'
    return '<path ' + p
      .replace(/fill="[^"]*"/g, `fill="${fill}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${fill}"`)
  })
  return head + remapped.join('')
}

// Same mark, structured for web contexts where fills are CSS-driven.
function brandSvgCss() {
  const parts = loadRaw().split('<path ')
  return parts[0] + parts.slice(1).map((p, i) =>
    '<path class="brand-l' + i + '" ' + p
      .replace(/fill="[^"]*"/g, `fill="var(--brand-layer-${i})"`)
      .replace(/stroke="[^"]*"/g, `stroke="var(--brand-layer-${i})"`))
    .join('')
}

// Icon tile document: round-cornered tile tinted from the accent (light or
// dark variant), with the mark inset comfortably so it sits nicely inside.
// Used at runtime (dock icon) and offline (icns bake).
function brandIconHtml(accent, dark) {
  const S = 1024
  const bg = dark ? mix(accent, '#121216', 0.92) : mix(accent, '#FFFFFF', 0.94)
  const svg = brandSvg(accent)
  const inset = Math.round(S * 0.175)
  const markSize = Math.round(S * 0.65)
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent;overflow:hidden}
    .tile{position:relative;width:${S}px;height:${S}px;border-radius:${Math.round(S * 0.2256)}px;background:${bg};
          box-shadow:inset 0 0 0 ${Math.round(S * 0.005)}px rgba(${dark ? '255,255,255' : '0,0,0'},${dark ? '0.08' : '0.06'})}
    .tile svg{position:absolute;left:${inset}px;top:${inset}px;
              width:${markSize}px;height:${markSize}px;display:block}
  </style><div class="tile">${svg}</div>`
}

module.exports = { brandSvg, brandSvgCss, mix, brandIconHtml }
