'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { accentHex, applyTheme, bridge, DEFAULT_SETTINGS, readSettings, Settings } from '@/lib/bridge'
import { MENU_TITLES } from '@/lib/menus'
import { SHORTCUTS, DEFAULT_SHORTCUT_MAP, comboToLabel } from '@/lib/shortcuts'

type WvTag = any

// ── icons ──────────────────────────────────────────────────────
const I = {
  left: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  right: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  reload: <><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" /></>,
  folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  star: <path d="m12 3 2.65 5.6 6.15.85-4.5 4.3 1.1 6.1L12 17l-5.4 2.85 1.1-6.1-4.5-4.3 6.15-.85Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  download: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.15-1.4l2.1-1.6-2-3.5-2.5 1a7 7 0 0 0-2.4-1.4L13.6 2h-3.2l-.45 3.1a7 7 0 0 0-2.4 1.4l-2.5-1-2 3.5 2.1 1.6a7 7 0 0 0 0 2.8l-2.1 1.6 2 3.5 2.5-1a7 7 0 0 0 2.4 1.4l.45 3.1h3.2l.45-3.1a7 7 0 0 0 2.4-1.4l2.5 1 2-3.5-2.1-1.6c.1-.46.15-.93.15-1.4Z" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 4.5Z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></>,
  bookmark: <path d="M6 4h12v17l-6-4-6 4Z" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  code: <><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" /><path d="M13 6l-2 12" /></>,
  expand: <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  external: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
  eyeoff: <><path d="M9.9 4.9A9.8 9.8 0 0 1 12 4.7c5 0 9 4.2 10 6.8a15.5 15.5 0 0 1-3 3.9" /><path d="M6.1 6.1A14.6 14.6 0 0 0 2 11.5a15.3 15.3 0 0 0 10 6.8 14 14 0 0 0 4.1-.4l2.9 2.4" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3 3 18 18" /></>,
  minimize: <path d="M5 12h14" />,
  maximize: <rect x="5" y="5" width="14" height="14" rx="1" />,
  restore: <><rect x="4" y="9" width="11" height="11" rx="1" /><path d="M8 5V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  print: <><path d="M6 9V3h12v6" /><rect x="6" y="14" width="12" height="8" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /></>,
  columns: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  dahboard: <><path d="M4 5h2M9 5h2M14 5h2M4 9h2M9 9h2M14 9h2M4 13h2M9 13h2M14 13h2" /></>,
}

export type MenuItem =
  | { type: 'sep'; label?: undefined; icon?: undefined; iconColor?: undefined }
  | { type?: 'item'; label: string; icon?: keyof typeof I; click: () => void; iconColor?: string; hint?: string }

type Tab = {
  id: number
  url: string
  title: string
  favicon: string | null
  loading: boolean
  incognito?: boolean
  /** opened in the background — webview mounts only when first shown */
  lazy?: boolean
  /** memory saver: webview unmounted, restores on activation */
  sleeping?: boolean
  lastActiveMs?: number
}

type Suggestion = { text: string; url: string; kind: string }
type Bookmark = { id: string; url: string; title?: string; favicon?: string }
type HistoryEntry = { url: string; title?: string; favicon?: string; time: number }
type DlEntry = { url: string; file: string; name: string; size: number; received: number; done: boolean; interrupted?: boolean }
type Popover = { x: number; y: number; align?: 'left' | 'right'; items: MenuItem[] } | null

// ── URLs ───────────────────────────────────────────────────────
const SEARCH_ENGINES: Record<string, (q: string) => string> = {
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  brave: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  startpage: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`,
}

function resolveInput(text: string, settings: Settings): string | null {
  const s = text.trim()
  if (!s) return null
  if (/^(https?|view-source|data):/i.test(s)) return s
  if (/^(localhost|127\.0\.0\.1)(:\d+)?([/?#].*)?$/i.test(s)) return `http://${s}`
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/i.test(s) && !s.includes(' ')) return `https://${s}`
  const eng = SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.duckduckgo
  return eng(s)
}

function omniboxText(tab: Tab | undefined): string {
  if (!tab) return ''
  let url = tab.url
  try {
    const u = new URL(url)
    if (u.protocol.startsWith('http')) {
      // Chrome-style display: hide the scheme, keep the rest verbatim
      url = u.href.replace(/^https?:\/\//, '')
    }
  } catch { /* keep */ }
  if (url.endsWith('/newtab')) return ''
  return url
}

const INTERNAL_NAMES: Record<string, string> = {
  newtab: 'New Tab', settings: 'Settings', history: 'History',
  bookmarks: 'Bookmarks', downloads: 'Downloads',
}
function friendlyInternalName(url: string): string | undefined {
  try {
    const p = new URL(url).pathname.replace('/', '')
    return p ? INTERNAL_NAMES[p] : 'New Tab'
  } catch { return undefined }
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.protocol.startsWith('http') ? u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search : url
  } catch { return url }
}

