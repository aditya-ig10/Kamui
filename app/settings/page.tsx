'use client'

import React from 'react'
import { ACCENT_HEX, DNS_PRESETS, readSettings, saveSettings, Settings, useSettingsWatch } from '@/lib/bridge'
import { useGuestPage } from '@/lib/internal'
import BrandLogo from '@/components/BrandLogo'
import { SHORTCUTS, SHORTCUT_GROUPS, comboFromEvent, comboToLabel } from '@/lib/shortcuts'

const SECTIONS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></svg> },
  { id: 'performance', label: 'Performance', icon: <svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg> },
  { id: 'search', label: 'Search', icon: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg> },
  { id: 'privacy', label: 'Privacy', icon: <svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg> },
  { id: 'general', label: 'General', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg> },
  { id: 'keyboard', label: 'Keyboard', icon: <svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M8.5 14h7M18 14h.01" /></svg> },
  { id: 'data', label: 'Data', icon: <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg> },
  { id: 'about', label: 'About', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11.5 12h1v4h1" /></svg> },
]

function Row({ label, sub, children }: { label: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div className="set-row">
      <div>
        <div className="s-lbl">{label}</div>
        {sub && <span className="s-sub">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onClick, title }: { on: boolean; onClick: () => void; title?: string }) {
  return <button className={'tgl' + (on ? ' on' : '')} title={title} aria-pressed={on} onClick={onClick} />
}

export default function SettingsPage() {
  const ready = useGuestPage('settings')
  const [s, setS] = React.useState<Settings | null>(null)
  const [paths, setPaths] = React.useState<{ home: string; downloads: string } | null>(null)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [gpu, setGpu] = React.useState<{ status: Record<string, string>; battery: boolean | null } | null>(null)
  const [active, setActive] = React.useState('appearance')
  const mainRef = React.useRef<HTMLDivElement>(null)
  const colorRef = React.useRef<HTMLInputElement>(null)

  useSettingsWatch(async () => { setS(await readSettings()) })

  React.useEffect(() => {
    if (!ready) return
    ;(async () => {
      setS(await readSettings())
      setPaths(await window.kamuiPages!.getPaths())
      setGpu(await window.kamuiPages!.getGPU())
    })()
  }, [ready])

  // capture the next key combination while remapping
  React.useEffect(() => {
    if (!editing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setEditing(null); return }
      const combo = comboFromEvent(e)
      if (!combo) return
      const override = { ...(s?.shortcuts || {}), [editing]: combo }
      save({ shortcuts: override })
      setEditing(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [editing, s])

  // scrollspy: highlight the nav item for whichever panel is in view
  React.useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => {
      const ref = el.getBoundingClientRect()
      const probe = ref.top + 90
      let cur = SECTIONS[0].id
      for (const sec of SECTIONS) {
        const node = document.getElementById('sec-' + sec.id)
        if (node && node.getBoundingClientRect().top <= probe) cur = sec.id
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) cur = SECTIONS[SECTIONS.length - 1].id
      setActive(cur)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [ready, s])

  async function save(patch: Partial<Settings>) {
    setS(await saveSettings(patch, true))
  }

  async function savePerf(patch: Partial<Settings['perf']>) {
    setS(await saveSettings({ perf: { ...(s?.perf || {}), ...patch } } as Partial<Settings>, true))
  }

  function jump(id: string) {
    setActive(id)
    document.getElementById('sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!s) return <div className="ipage"><div className="ipage-body" /></div>

  const customHex = s.accent === 'custom' && s.accentCustom ? s.accentCustom : null
  const perf = { sleepTabs: true, sleepAfter: 600, battery: true, lazyTabs: true, hardware: true, background: true, lite: false, ...(s.perf || {}) }
  const sleepLabels: Record<number, string> = { 30: '30 seconds', 60: '1 minute', 120: '2 minutes', 600: '10 minutes', 1800: '30 minutes', 3600: '1 hour' }
  const needRestart = perf.hardware === false // toggles that only apply on relaunch

  return (
    <div className="ipage set-page">
      {/* sidebar */}
      <aside className="set-nav">
        <div className="set-brand">
          <BrandLogo size={22} className="set-brand-logo" />
          Kamui <b>Settings</b>
        </div>
        <nav className="set-nav-list">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              className={active === sec.id ? 'on' : ''}
              onClick={() => jump(sec.id)}
            >
              {sec.icon}
              {sec.label}
            </button>
          ))}
        </nav>
        <div className="set-nav-foot">v0.3.0 · local JSON</div>
      </aside>

      {/* scrollable content */}
      <main className="set-main" ref={mainRef}>
        <div className="ipage-body">
          <div className="set-head">
            <h1>Settings</h1>
            <p className="ip-sub">Personalize Kamui. Changes apply instantly across the shell, the New Tab and every internal page.</p>
          </div>

          {/* Appearance */}
          <section id="sec-appearance" className="ipanel">
            <h2>Appearance</h2>
            <p className="hint">Mode and accent apply to the browser shell, this page, and the New Tab.</p>

            <Row label="Theme">
              <div className="seg">
                {[
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                  { id: 'auto', label: 'Auto' },
                ].map((m) => (
                  <button key={m.id} className={s.theme === m.id ? 'on' : ''} onClick={() => save({ theme: m.id })}>
                    {m.label}
                  </button>
                ))}
              </div>
            </Row>

            <Row label="Accent">
              <div className="accents" style={{ marginTop: 0 }}>
                {Object.entries(ACCENT_HEX).map(([id, hex]) => (
                  <button
                    key={id}
                    className={'accent-swatch' + (s.accent === id ? ' on' : '')}
                    onClick={() => save({ accent: id })}
                    aria-pressed={s.accent === id}
                  >
                    <span className="as-dot" style={{ background: hex }}>
                      {s.accent === id && (
                        <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      )}
                    </span>
                    <span className="as-label">{id}</span>
                  </button>
                ))}

                {/* custom palette: swatch opens the native color picker */}
                <button
                  className={'accent-swatch' + (s.accent === 'custom' ? ' on' : '')}
                  aria-pressed={s.accent === 'custom'}
                  onClick={() => colorRef.current?.click()}
                >
                  <span className="as-dot" style={{ background: customHex || 'transparent', borderStyle: customHex ? undefined : 'dashed' }}>
                    {!customHex && <svg viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
                    {s.accent === 'custom' && customHex && (
                      <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                  </span>
                  <span className="as-label">custom</span>
                </button>
                <input
                  ref={colorRef}
                  type="color"
                  style={{ display: 'none' }}
                  value={customHex || ACCENT_HEX[s.accent] || ACCENT_HEX.violet}
                  onChange={(e) => save({ accent: 'custom', accentCustom: e.target.value })}
                />
                {s.accent === 'custom' && (
                  <input
                    className="field accent-hex"
                    spellCheck={false}
                    value={customHex || ''}
                    placeholder="#A855F7"
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) save({ accentCustom: v.toLowerCase() })
                      else setS({ ...s, accentCustom: v })
                    }}
                  />
                )}
              </div>
            </Row>

            <Row label="Dock icon" sub="The macOS dock logo follows your accent automatically.">
              <span className="perf-pill good">Auto</span>
            </Row>
          </section>

          {/* Performance */}
          <section id="sec-performance" className="ipanel">
            <h2>Performance</h2>
            <p className="hint">Memory, battery and power behavior.</p>

            <div className="perf-pills">
              {gpu?.status && (
                <>
                  <span className={'perf-pill ' + (gpu.status['2d_canvas']?.match(/enabled/i) || gpu.status['webgl']?.match(/enabled/i) ? '' : 'warn')}>
                    GPU {perf.hardware ? 'on' : 'off'} · WebGL {gpu.status['webgl'] || '?'}
                  </span>
                  <span className="perf-pill">2D canvas {gpu.status['2d_canvas'] || '?'}</span>
                </>
              )}
              {gpu && gpu.battery !== null && (
                <span className={'perf-pill ' + (gpu.battery ? 'warn' : 'good')}>
                  {gpu.battery ? 'On battery — modes tightened' : 'On AC power'}
                </span>
              )}
            </div>

            <Row label="Sleep tabs" sub="Idle background tabs are unloaded to free RAM and wake instantly when you click them.">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  className="field" style={{ width: 150 } as React.CSSProperties}
                  value={String(perf.sleepAfter)}
                  onChange={(e) => savePerf({ sleepAfter: Number(e.target.value) })}
                >
                  {Object.entries(sleepLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <Toggle on={perf.sleepTabs} onClick={() => savePerf({ sleepTabs: !perf.sleepTabs })} />
              </div>
            </Row>

            <Row label="Battery saver" sub="On battery power, tabs sleep after 1 minute and compositing throttles harder.">
              <Toggle on={perf.battery} onClick={() => savePerf({ battery: !perf.battery })} />
            </Row>

            <Row label="Lazy background tabs" sub="Background tabs (middle-click, “Open in background”) only load when first shown.">
              <Toggle on={perf.lazyTabs} onClick={() => savePerf({ lazyTabs: !perf.lazyTabs })} />
            </Row>

            <Row label="Hardware acceleration" sub={perf.hardware ? 'GPU compositing is enabled (recommended).' : 'Disabled — needs a relaunch to take effect.'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {perf.hardware === false && <span className="perf-pill warn">Restart needed</span>}
                <Toggle on={perf.hardware} onClick={() => savePerf({ hardware: !perf.hardware })} />
              </div>
            </Row>

            <Row label="Run in background" sub="Keep Kamui available in the tray/dock after the last window closes (downloads and sessions stay alive).">
              <Toggle on={perf.background} onClick={() => savePerf({ background: !perf.background })} />
            </Row>

            <Row label="Lightweight interface" sub="Drops blur, shadows and animations for maximum responsiveness on weaker machines.">
              <Toggle on={perf.lite} onClick={() => savePerf({ lite: !perf.lite })} />
            </Row>
          </section>

          {/* Search */}
          <section id="sec-search" className="ipanel">
            <h2>Search</h2>
            <p className="hint">Used by the omnibox and New Tab search.</p>
            <Row label="Search engine">
              <select className="field" value={s.searchEngine} onChange={(e) => save({ searchEngine: e.target.value })}>
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="google">Google</option>
                <option value="bing">Bing</option>
                <option value="brave">Brave Search</option>
                <option value="startpage">Startpage</option>
              </select>
            </Row>
          </section>

          {/* Privacy */}
          <section id="sec-privacy" className="ipanel">
            <h2>Privacy</h2>
            <p className="hint">Private windows use an in-memory session — visited pages are never written to history or disk.</p>

            <Row label="Private window">
              <button
                className="btn btn-sm"
                style={{ background: 'var(--brand-soft)', color: 'var(--brand)', borderColor: 'transparent' } as React.CSSProperties}
                onClick={() => window.kamuiPages!.shellAction('new-incognito-tab')}
              >
                New Private Window
              </button>
            </Row>

            <Row label="DNS-over-HTTPS">
              <select
                className="field"
                value={s.dnsMode || 'system'}
                onChange={(e) => save({ dnsMode: e.target.value, dnsUrl: '' })}
              >
                <option value="system">System (default)</option>
                <option value="cloudflare">Cloudflare 1.1.1.1</option>
                <option value="google">Google Public DNS</option>
                <option value="quad9">Quad9 (blocks malware)</option>
                <option value="adguard">AdGuard (blocks ads)</option>
                <option value="custom">Custom URL…</option>
              </select>
            </Row>

            {s.dnsMode === 'custom' && (
              <Row label="DoH server" sub="An https:// resolver URL (RFC 8484).">
                <input
                  className="field"
                  spellCheck={false}
                  placeholder="https://dns.example.com/dns-query"
                  defaultValue={s.dnsUrl}
                  onBlur={(e) => save({ dnsUrl: e.target.value.trim() })}
                />
              </Row>
            )}
            {(s.dnsMode || 'system') !== 'system' && (
              <p className="hint" style={{ marginTop: 10 }}>
                Applied at launch over{' '}
                {s.dnsMode === 'custom' && s.dnsUrl
                  ? new URL(s.dnsUrl).hostname
                  : s.dnsMode !== 'custom' ? new URL(DNS_PRESETS[s.dnsMode as string]).hostname : ''}.
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 } as React.CSSProperties} onClick={() => window.kamuiPages!.restart()}>Restart</button>
              </p>
            )}
          </section>

          {/* General */}
          <section id="sec-general" className="ipanel">
            <h2>General</h2>
            <Row label="Your name" sub="Shown on the New Tab dashboard.">
              <input
                className="field"
                placeholder="Aditya"
                defaultValue={s.profileName}
                onBlur={(e) => save({ profileName: e.target.value.trim() })}
              />
            </Row>
            <Row label="Homepage">
              <input
                className="field"
                placeholder="https://example.com"
                defaultValue={s.homepage}
                onBlur={(e) => save({ homepage: e.target.value.trim() })}
              />
            </Row>
            <Row label="New tabs open">
              <select
                className="field"
                value={s.startupPage}
                onChange={(e) => save({ startupPage: e.target.value })}
              >
                <option value="newtab">New Tab dashboard</option>
                <option value="homepage">Homepage</option>
              </select>
            </Row>
          </section>

          {/* Keyboard */}
          <section id="sec-keyboard" className="ipanel">
            <h2>Keyboard Shortcuts</h2>
            <p className="hint">
              Click the keys in a row, then press the new combination. Escape cancels; remaps apply instantly.
            </p>
            <table className="sc-table">
              <thead>
                <tr><th>Action</th><th style={{ textAlign: 'right' }}>Keys</th></tr>
              </thead>
              <tbody>
                {SHORTCUT_GROUPS.map((group) => (
                  <React.Fragment key={group}>
                    <tr className="sc-group-row"><td colSpan={2}>{group}</td></tr>
                    {SHORTCUTS.filter((sc) => sc.group === group).map((sc) => {
                      const current = s.shortcuts?.[sc.id] || sc.def
                      const overridden = !!s.shortcuts?.[sc.id]
                      const rec = editing === sc.id
                      return (
                        <tr key={sc.id} className={rec ? 'recording' : ''}>
                          <td className="sc-name">{sc.label}</td>
                          <td className="sc-keys">
                            <button
                              className={'kbd' + (rec ? ' recording' : '')}
                              onClick={() => setEditing(rec ? null : sc.id)}
                              title="Change shortcut"
                            >
                              {rec ? 'Press keys…' : comboToLabel(current)}
                            </button>
                            {overridden && (
                              <button
                                className="kbd-reset"
                                title="Reset to default"
                                onClick={async () => {
                                  const rest = { ...(s.shortcuts || {}) }
                                  delete rest[sc.id]
                                  await save({ shortcuts: rest })
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 11, height: 11 }}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </section>

          {/* Data */}
          <section id="sec-data" className="ipanel">
            <h2>Data</h2>
            <p className="hint">Stored as plain JSON in <code className="code">{dataPath(paths)}</code></p>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-sm btn-danger" onClick={async () => { await window.kamuiPages!.setData('history', []) }}>Clear Browsing History</button>
              <button className="btn btn-sm btn-danger" onClick={async () => { await window.kamuiPages!.setData('bookmarks', []) }}>Clear Bookmarks</button>
              <button className="btn btn-sm btn-danger" onClick={async () => { await window.kamuiPages!.setData('downloads', []) }}>Clear Download History</button>
            </div>
          </section>

          {/* About */}
          <section id="sec-about" className="ipanel">
            <h2>About</h2>
            <div className="row" style={{ gap: 10 }}>
              <span className="chip">v0.3.0</span>
              <span className="chip" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>Chromium engine</span>
              <span className="chip" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}>Next.js UI</span>
              <span className="spacer" />
              <a className="btn btn-ghost btn-sm" href="/newtab">Go to New Tab</a>
            </div>
          </section>

          {needRestart && (
            <p className="hint" style={{ textAlign: 'center' }}>
              Some settings finish applying at launch.
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 } as React.CSSProperties} onClick={() => window.kamuiPages!.restart()}>Restart Kamui</button>
            </p>
          )}
          <div className="ip-foot">Kamui <b>Browser</b> · all data stays on this machine as plain JSON</div>
        </div>
      </main>
    </div>
  )
}

function dataPath(paths: { home: string } | null): string {
  if (!paths) return 'user-data'
  return `${paths.home}/Library/Application Support/kamui-browser`
}
