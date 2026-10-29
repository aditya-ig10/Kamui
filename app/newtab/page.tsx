'use client'

import React from 'react'
import { readSettings, Settings } from '@/lib/bridge'
import { useGuestPage } from '@/lib/internal'
import BrandLogo from '@/components/BrandLogo'

const ENGINES: Record<string, (q: string) => string> = {
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  brave: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  startpage: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`,
}

function searchUrl(q: string, cat: string, settings: Settings): string {
  const g = encodeURIComponent(q)
  switch (cat) {
    case 'isch': return `https://www.google.com/search?q=${g}&udm=2`
    case 'vid': return `https://www.google.com/search?q=${g}&udm=7`
    case 'nws': return `https://www.google.com/search?q=${g}&udm=10`
    case 'events': return `https://www.google.com/search?q=${encodeURIComponent(q + ' events my area')}&udm=10`
    default: return (ENGINES[settings.searchEngine] || ENGINES.duckduckgo)(q)
  }
}

function looksLikeUrl(q: string): boolean {
  return !q.includes(' ') && /^(https?:\/\/|[\w-]+(\.[\w-]+)+)/.test(q)
}

function host(url: string): string {
  try {
    const u = new URL(url)
    const h = u.hostname.replace(/^www\./, '')
    const seg = u.pathname.split('/').filter(Boolean)[0]
    return h + (seg && !['search', 'results', 'spaces'].includes(seg) ? ` › ${decodeURIComponent(seg)}` : '')
  } catch { return url }
}

const CATS = [
  { id: '', label: 'All' },
  { id: 'isch', label: 'Images' },
  { id: 'vid', label: 'Videos' },
  { id: 'nws', label: 'News' },
  { id: 'events', label: 'Events' },
]

type Bookmark = { id: string; url: string; title?: string; favicon?: string }
type HistoryEntry = { url: string; title?: string; favicon?: string; time: number }

export default function NewTabPage() {
  const ready = useGuestPage('newtab')
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([])
  const [history, setHistory] = React.useState<HistoryEntry[]>([])
  const [cat, setCat] = React.useState('')
  const [q, setQ] = React.useState('')
  const [now, setNow] = React.useState(() => new Date())
  const [clockOn, setClockOn] = React.useState(false)
  const [badFav, setBadFav] = React.useState<Set<string>>(new Set())

  // live clock (only after mount — deterministic SSR safe)
  React.useEffect(() => {
    if (!ready) return
    setClockOn(true)
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [ready])

  React.useEffect(() => {
    if (!ready) return
    ;(async () => {
      setSettings(await readSettings())
      setBookmarks((await window.kamuiPages!.getData('bookmarks')) || [])
      setHistory((await window.kamuiPages!.getData('history')) || [])
    })()
  }, [ready])

  function navigate(raw: string) {
    const s = settings!
    const text = raw.trim()
    if (!text) return
    location.href = looksLikeUrl(text) && !cat ? (/^https?:/.test(text) ? text : `https://${text}`) : searchUrl(text, cat, s)
  }

  const h = now.getHours()
  const greeting = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const name = settings?.profileName?.trim()

  // dedupe recent history into "top sites" tiles (skip internal pages)
  const origin = typeof location !== 'undefined' ? location.origin : 'http://127.0.0.1:3451'
  const seen = new Set<string>()
  const recents: HistoryEntry[] = []
  for (const x of history) {
    if (!x.url || x.url.startsWith(origin)) continue
    let key = x.url
    try { key = new URL(x.url).hostname + new URL(x.url).pathname.replace(/\/$/, '') } catch { /* keep raw */ }
    if (seen.has(key)) continue
    seen.add(key)
    recents.push(x)
    if (recents.length >= 8) break
  }
  const quick = bookmarks.filter((b) => !seen.has((b.url || '').replace(/\/$/, ''))).slice(0, 8)
  const tiles = [...recents.slice(0, 6), ...quick]

  const dateLabel = clockOn
    ? now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="ipage nt-page">
      <div className="ipage-body" style={{ maxWidth: 760, paddingBottom: 60 }}>
        {/* hero: logo + greeting */}
        <div className="nt-hero">
          <BrandMark />
          <p className="greet-sub slide" style={{ animationDelay: '10ms' }}>
            <strong style={{ color: 'var(--text)' }}>{greeting}{name ? `, ${name}` : ''}</strong>
            {dateLabel && <> · {dateLabel}</>}
            <span style={{ color: 'var(--subtle)' }}> — local-first, no accounts, no tracking</span>
          </p>

          {/* search */}
          <form className="slide" style={{ animationDelay: '40ms', width: '100%', display: 'flex', justifyContent: 'center' }}
            onSubmit={(e) => { e.preventDefault(); navigate(q) }}>
            <div className="nt-search-wrap">
              <svg className="nt-search-ico" viewBox="0 0 24 24" style={{ width: 19, height: 19, stroke: 'var(--muted)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
              <input
                autoFocus
                className="nt-search"
                value={q}
                placeholder={`Search with ${engineLabel(settings)} or enter a website`}
                onChange={(e) => setQ(e.target.value)}
              />
              {q.trim() && (
                <button className="btn btn-sm btn-primary nt-search-go" type="submit" title="Go">
                  <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
              )}
            </div>
          </form>

          {/* category chips */}
          <div className="nt-cats slide" style={{ animationDelay: '80ms' }}>
            {CATS.map((c) => (
              <button
                key={c.id}
                className="btn btn-sm"
                style={cat === c.id ? { background: 'var(--brand-soft)', borderColor: 'transparent', color: 'var(--brand)' } : undefined}
                onClick={() => {
                  setCat(c.id)
                  if (q.trim()) navigate(q)
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* quick tiles — recents + bookmarks in one grid */}
        {tiles.length > 0 && (
          <section className="slide" style={{ marginTop: 44, animationDelay: '120ms' }}>
            <h2 className="sec-h">Quick access</h2>
            <div className="nt-grid">
              {tiles.map((t) => (
                <a key={t.url} className="nt-tile" href={t.url} title={t.url}>
                  {t.favicon && !badFav.has(t.favicon)
                    ? <img src={t.favicon} alt="" onError={() => setBadFav((p) => new Set(p).add(t.favicon!))} />
                    : <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flex: 'none', stroke: 'var(--subtle)', fill: 'none', strokeWidth: 2 }}>
                        <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" />
                      </svg>}
                  <span style={{ minWidth: 0 }}>
                    <span className="tile-name" style={{ display: 'block' }}>{faviconishTitle(t)}</span>
                    <span className="tile-host" style={{ display: 'block' }}>{host(t.url)}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="ip-foot" style={{ marginTop: 60 }}>Kamui <b>Browser</b> — data stays in your user folder as plain JSON.</div>
      </div>
    </div>
  )
}

function faviconishTitle(t: HistoryEntry | Bookmark): string {
  return t.title && t.title.length < 40 ? t.title : host(t.url)
}

function engineLabel(s: Settings | null): string {
  const names: Record<string, string> = {
    duckduckgo: 'DuckDuckGo', google: 'Google', bing: 'Bing', brave: 'Brave', startpage: 'Startpage',
  }
  return names[s?.searchEngine || 'duckduckgo'] || 'DuckDuckGo'
}

function BrandMark() {
  return (
    <div className="slide" style={{ display: 'flex', alignItems: 'center', gap: 14, userSelect: 'none' } as React.CSSProperties}>
      <BrandLogo size={40} />
      <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' } as React.CSSProperties}>kamui</span>
    </div>
  )
}
