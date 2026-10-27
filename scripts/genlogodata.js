// Extracts the three layered paths from assets/logo.svg into lib/logodata.ts,
// so the UI can render the mark inline with accent-driven CSS fills.
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo.svg'), 'utf8')
const ds = [...src.matchAll(/<path\s+d="([^"]+)"/g)].map((m) => m[1])
if (ds.length !== 3) throw new Error(`expected 3 paths in logo.svg, got ${ds.length}`)

const q = (s) => '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'
const ts = `// Generated from assets/logo.svg by scripts/genlogodata.js — the Kamui brand mark.\n` +
  `// Three layered paths: 0 = main shape, 1 = depth, 2 = highlight.\n` +
  `export const LOGO_VIEWBOX = '0 0 1095 1095'\n` +
  `export const LOGO_PATHS: string[] = [\n${ds.map(q).join(',\n')},\n]\n`

fs.writeFileSync(path.join(__dirname, '..', 'lib', 'logodata.ts'), ts)
console.log(`lib/logodata.ts written (${ds.map((d) => d.length).join('/')} chars)`)
