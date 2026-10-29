'use client'

import React from 'react'
import { useGuestPage } from '@/lib/internal'
import { Empty } from '../history/page'

type DlEntry = { url: string; file: string; name: string; size: number; received: number; done: boolean; interrupted?: boolean; time: number }

export default function DownloadsPage() {
  const ready = useGuestPage('downloads')
  const [rows, setRows] = React.useState<DlEntry[]>([])

  React.useEffect(() => {
    if (!ready) return
    const load = async () => setRows((await window.kamuiPages!.getData('downloads')) || [])
    load()
    return window.kamuiPages!.onDataChanged(({ key }) => { if (key === 'downloads') load() })
  }, [ready])

  return (
    <div className="ipage">
      <div className="ipage-body">
        <h1>Downloads</h1>
        <p className="ip-sub">{rows.length ? `${rows.length} downloads on record` : 'Files you download from the web appear here.'}</p>

        {rows.length === 0 ? (
          <Empty icon="download" text="Completed downloads will be listed here" />
        ) : (
          <div className="card slide" style={{ padding: 6 }}>
            <div className="list">
              {rows.map((d) => (
                <div key={d.url + d.time} className="list-row" title={d.file || d.url}>
                  <span className="fav-s">
                    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, color: d.done === false ? 'var(--brand)' : d.interrupted ? 'var(--danger)' : 'var(--muted)' }}>
                      <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" />
                    </svg>
                  </span>
                  <span className="list-col">
                    <span className="list-title">{d.name || d.file}</span>
                    <span className="list-sub">{d.file || d.url}</span>
                  </span>
                  <span className="list-meta">{d.done === false ? 'In progress…' : d.interrupted ? 'Interrupted' : shortTime(d.time)}{d.size ? ` · ${fmtSize(d.size)}` : ''}</span>
                  {d.file && (
                    <button
                      className="btn btn-sm"
                      style={{ minHeight: 30 } as React.CSSProperties}
                      onClick={async (e) => { e.stopPropagation(); await window.kamuiPages!.showInFolder(d.file) }}
                    >
                      Show in Folder
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="ip-foot">Kamui <b>Browser</b> files land in your system Downloads folder</div>
      </div>
    </div>
  )
}

function fmtSize(n?: number): string {
  if (!n) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

function shortTime(t: number): string {
  const d = new Date(t)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
