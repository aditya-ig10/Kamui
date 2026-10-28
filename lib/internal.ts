'use client'

import { useEffect, useState } from 'react'
import { applyTheme, pageBridge, readSettings, useSettingsWatch } from '@/lib/bridge'

// Bootstrap for guest pages rendered inside webviews
export function useGuestPage(name: string) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    pageBridge?.hello(name)
    readSettings().then(applyTheme).finally(() => setReady(true))
  }, [name])
  useSettingsWatch()
  return ready
}
