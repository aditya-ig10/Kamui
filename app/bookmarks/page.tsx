'use client'

import React from 'react'
import { useGuestPage } from '@/lib/internal'
import { Empty } from '../history/page'

type Bookmark = { id: string; url: string; title?: string; favicon?: string }

export default function BookmarksPage() {
  const ready = useGuestPage('bookmarks')
  const [rows, setRows] = React.useState<Bookmark[]>([])

  React.useEffect(() => {
    if (!ready) return
    const load = async () => setRows((await window.kamuiPages!.getData('bookmarks')) || [])
    load()
    return window.kamuiPages!.onDataChanged(({ key }) => { if (key === 'bookmarks') load() })
  }, [ready])

  async function remove(id: string) {
    const list: Bookmark[] = (await window.kamuiPages!.getData('bookmarks')) || []
    await window.kamuiPages!.setData('bookmarks', list.filter((b) => b.id !== id))
  }

  return (
    <div className="ipage">
      <div className="ipage-body">
        <h1>Bookmarks</h1>
        <p className="ip-sub">{rows.length ? `${rows.length} saved — also shown in the bookmarks bar` : 'Star pages from the toolbar to pin them here.'}</p>

        {rows.length === 0 ? (
          <Empty icon="star" text="Your starred pages will live here" />
        ) : (
          <div className="card slide" style={{ padding: 6 }}>
            <div className="list">
              {rows.map((b) => (
                <a key={b.id} className="list-row" href={b.url} title={b.url}>
                  {b.favicon
                    ? <img className="fav" src={b.favicon} alt="" />
                    : <span className="fav-s"><svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4Z" /></svg></span>}
                  <span className="list-col">
                    <span className="list-title">{b.title || b.url}</span>
                    <span className="list-sub">{safeHost(b.url)}</span>
                  </span>
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ minHeight: 30 } as React.CSSProperties}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(b.id) }}
                  >
                    Remove
                  </button>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="ip-foot">Kamui <b>Browser</b> · bookmarks are yours, not ours</div>
      </div>
    </div>
  )
}

function safeHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
