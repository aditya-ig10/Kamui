'use client'

import React from 'react'
import { useGuestPage } from '@/lib/internal'

type HistoryEntry = { url: string; title?: string; favicon?: string; time: number }

export default function HistoryPage() {
  const ready = useGuestPage('history')
  const [rows, setRows] = React.useState<HistoryEntry[]>([])
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    if (!ready) return
    ;(async () => { setRows((await window.kamuiPages!.getData('history')) || []) })()
  }, [ready])

  const filtered = q.trim()
    ? rows.filter((r) => (r.title || '').toLowerCase().includes(q.toLowerCase()) || r.url.toLowerCase().includes(q.toLowerCase()))
    : rows
  const groups = groupByDay(filtered.slice(0, 600))

  return (
    <div className="ipage">
      <div className="ipage-body">
        <h1>History</h1>
        <p className="ip-sub">{rows.length ? `${rows.length} page visits stored locally` : 'Your browsing has no trail yet.'}</p>

        <div className="row slide" style={{ marginBottom: 18 } as React.CSSProperties}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 } as React.CSSProperties}>
            <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: 14, width: 16, height: 16, stroke: 'var(--muted)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', pointerEvents: 'none' }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
            <input
              className="field"
              style={{ paddingLeft: 40, borderRadius: 'var(--r-pill)' } as React.CSSProperties}
              placeholder="Search history"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {rows.length > 0 && (
            <button
              className="btn btn-sm btn-danger"
              onClick={async () => { await window.kamuiPages!.setData('history', []) }}
            >
              Clear all
            </button>
          )}
        </div>

        {groups.length === 0 ? (
          <Empty icon="clock" text={q ? 'No matches for this search' : 'Pages you visit will appear here, grouped by day'} />
        ) : (
          groups.map((g) => (
            <div key={g.label} className="slide">
              <div className="date-label">{g.label}</div>
              <div className="card" style={{ padding: 6, marginBottom: 8 }}>
                <div className="list">
                  {g.items.map((r) => (
                    <a key={r.url + r.time} className="list-row" href={r.url}>
                      {r.favicon
                        ? <img className="fav" src={r.favicon} alt="" />
                        : <span className="fav-s"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg></span>}
                      <span className="list-col">
                        <span className="list-title">{r.title || r.url}</span>
                        <span className="list-sub">{safeHost(r.url)}</span>
                      </span>
                      <span className="list-meta">{new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}

        <div className="ip-foot">Kamui <b>Browser</b> · history is never sent anywhere</div>
      </div>
    </div>
  )
}

function groupByDay(rows: HistoryEntry[]): { label: string; items: HistoryEntry[] }[] {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startYesterday = startToday - 86400000
  const days: Record<string, HistoryEntry[]> = {}
  for (const r of rows) {
    let label: string
    if (r.time >= startToday) label = 'Today'
    else if (r.time >= startYesterday) label = 'Yesterday'
    else label = new Date(r.time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    ;(days[label] ||= []).push(r)
  }
  return Object.entries(days).map(([label, items]) => ({ label, items }))
}

function safeHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export function Empty({ icon, text }: { icon: 'clock' | 'star' | 'download'; text: string }) {
  const paths = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    star: <path d="m12 3 2.65 5.6 6.15.85-4.5 4.3 1.1 6.1L12 17l-5.4 2.85 1.1-6.1-4.5-4.3 6.15-.85Z" />,
    download: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" /></>,
  }
  return (
    <div className="empty card" style={{ padding: '46px 20px' }}>
      <div style={{ width: 42, height: 42, margin: '0 auto 10px', borderRadius: '50%', background: 'var(--surface-3)', display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 24 24" style={{ width: 19, height: 19, stroke: 'var(--muted)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>{paths[icon]}</svg>
      </div>
      {text}
    </div>
  )
}
