// Bridge to the Electron main process (exposed by chrome-preload.js)
import React from 'react'

export type KamuiBridge = {
  getData: (key: string) => Promise<any>
  setData: (key: string, value: any) => Promise<boolean>
  getPaths: () => Promise<{ home: string; downloads: string; internalPreload: string }>
  openExternal: (url: string) => Promise<void>
  editCmd: (cmd: string) => Promise<void>
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  isFullscreen?: () => Promise<boolean>
  newIncognitoWindow: () => void
  setDockIcon: (hex: string) => void
  dtAttach: (tabWcId: number, dtWcId: number, attach: boolean) => Promise<void>
  tabMeta: (tabWcId: number) => Promise<{ title: string; url: string } | null>
  pagePrint: (tabWcId: number) => Promise<void>
  pageSave: (tabWcId: number) => Promise<void>
  on: (channel: string, cb: (...args: any[]) => void) => Promise<() => void> | (() => void) | void
}

export type PagesBridge = {
  getData: (key: string) => Promise<any>
  setData: (key: string, value: any) => Promise<boolean>
  getPaths: () => Promise<{ home: string; downloads: string }>
  openExternal: (url: string) => Promise<void>
  showInFolder: (file: string) => Promise<void>
  shellAction: (id: string) => Promise<void>
  restart: () => Promise<void>
  getGPU: () => Promise<{ status: Record<string, string>; battery: boolean | null } | null>
  hello: (name: string) => void
  onDataChanged: (cb: ({ key }: { key: string }) => void) => () => void
}

export type Perf = {
  /** sleep background tabs after idle */
  sleepTabs: boolean
  /** idle seconds before a tab sleeps */
  sleepAfter: number
  /** sleep faster on battery power */
  battery: boolean
  /** load background tabs only when first shown */
  lazyTabs: boolean
  /** GPU compositing (off = save power, needs relaunch) */
  hardware: boolean
  /** keep Kamui running after the last window closes */
  background: boolean
  /** drop blur/shadow/animation effects for lightweight UI */
  lite: boolean
}

export type Settings = {
  theme: string
  accent: string
  accentCustom?: string
  dnsMode?: string
  dnsUrl?: string
  searchEngine: string
  homepage: string
  startupPage: string
  profileName: string
  shortcuts?: Record<string, string>
  perf?: Partial<Perf>
}

export const DEFAULT_PERF: Perf = {
  sleepTabs: true,
  sleepAfter: 600,
  battery: true,
  lazyTabs: true,
  hardware: true,
  background: true,
  lite: false,
}

function mergePerf(raw: any): Perf {
  const p = raw && typeof raw === 'object' ? raw : {}
  return {
    sleepTabs: p.sleepTabs !== false,
    sleepAfter: [30, 60, 120, 600, 1800, 3600].includes(p.sleepAfter) ? p.sleepAfter : 600,
    battery: p.battery !== false,
    lazyTabs: p.lazyTabs !== false,
    hardware: p.hardware !== false,
    background: p.background !== false,
    lite: p.lite === true,
  }
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  accent: 'violet',
  accentCustom: '',
  dnsMode: 'system',
  dnsUrl: '',
  searchEngine: 'duckduckgo',
  homepage: '',
  startupPage: 'newtab',
  profileName: '',
  perf: {},
}

export const ACCENT_HEX: Record<string, string> = {
  violet: '#6001D2',
  slate: '#2F5BEA',
  teal: '#0D7C8A',
  forest: '#14663F',
  flare: '#E8390B',
  ink: '#1F2937',
}

// DNS-over-HTTPS providers. `system` means Chromium's normal resolver;
// anything else is applied at launch via Chromium secure-DNS (restart needed).
export const DNS_PRESETS: Record<string, string> = {
  system: '',
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  google: 'https://dns.google/dns-query',
  quad9: 'https://dns.quad9.net/dns-query',
  adguard: 'https://dns.adguard-dns.com/dns-query',
  custom: '',
}

const THEMES = new Set(['light', 'dark', 'auto'])
const HEX_RE = /^#[0-9a-f]{6}$/i