// ═══════════════════════════════════════════════════════════════
export default function Shell() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [tabs, setTabs] = useState<Tab[]>([])
  const tabsRef = useRef<Tab[]>([])
  tabsRef.current = tabs
  const [activeId, setActiveId] = useState<number | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [omniboxVal, setOmniboxVal] = useState('')
  const [suggests, setSuggests] = useState<Suggestion[]>([])
  const [suggestIdx, setSuggestIdx] = useState(-1)
  const [omniboxFocused, setOmniboxFocused] = useState(false)
  const [popover, setPopover] = useState<Popover>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [findText, setFindText] = useState('')
  const [findCount, setFindCount] = useState('')
  const [error, setError] = useState<{ id: number; desc: string } | null>(null)
  const [statusUrl, setStatusUrl] = useState<string | null>(null)
  // favicon URLs that failed to load → fall back to a globe icon
  const [badFav, setBadFav] = useState<Set<string>>(new Set())
  const [downloadToast, setDownloadToast] = useState<DlEntry | null>(null)
  const [activeDownloads, setActiveDownloads] = useState(0)
  const [maximized, setMaximized] = useState(false)
  const [htmlFullscreen, setHtmlFullscreen] = useState(false)
  const [progressOn, setProgressOn] = useState(false)
  const [progressFinish, setProgressFinish] = useState(false)
  const [booted, setBooted] = useState(false)
  const [toastHide, setToastHide] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitUrl, setSplitUrl] = useState('')
  const [splitInput, setSplitInput] = useState('')
  // DevTools docked in a right-hand pane (webview-tag based)
  const [dtOpen, setDtOpen] = useState(false)
  const dtWvRef = useRef<WvTag | null>(null)
  const [chromeScrolled, setChromeScrolled] = useState(false)

  const wvMap = useRef(new Map<number, WvTag>())
  const wcIdsRef = useRef(new Map<number, number>())
  const wcToTabMap = useRef(new Map<number, number>())
  const tabSeq = useRef(0)
  const pendingUrls = useRef<string[]>([])
  const findInput = useRef<HTMLInputElement>(null)
  const omniboxRef = useRef<HTMLInputElement>(null)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeIdRef = useRef<number | null>(null)
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS)
  activeIdRef.current = activeId
  settingsRef.current = settings
  const activeTabElRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    activeTabElRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeId])
  const bootedRef = useRef(false)
  const closedStack = useRef<string[]>([])
  const menubtnRefs = useRef<Record<string, HTMLElement | null>>({})
  const splitWvRef = useRef<WvTag | null>(null)
  const runActionRef = useRef<(id: string) => void>(() => {})
  const openMenuRef = useRef<string | null>(null)
  openMenuRef.current = openMenu
  const lastMediaAt = useRef(new Map<number, number>())
  const [winPriv] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).has('incognito')
      : false)

  const activeTab = tabs.find((t) => t.id === activeId)
  const activeWv = activeId != null ? wvMap.current.get(activeId) : undefined
  const isInternal = (url: string) => {
    try { return new URL(url).origin === window.location.origin } catch { return false }
  }
  const pageUrl = (p: string) => `${window.location.origin}/${p}`
  const shortcutHint = (id: string) =>
    comboToLabel({ ...DEFAULT_SHORTCUT_MAP, ...(settings.shortcuts || {}) }[id] || '')

  // display name for a tab: friendly names for internal pages (restore-safe),
  // stored/live title for real sites
  const tabName = (tab: Tab | undefined): string => {
    if (!tab) return 'New Tab'
    if (isInternal(tab.url)) {
      const name = ({
        newtab: 'New Tab', settings: 'Settings', history: 'History',
        bookmarks: 'Bookmarks', downloads: 'Downloads',
      } as Record<string, string>)[new URL(tab.url).pathname.replace('/', '')]
      if (name) return name
    }
    return tab.title || 'New Tab'
  }

  // ── data helpers ─────────────────────────────────────────────
  const refreshBookmarks = useCallback(async () => {
    setBookmarks((await bridge!.getData('bookmarks')) || [])
  }, [])

  const addHistory = useCallback(async (tab: { url: string; title: string; favicon: string | null }) => {
    if (!tab.url || isInternal(tab.url)) return
    const list: HistoryEntry[] = (await bridge!.getData('history')) || []
    const filtered = list.filter((h) => h.url !== tab.url)
    filtered.unshift({ url: tab.url, title: tab.title, favicon: tab.favicon ?? undefined, time: Date.now() })
    await bridge!.setData('history', filtered.slice(0, 5000))
  }, [])

  async function updateHistoryTitle(url: string, title: string) {
    if (!url || isInternal(url)) return
    const list: HistoryEntry[] = (await bridge!.getData('history')) || []
    const h = list.find((x) => x.url === url)
    if (h && h.title !== title) {
      h.title = title
      await bridge!.setData('history', list)
    }
  }

  const isBookmarked = useMemo(
    () => !!activeTab && bookmarks.some((b) => b.url === activeTab.url),
    [bookmarks, activeTab],
  )

  // ── tab management ───────────────────────────────────────────
  const activateTab = useCallback((id: number) => {
    setTabs((ts) => {
      const tab = ts.find((t) => t.id === id)
      // first-show of a lazily loaded background tab / wake of a sleeping tab:
      // the webview mounts in this same commit and picks up src = tab.url
      if (tab && (tab.lazy || tab.sleeping)) {
        return ts.map((t) => (t.id === id ? { ...t, lazy: false, sleeping: false, lastActiveMs: Date.now() } : t))
      }
      return ts.map((t) => (t.id === id ? { ...t, lastActiveMs: Date.now() } : t))
    })
    setActiveId(id)
    setChromeScrolled(false)
    requestAnimationFrame(() => {
      wvMap.current.forEach((wv, tid) => {
        const el = wv
        el.hidden = tid !== id
        if (tid === id && el.classList.contains('domready')) el.focus()
      })
      wvMap.current.get(id)?.focus()
    })
  }, [])

  const newTab = useCallback((url?: string | null, opts?: { incognito?: boolean; background?: boolean }) => {
    const id = ++tabSeq.current
    const start = url || (settingsRef.current.startupPage === 'homepage' && settingsRef.current.homepage
      ? resolveInput(settingsRef.current.homepage, settingsRef.current)!
      : pageUrl('newtab'))
    // background tabs load lazily on first show (cheap; the webview mounts on activation)
    const lazy = !!opts?.background && settingsRef.current.perf?.lazyTabs !== false
    const incognito = opts?.incognito ?? winPriv
    const tab: Tab = { id, url: start, title: 'New Tab', favicon: null, loading: false, lazy, incognito }
    setTabs((t) => [...t, tab])
    if (!opts?.background) {
      setActiveId(id)
      setTimeout(() => {
        omniboxRef.current?.focus()
        omniboxRef.current?.select()
      }, 40)
    }
    return tab
  }, [])

  const closeTab = useCallback((id: number) => {
    // do NOT wv.remove() manually — React owns this element; detaching it
    // ourselves makes the next commit throw NotFoundError and crashes the
    // whole app into the Next error page. Unmounting via setTabs destroys
    // the guest properly.
    wvMap.current.delete(id)
    setTabs((tabsNow) => {
      const idx = tabsNow.findIndex((t) => t.id === id)
      if (idx === -1) return tabsNow
      if (tabsNow[idx].url && !isInternal(tabsNow[idx].url)) {
        closedStack.current.push(tabsNow[idx].url)
        if (closedStack.current.length > 50) closedStack.current.shift()
      }
      const keep = tabsNow.filter((t) => t.id !== id)
      if (tabsNow.length === 1) {
        // last tab: replace with a fresh new tab
        const nid = ++tabSeq.current
        const nt: Tab = { id: nid, url: pageUrl('newtab'), title: 'New Tab', favicon: null, loading: false }
        setActiveId(nid)
        return [nt]
      }
      if (id === activeIdRef.current) {
        const neighbor = keep[Math.min(idx, keep.length - 1)]
        setActiveId(neighbor.id)
      }
      return keep
    })
  }, [])

  // ── memory saver: put idle background tabs to sleep ──────────
  const batteryRef = useRef(false)
  useEffect(() => {
    const tick = setInterval(() => {
      const p = settingsRef.current.perf
      if (!p?.sleepTabs) return
      let threshold = p?.sleepAfter ?? 600
      if (p?.battery && batteryRef.current) threshold = Math.min(threshold, 60)
      const now = Date.now()
      setTabs((ts) => {
        let changed = false
        const next = ts.map((t) => {
          if (t.id === activeIdRef.current || t.sleeping || t.lazy || t.incognito) return t
          if (t.loading) return t
          // never sleep a tab that recently played audio (podcasts etc.)
          const lastMedia = lastMediaAt.current.get(t.id) || 0
          if (now - lastMedia < 5 * 60_000) return t
          const started = t.lastActiveMs ?? now - threshold - 1
          if (now - started < threshold * 1000) return t
          const wv = wvMap.current.get(t.id)
          const url = wv?.getURL?.() || t.url
          const title = (wv && wv.getURL?.() !== 'about:blank' ? wv.getTitle?.() : null) || t.title
          if (wv) wvMap.current.delete(t.id)
          changed = true
          return { ...t, sleeping: true, url, title }
        })
        return changed ? next : ts
      })
    }, 10_000)
    return () => clearInterval(tick)
  }, [])

  const cycleTab = useCallback((dir: number) => {
    setTabs((ts) => setTabsSafe(ts))
    function setTabsSafe(ts: Tab[]) {
      if (ts.length < 2) return ts
      const idx = ts.findIndex((t) => t.id === activeIdRef.current)
      const next = ts[(idx + dir + ts.length) % ts.length]
      setActiveId(next.id)
      return ts
    }
  }, [])

  const reorderTab = useCallback((fromId: number, toId: number, after: boolean) => {
    setTabs((ts) => {
      const from = ts.findIndex((t) => t.id === fromId)
      if (from === -1 || fromId === toId) return ts
      const to = ts.findIndex((t) => t.id === toId)
      if (to === -1) return ts
      const [moved] = ts.splice(from, 1)
      const target = ts.findIndex((t) => t.id === toId) + (after ? 1 : 0)
      const copy = [...ts]
      copy.splice(target, 0, moved)
      return copy
    })
  }, [])

  // ── navigation ───────────────────────────────────────────────
  const go = useCallback((input: string) => {
    const url = resolveInput(input, settingsRef.current)
    if (!url) return
    if (isInternal(url) && url.includes('/newtab')) return
    const curWv = activeIdRef.current != null ? wvMap.current.get(activeIdRef.current) : null
    curWv?.loadURL(url)
    omniboxRef.current?.blur()
    setSuggests([])
    setSuggestIdx(-1)
  }, [])

  // ── top progress bar: one pass per main-frame navigation ─────
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressActive = useRef(false)
  const beginProgress = useCallback(() => {
    if (progressTimer.current) { clearTimeout(progressTimer.current); progressTimer.current = null }
    progressActive.current = true
    setProgressOn(true)
    setProgressFinish(false)
  }, [])
  const endProgress = useCallback(() => {
    if (!progressActive.current) return
    progressActive.current = false
    setProgressFinish(true)
    if (progressTimer.current) clearTimeout(progressTimer.current)
    progressTimer.current = setTimeout(() => {
      setProgressOn(false)
      setProgressFinish(false)
      progressTimer.current = null
    }, 420)
  }, [])

  // ── webview wiring (imperative, per tab) ─────────────────────
  const attachWebview = useCallback((tabId: number, wv: WvTag, incognito = false) => {
    wvMap.current.set(tabId, wv)
    wv.dataset.attN = String(((+wv.dataset.attN) || 0) + 1)

    const syncWc = () => {
      try {
        let id: any = null
        if (typeof wv.getWebContentsId === 'function') {
          id = wv.getWebContentsId()
        }
        if (id && typeof id.then === 'function') {
          id.then((realId: number) => {
            if (realId) {
              wcIdsRef.current.set(tabId, realId)
              wcToTabMap.current.set(realId, tabId)
            }
          }).catch(() => {})
        } else if (typeof id === 'number' && id > 0) {
          wcIdsRef.current.set(tabId, id)
          wcToTabMap.current.set(id, tabId)
        }
      } catch {}
    }
    syncWc()
    setTimeout(syncWc, 250)
    setTimeout(syncWc, 1000)

    wv.addEventListener('did-attach', syncWc)

    const updateTabFromWv = () => {
      syncWc()
      try {
        const u = wv.getURL?.() || (wv.getAttribute('data-url') as string) || ''
        const t = wv.getTitle?.() || ''
        if (u && u !== 'about:blank') {
          const isInt = isInternal(u)
          const finalTitle = isInt ? (friendlyInternalName(u) || 'New Tab') : (t || 'New Tab')
          setTabs((ts) => ts.map((tab) => (tab.id === tabId ? { ...tab, url: u, title: (finalTitle !== 'New Tab' || tab.title === 'New Tab') ? finalTitle : tab.title } : tab)))
        }
      } catch {}
    }

    wv.addEventListener('dom-ready', () => {
      wv.classList.add('domready')
      updateTabFromWv()
    })
    wv.addEventListener('did-finish-load', updateTabFromWv)

    wv.addEventListener('will-navigate', (e: any) => {
      if (e.url && e.url !== 'about:blank') {
        wv.setAttribute('data-url', e.url)
        setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, url: e.url } : t)))
      }
    })

    wv.addEventListener('load-commit', (e: any) => {
      if (e.isMainFrame && e.url && e.url !== 'about:blank') {
        wv.setAttribute('data-url', e.url)
        setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, url: e.url } : t)))
      }
    })

    wv.addEventListener('page-title-updated', (e: any) => {
      syncWc()
      const liveUrl = wv.getURL?.() || (wv.getAttribute('data-url') as string) || ''
      const isInt = isInternal(liveUrl)
      const title = isInt ? (friendlyInternalName(liveUrl) || 'New Tab') : (e.title || 'New Tab')
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, title, url: liveUrl && liveUrl !== 'about:blank' ? liveUrl : t.url } : t)))
      if (tabId === activeIdRef.current) document.title = `Kamui — ${title}`
      if (!incognito && liveUrl && !isInt) updateHistoryTitle(liveUrl, title)
    })

    wv.addEventListener('page-favicon-updated', (e: any) => {
      const favicon = e.favicons?.[0] || null
      if (favicon) setBadFav((prev) => { const n = new Set(prev); n.delete(favicon); return n })
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, favicon } : t)))
    })

    wv.addEventListener('did-start-loading', () => {
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, loading: true } : t)))
    })
    wv.addEventListener('did-stop-loading', () => {
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, loading: false } : t)))
      updateTabFromWv()
      if (tabId === activeIdRef.current) endProgress()
    })

    // progress bar: driven by real navigations only, so subresource loads
    // (which re-fire did-finish-load) can't restart it.
    wv.addEventListener('did-start-navigation', (e: any) => {
      if (e.isMainFrame && !e.isSameDocument && tabId === activeIdRef.current) beginProgress()
    })

    const onNav = (navUrl: string) => {
      if (!navUrl || navUrl === 'about:blank') return
      wv.setAttribute('data-url', navUrl)
      syncWc()
      const isInt = isInternal(navUrl)
      const liveTitle = wv.getTitle?.()
      const title = isInt ? (friendlyInternalName(navUrl) || 'New Tab') : (liveTitle || 'New Tab')
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, url: navUrl, title: (title !== 'New Tab' || t.title === 'New Tab') ? title : t.title } : t)))
      if (tabId === activeIdRef.current) {
        setChromeScrolled(false)
        if (!omniboxFocused) setOmniboxVal(omniboxText({ ...activeTab!, url: navUrl }))
      }
      if (!incognito && !isInt) addHistory({ url: navUrl, title: tabTitle(tabId), favicon: tabFavicon(tabId) })
    }

    wv.addEventListener('did-navigate', (e: any) => onNav(e.url))
    wv.addEventListener('did-navigate-in-page', (e: any) => {
      if (e.isMainFrame && e.url) onNav(e.url)
    })
    wv.addEventListener('did-fail-load', (e: any) => {
      if (e.isMainFrame && e.errorCode !== -3) {
        setError({ id: tabId, desc: `${e.errorDescription} (${e.errorCode})` })
        if (tabId === activeIdRef.current) endProgress()
      }
    })
    wv.addEventListener('found-in-page', (e: any) => {
      const r = e.result
      if (r?.activeMatchOrdinal !== undefined) setFindCount(`${r.activeMatchOrdinal} / ${r.matches ?? '?'}`)
    })
    wv.addEventListener('update-target-url', (e: any) => setStatusUrl(e.url && e.url !== 'about:blank' ? e.url : null))
    wv.addEventListener('enter-html-full-screen', () => setHtmlFullscreen(true))
    wv.addEventListener('leave-html-full-screen', () => setHtmlFullscreen(false))
    wv.addEventListener('media-started-playing', () => { lastMediaAt.current.set(tabId, Date.now()) })
    wv.addEventListener('close', () => closeTab(tabId))
    wv.addEventListener('focus', () => {
      setPopover(null)
      setOpenMenu(null)
    })

    // keep local helpers
    function tabTitle(id: number): string {
      return wv.getTitle?.() || 'New Tab'
    }
    function tabFavicon(id: number): string | null {
      return favicons.current.get(id) ?? null
    }
  }, [addHistory, closeTab])
  const favicons = useRef(new Map<number, string | null>())
  // keep favicon latest for history
  useEffect(() => {
    tabs.forEach((t) => { if (t.favicon) favicons.current.set(t.id, t.favicon) })
  }, [tabs])

  // heartbeat: keep active tab's title & URL live and synchronized
  useEffect(() => {
    const iv = setInterval(() => {
      const id = activeIdRef.current
      if (id == null) return
      const wv = wvMap.current.get(id)
      if (!wv) return
      try {
        const url = wv.getURL?.() || (wv.getAttribute('data-url') as string) || ''
        const title = wv.getTitle?.() || ''
        if (url && url !== 'about:blank') {
          const isInt = isInternal(url)
          const finalTitle = isInt ? (friendlyInternalName(url) || 'New Tab') : (title || 'New Tab')
          setTabs((ts) => ts.map((t) => {
            if (t.id !== id) return t
            if (t.url === url && t.title === finalTitle) return t
            return { ...t, url, title: finalTitle }
          }))
        }
      } catch {}
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  // hide error when navigation starts again
  useEffect(() => {
    if (activeTab?.loading) setError((e) => (e && e.id === activeTab.id ? null : e))
  }, [activeTab?.loading, activeTab?.id])

  // omnibox value follows active tab unless focused
  useEffect(() => {
    if (!omniboxFocused) setOmniboxVal(omniboxText(activeTab))
  }, [activeTab?.url, activeTab?.id, omniboxFocused])

  // ── boot ─────────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false
    ;(async () => {
      const s = await readSettings()
      if (disposed) return
      setSettings(s)
      applyTheme(s)
      await refreshBookmarks()
      setIsMaximized((await bridge!.isMaximized()) || false)
      // preload file for webview guests must be resolvable before first tab
      const paths = await bridge!.getPaths()
      preloadModel.current = `file://${paths.internalPreload}`
      const first = s.startupPage === 'homepage' && s.homepage
        ? resolveInput(s.homepage, s)!
        : pageUrl('newtab')
      newTab(first, winPriv ? { incognito: true } : undefined)
      bootedRef.current = true
      setBooted(true)
      // this window's logo should follow the palette too
      if (!winPriv) bridge?.setDockIcon(accentHex(s))
      for (const u of pendingUrls.current.splice(0)) newTab(u, winPriv ? { incognito: true } : undefined)
    })()
    return () => { disposed = true }
  }, [])

  // note: preload path set in boot before first webview renders

  // ── subscriptions ────────────────────────────────────────────
  useEffect(() => {
    const offs: any[] = []
    const on = (ch: string, cb: (...args: any[]) => void) => {
      const u = bridge!.on(ch, cb)
      if (u) offs.push(u)
      return u
    }

    const ACTION_IDS = [
      'new-tab', 'reopen-tab', 'close-tab', 'next-tab', 'prev-tab',
      'reload', 'stop', 'focus-omnibox', 'find', 'devtools',
      'zoom-in', 'zoom-out', 'zoom-reset', 'toggle-bookmark',
      'show-settings', 'show-history', 'show-bookmarks', 'show-downloads',
      'split-toggle', 'split-go', 'fullscreen', 'clear-history',
      'new-incognito-tab', 'page-print', 'page-save',
    ]
    for (const id of ACTION_IDS) on(`accel:${id}`, () => runActionRef.current(id))
    on('accel:new-tab-with-url', (url: string) => {
      if (!bootedRef.current) pendingUrls.current.push(url)
      else newTab(url, winPriv ? { incognito: true } : undefined)
    })
    // background tab: appears without stealing the active view, loads lazily
    on('accel:new-tab-background', (url: string) => {
      if (!bootedRef.current) pendingUrls.current.push(url)
      else newTab(url, { background: true, ...(winPriv ? { incognito: true } : {}) })
    })
    on('guest:navigated', (wid: number, url: string, title?: string) => {
      let tabId = wcToTabMap.current.get(wid)
      if (tabId == null && tabsRef.current.length === 1) {
        tabId = tabsRef.current[0].id
        wcToTabMap.current.set(wid, tabId)
        wcIdsRef.current.set(tabId, wid)
      } else if (tabId == null) {
        for (const [tId, elem] of Array.from(wvMap.current.entries())) {
          try {
            if (typeof elem.getWebContentsId === 'function' && elem.getWebContentsId() === wid) {
              tabId = tId
              wcToTabMap.current.set(wid, tabId)
              wcIdsRef.current.set(tabId, wid)
              break
            }
          } catch {}
        }
      }
      if (tabId == null || !url || url === 'about:blank') return
      const isInt = isInternal(url)
      const finalTitle = isInt ? (friendlyInternalName(url) || 'New Tab') : (title || 'New Tab')
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, url, title: (finalTitle !== 'New Tab' || t.title === 'New Tab') ? finalTitle : t.title } : t)))
      if (tabId === activeIdRef.current) document.title = `Kamui — ${finalTitle}`
    })
    on('guest:title', (wid: number, title: string, url?: string) => {
      let tabId = wcToTabMap.current.get(wid)
      if (tabId == null && tabsRef.current.length === 1) tabId = tabsRef.current[0].id
      if (tabId == null) return
      const isInt = url ? isInternal(url) : false
      const finalTitle = isInt ? (friendlyInternalName(url!) || 'New Tab') : (title || 'New Tab')
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, title: finalTitle, url: url && url !== 'about:blank' ? url : t.url } : t)))
      if (tabId === activeIdRef.current) document.title = `Kamui — ${finalTitle}`
    })
    on('guest:favicon', (wid: number, favicon: string | null) => {
      let tabId = wcToTabMap.current.get(wid)
      if (tabId == null && tabsRef.current.length === 1) tabId = tabsRef.current[0].id
      if (tabId == null) return
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, favicon } : t)))
    })
    on('perf:battery', (on: boolean) => { batteryRef.current = !!on })
    on('chrome:scrolled', (scrolled: boolean, wid: number) => {
      const active = wcIdsRef.current.get(activeIdRef.current!)
      if (wid != null && active != null && wid !== active) return
      setChromeScrolled(!!scrolled)
    })
    on('download:started', (e: DlEntry) => {
      setToastHide(false)
      setDownloadToast(e)
      setActiveDownloads((n) => n + 1)
      clearTimeout(toastTimer.current!)
    })
    on('download:progress', (e: DlEntry) => {
      setDownloadToast((cur) => (cur && cur.url === e.url ? e : cur))
    })
    on('download:done', (e: DlEntry) => {
      setDownloadToast((cur) => (cur && cur.url === e.url ? e : cur))
      setActiveDownloads((n) => Math.max(0, n - 1))
      toastTimer.current = setTimeout(() => setToastHide(true), 2200)
    })
    on('win:maximized', (max: boolean) => setMaximized(max))
    on('win:fullscreen', (fs: boolean) => {
      document.documentElement.dataset.fullscreen = fs ? 'true' : 'false'
    })
    ;(async () => {
      const max = await bridge!.isMaximized()
      setMaximized(max)
      const fs = await bridge?.isFullscreen?.()
      if (typeof fs === 'boolean') {
        document.documentElement.dataset.fullscreen = fs ? 'true' : 'false'
      }
    })()

    const dataChanged = (key: string) => {
      if (key === 'settings') {
        readSettings().then((s) => { setSettings(s); applyTheme(s); bridge?.setDockIcon(accentHex(s)) })
      }
      if (key === 'bookmarks') refreshBookmarks()
    }
    const wrap = (...args: any[]) => dataChanged(args[0] as string)
    ;(bridge as any).on?.('data:changed', wrap)

    return () => {
      for (const o of offs) {
        if (typeof o === 'function') o()
        else if (o && typeof o.then === 'function') o.then((fn: any) => typeof fn === 'function' && fn())
      }
    }
  }, [])

  const activeWvRef = useRef<WvTag | undefined>(undefined)
  activeWvRef.current = activeWv

  // ── omnibox suggestions ──────────────────────────────────────
  const updateSuggestions = useCallback(async () => {
    const text = omniboxVal.trim()
    if (!text || !omniboxFocused) { setSuggests([]); setSuggestIdx(-1); return }
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    suggestTimer.current = setTimeout(async () => {
      const [history, bms] = await Promise.all([
        bridge!.getData('history'), bridge!.getData('bookmarks'),
      ])
      const lower = text.toLowerCase()
      const out: Suggestion[] = []
      const direct = resolveInput(text, settingsRef.current)
      if (direct) out.push({ text, url: direct, kind: direct === (SEARCH_ENGINES[settingsRef.current.searchEngine] || SEARCH_ENGINES.duckduckgo)(text) ? 'Search' : 'Go to' })
      for (const b of bms || []) {
        if ((b.title || '').toLowerCase().includes(lower) || (b.url as string).toLowerCase().includes(lower)) {
          if (!out.some((o) => o.url === b.url) && out.length < 7)
            out.push({ text: b.title || b.url, url: b.url, kind: 'Bookmark' })
        }
      }
      for (const h of history || []) {
        if ((h.title || '').toLowerCase().includes(lower) || (h.url as string).toLowerCase().includes(lower)) {
          if (!out.some((o) => o.url === h.url) && out.length < 8)
            out.push({ text: h.title || h.url, url: h.url, kind: 'History' })
        }
      }
      setSuggests(out)
      setSuggestIdx(-1)
    }, 120)
  }, [omniboxVal, omniboxFocused])

  // ── bookmark toggle ──────────────────────────────────────────
  const toggleBookmark = useCallback(async () => {
    const tab = tabs.find((t) => t.id === activeIdRef.current)
    if (!tab) return
    const bms: Bookmark[] = (await bridge!.getData('bookmarks')) || []
    const exists = bms.find((b) => b.url === tab.url)
    if (exists) {
      await bridge!.setData('bookmarks', bms.filter((b) => b.id !== exists.id))
    } else {
      bms.unshift({ id: `bm-${Date.now()}`, url: tab.url, title: tab.title, favicon: tab.favicon ?? undefined })
      await bridge!.setData('bookmarks', bms)
    }
    refreshBookmarks()
  }, [tabs, refreshBookmarks])

  // ── find ─────────────────────────────────────────────────────
  const openFind = useCallback(() => {
    setFindOpen(true)
    setTimeout(() => findInput.current?.focus(), 50)
  }, [])

  const stopFind = useCallback(() => {
    activeWvRef.current?.stopFindInPage?.('clearSelection')
    setFindOpen(false)
    setFindText('')
    setFindCount('')
  }, [])

  const runFind = useCallback((next = false) => {
    const text = findText
    if (!text || !activeWvRef.current) return
    activeWvRef.current!.findInPage(text, { findNext: next })
  }, [findText])

  useEffect(() => {
    if (findOpen && findText) {
      if (activeWvRef.current) activeWvRef.current!.findInPage(findText, { findNext: false })
    }
  }, [findText, findOpen])

  // ── zoom / devtools / misc ───────────────────────────────────
  function zoom(delta: number) {
    const wv = activeWvRef.current
    if (!wv) return
    const cur = wv.getZoomLevel()
    wv.setZoomLevel(delta === 0 ? 0 : Math.max(-8, Math.min(8, cur + delta)))
  }

  function devtools() {
    setDtOpen((open) => !open)
  }

  // bind DevTools into the pane whenever it opens or the active tab changes
  useEffect(() => {
    if (!dtOpen) return
    let cancelled = false
    ;(async () => {
      // the dt <webview> mounts one frame after the flip — poll briefly
      for (let i = 0; i < 25 && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 200))
        const wv = activeWvRef.current
        const dt = dtWvRef.current
        if (!wv || !dt) continue
        try {
          const mainId = wcIdsRef.current.get(activeIdRef.current!) ?? (await wv.getWebContentsId?.())
          const dtId = await dt.getWebContentsId?.()
          if (!cancelled && mainId && dtId) { await window.kamui?.dtAttach(mainId, dtId, true); return }
        } catch { /* webview not ready yet */ }
      }
    })()
    return () => { cancelled = true }
  }, [dtOpen, activeId, tabs.length])

  function openInternal(path: string) {
    const tab = tabs.find((t) => t.id === activeIdRef.current)
    if (tab && isInternal(tab.url) && !tab.url.includes('/newtab')) {
      activeWvRef.current?.loadURL(pageUrl(path))
    } else {
      newTab(pageUrl(path))
    }
    setPopover(null)
  }

  function toggleSplit() {
    setSplitOpen((was) => {
      const next = !was
      if (next) {
        const home = settingsRef.current.homepage ? resolveInput(settingsRef.current.homepage, settingsRef.current) : null
        const url = home || pageUrl('newtab')
        setSplitUrl(url)
        setSplitInput('')
        requestAnimationFrame(() => splitWvRef.current?.focus())
      } else {
        // React unmounts the split webview when splitOpen flips false
        splitWvRef.current = null
      }
      return next
    })
  }

  function loadSplit(text: string) {
    const url = resolveInput(text, settingsRef.current)
    if (url) {
      setSplitUrl(url)
      setSplitInput('')
      requestAnimationFrame(() => splitWvRef.current?.focus())
    }
  }

  // central action dispatcher — used by accelerators and the in-app menu bar
  function runAction(id: string) {
    const wv = activeWvRef.current
    if (id.startsWith('edit:')) { bridge?.editCmd?.(id.slice(5)); return }
    switch (id) {
      case 'new-tab': newTab(); break
      case 'new-incognito-tab': bridge?.newIncognitoWindow(); break
      case 'reopen-tab': { const u = closedStack.current.pop(); if (u) newTab(u); break }
      case 'close-tab': if (activeIdRef.current != null) closeTab(activeIdRef.current); break
      case 'next-tab': cycleTab(1); break
      case 'prev-tab': cycleTab(-1); break
      case 'reload': wv?.reload(); break
      case 'stop': wv?.stop(); break
      case 'focus-omnibox': omniboxRef.current?.focus(); break
      case 'find': openFind(); break
      case 'devtools': devtools(); break
      case 'zoom-in': zoom(0.5); break
      case 'zoom-out': zoom(-0.5); break
      case 'zoom-reset': zoom(0); break
      case 'toggle-bookmark': toggleBookmark(); break
      case 'show-settings': openInternal('settings'); break
      case 'show-history': openInternal('history'); break
      case 'show-bookmarks': openInternal('bookmarks'); break
      case 'show-downloads': openInternal('downloads'); break
      case 'split-toggle': toggleSplit(); break
      case 'split-go': {
        if (!splitOpen) { toggleSplit(); break }
        const input = document.querySelector<HTMLInputElement>('.split-url')
        input?.focus(); input?.select()
        break
      }
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen?.()
        break
      case 'clear-history': bridge?.setData('history', []); break
      case 'page-print': case 'page-save': {
        const wcId = activeIdRef.current != null ? wcIdsRef.current.get(activeIdRef.current) : undefined
        if (!wcId) break
        if (id === 'page-print') bridge?.pagePrint?.(wcId)
        else bridge?.pageSave?.(wcId)
        break
      }
      case 'about': openInternal('settings'); break
    }
  }

  // ── keyboard ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Instant butter-smooth accelerators from shell
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 't') {
          e.preventDefault()
          newTab()
          return
        }
        if (k === 'w') {
          e.preventDefault()
          if (activeIdRef.current != null) closeTab(activeIdRef.current)
          return
        }
        if (k === 'r') {
          e.preventDefault()
          const wv = activeIdRef.current != null ? wvMap.current.get(activeIdRef.current) : null
          wv?.reload()
          return
        }
        if (k === 'l') {
          e.preventDefault()
          omniboxRef.current?.focus()
          omniboxRef.current?.select()
          return
        }
      }

      if (e.key === 'Escape') {
        if (openMenuRef.current) setOpenMenu(null)
        else if (findOpen) stopFind()
        else if (omniboxFocused) {
          omniboxRef.current?.blur()
          setSuggests([])
        } else if (popover) setPopover(null)
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [findOpen, omniboxFocused, popover, stopFind, newTab, closeTab])

  useEffect(() => {
    const close = () => { setPopover(null); setOpenMenu(null) }
    // 'click' not 'pointerdown': closing during pointerdown unmounts menu panels
    // before the item's click handler fires on real mouse input
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  // menu strip is OS-idiomatic: macOS uses the system menu bar, on Windows/Linux
  // the in-app strip is hidden until Alt is pressed (Chrome-style)
  const [isMac, setIsMac] = useState(true)
  const [forceStrip, setForceStrip] = useState(false)
  const [stripOn, setStripOn] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mac = navigator.userAgent.includes('Mac')
    setIsMac(mac)
    document.documentElement.dataset.os = mac ? 'mac' : 'other'
    if (params.has('strip')) { setForceStrip(true); setStripOn(true) }
  }, [])
  useEffect(() => {
    if (isMac && !forceStrip) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'Alt') { setStripOn(v => !v); e.preventDefault() }
      else if (e.key === 'Escape') setStripOn(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMac, forceStrip])
  const showStrip = (forceStrip || !isMac) && stripOn

  runActionRef.current = runAction

  // ── render ───────────────────────────────────────────────────

  return (
    <div id="kamui-root">
      {/* ─────────── HEADER (drag) ─────────── */}
      <header className={'shell-header' + (chromeScrolled ? ' scrolled' : '')} style={htmlFullscreen ? { display: 'none' } : undefined}>
        {/* menu strip — Windows/Linux only (macOS uses the system menu bar) */}
        {showStrip && (
        <nav className="menustrip" aria-label="Menu bar">
          {MENU_TITLES.map((m) => (
            <button
              key={m.title}
              className={'menubtn' + (openMenu === m.title ? ' open' : '')}
              onClick={(e) => {
                e.stopPropagation()
                if (openMenu === m.title) { setOpenMenu(null); return }
                const b = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ left: b.left, top: b.bottom + 4 })
                setOpenMenu(m.title)
              }}
              onMouseEnter={() => {
                if (openMenu && openMenu !== m.title) {
                  const b = menubtnRefs.current[m.title]?.getBoundingClientRect()
                  if (b) { setMenuPos({ left: b.left, top: b.bottom + 4 }); setOpenMenu(m.title) }
                }
              }}
              ref={(el) => { menubtnRefs.current[m.title] = el }}
            >
              {m.title}
            </button>
          ))}
          <span className="ms-drag" />
        </nav>
        )}
        {openMenu && (
          <div className="menu-c ms-panel" style={{ left: menuPos.left, top: menuPos.top }} onClick={(e) => e.stopPropagation()}>
            {(MENU_TITLES.find((x) => x.title === openMenu) || { items: [] }).items.map((it, i) =>
              it.type === 'sep' ? (
                <div key={i} className="menu-divider" />
              ) : (
                <button key={i} className="menu-item" onClick={() => { setOpenMenu(null); runActionRef.current(it.action!) }}>
                  <span className="ms-label">{it.label}</span>
                  <span className="ms-hint">{it.shortcut ? shortcutHint(it.shortcut) : it.hint ? comboToLabel(it.hint) : ''}</span>
                </button>
              ),
            )}
          </div>
        )}

        {/* tabs row */}
        <div className="tabs-row">
          <div className="tab-strip" onWheel={(e) => {
            // vertical wheel scrolls the strip sideways when it overflows
            const el = e.currentTarget as HTMLElement
            if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.preventDefault()
              el.scrollLeft += e.deltaY
            }
          }}>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                ref={tab.id === activeId ? (el) => { activeTabElRef.current = el } : undefined}
                role="tab"
                aria-selected={tab.id === activeId}
                className={'tab' + (tab.id === activeId ? ' active' : '') + (tab.sleeping ? ' sleeping' : '') + (tab.lazy ? ' lazy' : '')}
                draggable
                onPointerDown={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id) } }}
                onClick={() => activateTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setPopover({
                    x: e.clientX, y: e.clientY,
                    items: [
                      { label: 'Reload', icon: 'reload', click: () => wvMap.current.get(tab.id)?.reload() },
                      { label: 'Duplicate', icon: 'book', click: () => newTab(tab.url) },
                      { type: 'sep' },
                      { label: 'Close Tab', icon: 'x', click: () => closeTab(tab.id) },
                      {
                        label: 'Close Other Tabs', icon: 'x',
                        click: () => {
                          setTabs((ts) => {
                            const keep = ts.filter((t) => t.id === tab.id)
                            return keep
                          })
                          setActiveId(tab.id)
                        },
                      },
                    ],
                  })
                }}
                onDragStart={(e) => e.dataTransfer.setData('text/kamui-tab', String(tab.id))}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = Number(e.dataTransfer.getData('text/kamui-tab'))
                  if (from && from !== tab.id) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const after = e.clientX - rect.left > rect.width / 2
                    reorderTab(from, tab.id, after)
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <span className="t-ico">
                  {tab.incognito
                    ? <svg viewBox="0 0 24 24" style={{ color: 'var(--subtle)' }}>{I.eyeoff}</svg>
                    : tab.loading
                      ? (
                        <svg className="t-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" strokeWidth="3" opacity=".18" />
                          <path d="M21 12a9 9 0 0 0-9-9" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      )
                      : tab.sleeping
                        ? <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" style={{ color: 'var(--muted)' }}><circle cx="12" cy="12" r="9" opacity="0.35" /><path d="M12 8v4l2.5 1.5" opacity="0.9" /></svg>
                        : tab.favicon && !badFav.has(tab.favicon)
                          ? <img src={tab.favicon} alt="" onError={() => setBadFav((prev) => new Set(prev).add(tab.favicon!))} />
                          : <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" style={{ color: 'var(--subtle)' }}>{I.globe}</svg>}
                </span>
                <span className="t-title">{tabName(tab)}</span>
                <button className="t-close" title="Close" onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}>
                  <svg viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>
            ))}
            <button className="icon-btn new-tab-btn" style={{ width: 30, height: 30, flex: 'none', alignSelf: 'center' }} title="New Tab (Ctrl+T)" onClick={() => newTab()}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
          <div className="drag-strip" />
          <div className="win-controls">
            <button title="Minimize" onClick={() => bridge!.minimize()}><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
            <button title="Maximize" onClick={() => bridge!.maximize()}>
              <svg viewBox="0 0 24 24">{maximized ? <><rect x="4" y="9" width="11" height="11" rx="1" /><path d="M8 5V4a1 1 0 0 1 1-1h11v11" /></> : <rect x="5" y="5" width="14" height="14" rx="1" />}</svg>
            </button>
            <button title="Close" className="wc-close" onClick={() => bridge!.close()}><svg viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
          </div>
        </div>

        {/* toolbar row */}
        <div className="toolbar">
          <div className="nav-group">
            <button className="icon-btn" title="Back" onClick={() => activeWv?.goBack()}>
              <svg viewBox="0 0 24 24">{I.left}</svg>
            </button>
            <button className="icon-btn" title="Forward" onClick={() => activeWv?.goForward()}>
              <svg viewBox="0 0 24 24">{I.right}</svg>
            </button>
            <button className="icon-btn" title={activeTab?.loading ? 'Stop' : 'Reload'} onClick={() => (activeTab?.loading ? activeWv?.stop() : activeWv?.reload())}>
              <svg viewBox="0 0 24 24">{I.reload}</svg>
            </button>
          </div>
          <button className="icon-btn" title="Home" onClick={() => {
            const home = settings.homepage ? resolveInput(settings.homepage, settings) : null
            activeWv?.loadURL(home || pageUrl('newtab'))
          }}>
            <svg viewBox="0 0 24 24">{I.home}</svg>
          </button>

          {/* omnibox */}
          <div className="omnibox-wrap">
            <svg className="omnibox-icon" viewBox="0 0 24 24" style={{ color: !!activeTab?.incognito ? 'var(--muted)' : undefined } as React.CSSProperties}>
              {activeTab?.incognito ? I.eyeoff
                : activeTab?.url?.startsWith('https://') ? I.lock
                : activeTab && isInternal(activeTab.url) ? I.folder : I.globe}
            </svg>
            <input
              ref={omniboxRef}
              className="omnibox"
              value={omniboxVal}
              spellCheck={false}
              placeholder="Search or enter website"
              onChange={(e) => setOmniboxVal(e.target.value)}
              onFocus={(e) => { setOmniboxFocused(true); e.currentTarget.select(); updateSuggestions() }}
              onBlur={() => setTimeout(() => { setOmniboxFocused(false); setSuggests([]) }, 140)}
              onInput={() => updateSuggestions()}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && suggests.length) {
                  e.preventDefault()
                  setSuggestIdx((i) => (i + 1) % suggests.length)
                } else if (e.key === 'ArrowUp' && suggests.length) {
                  e.preventDefault()
                  setSuggestIdx((i) => (i - 1 + suggests.length) % suggests.length)
                } else if (e.key === 'Enter') {
                  const pick = suggests[suggestIdx]?.url ?? omniboxVal
                  go(pick)
                } else if (e.key === 'Escape') {
                  ;(e.currentTarget as HTMLInputElement).blur()
                  setSuggests([])
                  setOmniboxVal(omniboxText(activeTab))
                }
              }}
            />
            <button
              className="icon-btn"
              style={{ width: 30, height: 30 }}
              aria-pressed={isBookmarked}
              title="Bookmark this page (Ctrl+D)"
              onClick={toggleBookmark}
            >
              <svg viewBox="0 0 24 24">{I.star}</svg>
            </button>

            {/* suggestions */}
            {suggests.length > 0 && omniboxFocused && (
              <div className="suggest" role="listbox">
                {suggests.map((sg, i) => (
                  <button
                    key={sg.url + i}
                    role="option"
                    aria-selected={i === suggestIdx}
                    className={'suggest-item' + (i === suggestIdx ? ' selected' : '')}
                    onMouseDown={(e) => { e.preventDefault(); go(sg.url) }}
                  >
                    <svg className="s-ico" viewBox="0 0 24 24">
                      {sg.kind === 'Search' ? I.search : sg.kind === 'Bookmark' ? I.star : I.clock}
                    </svg>
                    <span className="s-url"><b>{sg.text.slice(0, 60)}</b></span>
                    <span className="chip s-kind">{sg.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* overflow menu — next to the omnibox */}
          <button
            className="icon-btn"
            style={{ width: 30, height: 30 }}
            title="More"
            onClick={(e) => {
              e.stopPropagation()
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setPopover({
                x: rect.right - 4, y: rect.bottom + 6, align: 'right',
                items: [
                  { label: 'New Tab', icon: 'plus', hint: shortcutHint('new-tab'), click: () => runActionRef.current('new-tab') },
                  { label: 'Reopen Closed Tab', icon: 'reload', hint: shortcutHint('reopen-tab'), click: () => runActionRef.current('reopen-tab') },
                  { label: 'New Private Window', icon: 'eyeoff', hint: shortcutHint('new-incognito-tab'), click: () => runActionRef.current('new-incognito-tab') },
                  { type: 'sep' as const },
                  { label: 'History', icon: 'clock', click: () => runActionRef.current('show-history') },
                  { label: 'Downloads', icon: 'download', click: () => runActionRef.current('show-downloads') },
                  { label: 'Bookmarks', icon: 'book', click: () => runActionRef.current('show-bookmarks') },
                  { label: 'Bookmark This Page', icon: 'star', hint: shortcutHint('toggle-bookmark'), click: () => runActionRef.current('toggle-bookmark') },
                  { type: 'sep' as const },
                  { label: 'Print…', icon: 'print', hint: shortcutHint('page-print'), click: () => runActionRef.current('page-print') },
                  { label: 'Save Page As…', icon: 'download', click: () => runActionRef.current('page-save') },
                  { label: 'Find', icon: 'search', hint: shortcutHint('find'), click: () => runActionRef.current('find') },
                  { type: 'sep' as const },
                  { label: 'Zoom In', hint: shortcutHint('zoom-in'), click: () => runActionRef.current('zoom-in') },
                  { label: 'Zoom Out', hint: shortcutHint('zoom-out'), click: () => runActionRef.current('zoom-out') },
                  { label: 'Actual Size', hint: shortcutHint('zoom-reset'), click: () => runActionRef.current('zoom-reset') },
                  { label: 'Full Screen', icon: 'expand', hint: shortcutHint('fullscreen'), click: () => runActionRef.current('fullscreen') },
                  { type: 'sep' as const },
                  { label: 'Developer Tools', icon: 'code', hint: comboToLabel('Alt+Mod+I'), click: () => runActionRef.current('devtools') },
                  { label: 'Toggle Split View', icon: 'columns', hint: shortcutHint('split-toggle'), click: () => runActionRef.current('split-toggle') },
                  { type: 'sep' as const },
                  { label: 'Settings', icon: 'settings', hint: shortcutHint('show-settings'), click: () => runActionRef.current('show-settings') },
                  { label: 'Help & About', icon: 'info', click: () => runActionRef.current('about') },
                  { type: 'sep' as const },
                  { label: 'Close Tab', icon: 'x', hint: shortcutHint('close-tab'), click: () => runActionRef.current('close-tab') },
                ],
              })
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
            </svg>
            {activeDownloads > 0 && <span className="dl-badge">{activeDownloads}</span>}
          </button>
        </div>

        {/* bookmarks bar */}
        {bookmarks.length > 0 && (
          <div className="bookmarks-bar">
            {bookmarks.slice(0, 30).map((bm) => (
              <button
                key={bm.id}
                className="bm-chip"
                title={bm.url}
                onClick={() => activeWv?.loadURL(bm.url)}
                onAuxClick={(e) => { if (e.button === 1) newTab(bm.url, { background: true }) }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setPopover({
                    x: e.clientX, y: e.clientY,
                    items: [
                      { label: 'Open in New Tab', icon: 'external', click: () => newTab(bm.url) },
                      {
                        label: 'Remove Bookmark', icon: 'x',
                        click: async () => {
                          const list: Bookmark[] = (await bridge!.getData('bookmarks')) || []
                          await bridge!.setData('bookmarks', list.filter((b) => b.id !== bm.id))
                          refreshBookmarks()
                        },
                      },
                    ],
                  })
                }}
              >
                {bm.favicon ? <img src={bm.favicon} alt="" /> : <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>{I.bookmark}</svg>}
                <span className="truncate" style={{ maxWidth: 160, display: 'inline-block' }}>{bm.title || prettyUrl(bm.url)}</span>
              </button>
            ))}
          </div>
        )}

        <div className={'progress' + (progressOn ? ' loading' : '') + (progressFinish ? ' finish' : '')} />
      </header>

      {/* ─────────── PAGE AREA ─────────── */}
      <main className={'page-area' + (splitOpen ? ' split-on' : '') + (dtOpen ? ' dt-on' : '')}>
        {tabs.map((tab) => {
          if (tab.lazy || tab.sleeping) {
            // background tabs before first show / asleep tabs — no renderer at all
            return <div key={tab.id} className={'webview-ph' + (tab.id !== activeId ? ' off' : '')} />
          }
          return (
          <webview
            key={tab.id}
              ref={(el) => {
                if (el && !wvMap.current.has(tab.id)) {
                  // defer until element is upgraded
                  requestAnimationFrame(() => attachWebview(tab.id, el as WvTag, !!tab.incognito))
                }
              }}
              className="webview"
              partition={tab.incognito ? 'incognito' : 'persist:kamui'}
            allowpopups={true}
            preload={preloadModel.current}
            src={tab.url}
            hidden={tab.id !== activeId}
          />
          )
        })}

        {/* split view second pane */}
        {splitOpen && (
          <div className="split-pane">
            <div className="split-toolbar" onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" style={{ width: 26, height: 26 }} title="Back" onClick={() => splitWvRef.current?.goBack()}>
                <svg viewBox="0 0 24 24">{I.left}</svg>
              </button>
              <button className="icon-btn" style={{ width: 26, height: 26 }} title="Forward" onClick={() => splitWvRef.current?.goForward()}>
                <svg viewBox="0 0 24 24">{I.right}</svg>
              </button>
              <button className="icon-btn" style={{ width: 26, height: 26 }} title="Reload" onClick={() => splitWvRef.current?.reload()}>
                <svg viewBox="0 0 24 24">{I.reload}</svg>
              </button>
              <input
                className="split-url"
                placeholder="Search or enter website"
                value={splitInput}
                spellCheck={false}
                onChange={(e) => setSplitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadSplit(splitInput)
                  if (e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur()
                }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="icon-btn" style={{ width: 26, height: 26 }} title="Close Split View" onClick={toggleSplit}>
                <svg viewBox="0 0 24 24">{I.x}</svg>
              </button>
            </div>
            <webview
              partition="persist:kamui"
              allowpopups={true}
              preload={preloadModel.current}
              className="webview split-wv"
              src={splitUrl || pageUrl('newtab')}
              ref={(el) => {
                if (el) {
                  requestAnimationFrame(() => {
                    splitWvRef.current = el as WvTag
                    try { splitWvRef.current?.focus() } catch { /* not ready */ }
                  })
                }
              }}
            />
          </div>
        )}

        {/* DevTools — docked right pane */}
        {dtOpen && (
          <div className="dt-pane">
            <div className="dt-head" onClick={(e) => e.stopPropagation()}>
              <span className="dt-title"><svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>{I.code}</svg> DevTools</span>
              <button className="icon-btn" style={{ width: 24, height: 24 }} title="Close DevTools" onClick={devtools}>
                <svg viewBox="0 0 24 24">{I.x}</svg>
              </button>
            </div>
            <webview
              src="about:blank"
              className="webview dt-wv"
              ref={(el) => { requestAnimationFrame(() => { dtWvRef.current = el as WvTag }) }}
            />
          </div>
        )}

        {/* find bar */}
        {findOpen && (
          <div className="findbar" onClick={(e) => e.stopPropagation()}>
            <input
              ref={findInput}
              value={findText}
              placeholder="Find in page"
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runFind(true)
                if (e.key === 'Escape') stopFind()
              }}
            />
            <span className="find-results">{findCount}</span>
            <button className="icon-btn" title="Next" onClick={() => runFind(true)}>
              <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            <button className="icon-btn" title="Previous" onClick={() => runFind(false)}>
              <svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></svg>
            </button>
            <button className="icon-btn" title="Close" onClick={stopFind}>
              <svg viewBox="0 0 24 24">{I.x}</svg>
            </button>
          </div>
        )}

        {/* status bar */}
        {statusUrl && <div className="status-bar">{statusUrl}</div>}

        {/* error card */}
        {error && activeId === error.id && (
          <div className="error-card">
            <svg viewBox="0 0 24 24" style={{ width: 44, height: 44, stroke: 'var(--subtle)', fill: 'none', strokeWidth: 1.6 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v5" /><path d="M12 16.5v.1" /></svg>
            <h2>Can&rsquo;t reach this page</h2>
            <p>{error.desc}</p>
            <div className="row">
              <button className="btn btn-primary" onClick={() => activeWv?.reload()}>Retry</button>
              <button className="btn" onClick={() => setError(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* downloads toast */}
        {downloadToast && !toastHide && (
          <div className="dl-toast">
            <div className="dl-toast-head">
              <span className="dl-toast-ico"><svg viewBox="0 0 24 24">{I.download}</svg></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="dl-toast-name">{downloadToast.name}</div>
                <div className="dl-toast-sub">
                  {downloadToast.done
                    ? downloadToast.interrupted ? 'Interrupted' : 'Completed'
                    : `${formatBytes(downloadToast.received)} of ${formatBytes(downloadToast.size)}`}
                </div>
              </div>
              <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setToastHide(true)}>
                <svg viewBox="0 0 24 24">{I.x}</svg>
              </button>
            </div>
            <div className="dl-toast-bar-wrap">
              <div
                className="dl-toast-bar"
                style={{ width: downloadToast.done || downloadToast.interrupted ? '100%' : `${downloadToast.size ? Math.round((downloadToast.received / downloadToast.size) * 100) : 5}%` }}
              />
            </div>
          </div>
        )}

        {booted ? null : <div className="empty" style={{ padding: 100 }} />}
      </main>

      {/* floating context menu */}
      {popover && <PopoverMenu pop={popover} close={() => setPopover(null)} />}
    </div>
  )
}

// preload file path, resolved during boot before first webview renders
const preloadModel = { current: '' }

function getI(k: keyof typeof I) {
  return (I as any)[k] ?? null
}

function formatBytes(n?: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

function PopoverMenu({ pop, close }: { pop: { x: number; y: number; align?: 'left' | 'right'; items: MenuItem[] }; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({
    left: pop.align === 'right' ? Math.max(8, pop.x - 220) : pop.x,
    top: pop.y,
  })
  const [maxH, setMaxH] = useState<number>(500)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = pop.align === 'right'
      ? Math.max(8, Math.min(pop.x - r.width, window.innerWidth - r.width - 12))
      : Math.max(8, Math.min(pop.x, window.innerWidth - r.width - 12))
    const top = Math.max(8, Math.min(pop.y, window.innerHeight - 80))
    const available = Math.max(160, window.innerHeight - top - 12)
    setPos({ left, top })
    setMaxH(available)
  }, [pop.x, pop.y, pop.align])

  return (
    <div
      ref={ref}
      className="menu-c"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        transformOrigin: pop.align === 'right' ? 'top right' : 'top left',
        minWidth: 210,
        zIndex: 1000,
        maxHeight: maxH,
        overflowY: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {pop.items.map((item, i) =>
        (item as any).type === 'sep' ? (
          <div key={i} className="menu-divider" />
        ) : (
          <button
            key={i}
            className="menu-item"
            onClick={() => { close(); (item as any).click() }}
          >
            {item.icon && (
              <svg viewBox="0 0 24 24" style={{ color: item.iconColor }}>{(I as any)[item.icon]}</svg>
            )}
            {item.label}
            {(item as any).hint ? <span className="ms-hint">{(item as any).hint}</span> : null}
          </button>
        ),
      )}
    </div>
  )
}