function sanitize(raw: any): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) }
  if (!THEMES.has(s.theme)) s.theme = 'auto'
  if (s.accent === 'custom') {
    if (!HEX_RE.test(s.accentCustom || '')) s.accentCustom = ''
    if (!s.accentCustom) s.accent = 'violet'
  } else if (!ACCENT_HEX[s.accent]) {
    s.accent = 'violet'
  } else {
    s.accentCustom = ''
  }
  s.dnsMode = DNS_PRESETS[s.dnsMode] === '' ? s.dnsMode : 'system'
  if (s.dnsMode === 'custom') {
    const u = String(s.dnsUrl || '').trim()
    if (/^https:\/\/[a-z0-9.-]+(:\d+)?(\/[\w./-]*)?$/i.test(u)) s.dnsUrl = u
    else { s.dnsMode = 'system'; s.dnsUrl = '' }
  } else {
    s.dnsUrl = ''
  }
  if (!(s.searchEngine in SEARCH_ENGINE_KEYS)) s.searchEngine = 'duckduckgo'
  if (!['newtab', 'homepage'].includes(s.startupPage)) s.startupPage = 'newtab'
  s.homepage = String(s.homepage || '')
  s.profileName = String(s.profileName || '')
  const sc: Record<string, string> = {}
  if (s.shortcuts && typeof s.shortcuts === 'object') {
    for (const id of Object.keys(s.shortcuts)) {
      if (SHORTCUT_IDS.includes(id) && typeof s.shortcuts[id] === 'string' && s.shortcuts[id]) {
        sc[id] = s.shortcuts[id]
      }
    }
  }
  s.shortcuts = sc
  s.perf = mergePerf(s.perf)
  return s
}

const SEARCH_ENGINE_KEYS: Record<string, true> = {
  duckduckgo: true, google: true, bing: true, brave: true, startpage: true,
}

import { SHORTCUTS } from './shortcuts'
const SHORTCUT_IDS = SHORTCUTS.map((sc: { id: string }) => sc.id)

export const bridge: KamuiBridge | undefined = (globalThis as any).kamui
export const pageBridge: PagesBridge | undefined = (globalThis as any).kamuiPages

export async function readSettings(): Promise<Settings> {
  const data = pageBridge
    ? await pageBridge.getData('settings')
    : bridge
      ? await bridge.getData('settings')
      : null
  return sanitize(data)
}

export async function saveSettings(patch: Partial<Settings>, notify = false): Promise<Settings> {
  const current = await readSettings()
  const next = { ...current, ...patch }
  if (pageBridge) await pageBridge.setData('settings', next)
  else if (bridge) await bridge.setData('settings', next)
  if (!notify) applyTheme(next)
  return next
}

// ── accent color math ────────────────────────────────────────────
// Brand tokens are derived from one base hex so presets and custom
// palettes share the same code path (no per-accent CSS needed).
function hex2rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgb2hex([r, g, b]: [number, number, number]): string {
  const to = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex2rgb(a)
  const [r2, g2, b2] = hex2rgb(b)
  return rgb2hex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t])
}
function lum(hex: string): number {
  const [r, g, b] = hex2rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function brandTokens(base: string, mode: 'light' | 'dark'): Record<string, string> {
  if (mode === 'light') {
    const brand = base
    return {
      '--brand': brand,
      '--brand-hover': mix(base, '#000000', 0.14),
      '--brand-press': mix(base, '#000000', 0.28),
      '--brand-soft': mix(base, '#FFFFFF', 0.9),
      '--brand-soft-2': mix(base, '#FFFFFF', 0.8),
      '--on-brand': lum(base) > 0.66 ? '#1F1235' : '#FFFFFF',
    }
  }
  const brand = mix(base, '#FFFFFF', 0.4)
  return {
    '--brand': brand,
    '--brand-hover': mix(base, '#FFFFFF', 0.54),
    '--brand-press': mix(base, '#FFFFFF', 0.3),
    '--brand-soft': mix(base, '#0A090B', 0.86),
    '--brand-soft-2': mix(base, '#0A090B', 0.74),
    '--on-brand': lum(brand) > 0.5 ? '#171022' : '#FFFFFF',
  }
}

export function accentHex(s: Settings): string {
  return s.accent === 'custom' && s.accentCustom ? s.accentCustom : ACCENT_HEX[s.accent] || ACCENT_HEX.violet
}

// Applies the theme: mode on <html data-theme>, brand tokens derived
// from the accent (preset or custom hex)
export function applyTheme(s: Settings) {
  if (typeof document === 'undefined') return
  const mode =
    s.theme === 'light' || s.theme === 'dark'
      ? s.theme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  const root = document.documentElement
  root.dataset.theme = mode
  root.dataset.accent = s.accent || 'violet'
  root.dataset.lite = s.perf?.lite ? '1' : '0'
  const base = accentHex(s)
  if (HEX_RE.test(base)) {
    for (const [k, v] of Object.entries(brandTokens(base, mode))) {
      root.style.setProperty(k, v)
    }
  }
}

export function useSettingsWatch(onChange?: (s: Settings) => void) {
  const applied = React.useRef(onChange)
  applied.current = onChange
  React.useEffect(() => {
    const src: PagesBridge | undefined = pageBridge ?? (bridge as any)
    if (!src?.onDataChanged) return
    const off = src.onDataChanged(async ({ key }) => {
      if (key !== 'settings') return
      const s = await readSettings()
      applyTheme(s)
      applied.current?.(s)
    })
    return () => { if (typeof off === 'function') off() }
  }, [])
}
