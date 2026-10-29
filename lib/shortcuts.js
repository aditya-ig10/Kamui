// Shared keyboard-shortcut registry.
// `def` uses the portable format `Mod+Shift+S` where Mod = Cmd on macOS, Ctrl elsewhere.
// Users can remap any of these in Settings → Keyboard; overrides live in
// settings.json as `shortcuts: { [id]: 'Mod+X' }`.

const SHORTCUT_GROUPS = ['Tabs', 'Navigation', 'Zoom', 'Pages', 'Split view', 'Window']

const SHORTCUTS = [
  { id: 'new-tab', label: 'New Tab', group: 'Tabs', def: 'Mod+T' },
  { id: 'new-incognito-tab', label: 'New Private Window', group: 'Tabs', def: 'Mod+Shift+N' },
  { id: 'close-tab', label: 'Close Tab', group: 'Tabs', def: 'Mod+W' },
  { id: 'reopen-tab', label: 'Reopen Closed Tab', group: 'Tabs', def: 'Mod+Shift+T' },
  { id: 'next-tab', label: 'Next Tab', group: 'Tabs', def: 'Ctrl+Tab' },
  { id: 'prev-tab', label: 'Previous Tab', group: 'Tabs', def: 'Ctrl+Shift+Tab' },
  { id: 'reload', label: 'Reload Page', group: 'Navigation', def: 'Mod+R' },
  { id: 'stop', label: 'Stop Loading', group: 'Navigation', def: 'Mod+S' },
  { id: 'focus-omnibox', label: 'Focus Address Bar', group: 'Navigation', def: 'Mod+L' },
  { id: 'find', label: 'Find in Page', group: 'Navigation', def: 'Mod+F' },
  { id: 'toggle-bookmark', label: 'Bookmark This Page', group: 'Navigation', def: 'Mod+D' },
  { id: 'page-print', label: 'Print Page…', group: 'Navigation', def: 'Mod+P' },
  { id: 'page-save', label: 'Save Page As…', group: 'Navigation', def: null },
  { id: 'zoom-in', label: 'Zoom In', group: 'Zoom', def: 'Mod+=' },
  { id: 'zoom-out', label: 'Zoom Out', group: 'Zoom', def: 'Mod+-' },
  { id: 'zoom-reset', label: 'Actual Size', group: 'Zoom', def: 'Mod+0' },
  { id: 'show-settings', label: 'Open Settings', group: 'Pages', def: 'Mod+,' },
  { id: 'show-history', label: 'Open History', group: 'Pages', def: 'Mod+Y' },
  { id: 'show-bookmarks', label: 'Open Bookmarks', group: 'Pages', def: 'Mod+Alt+B' },
  { id: 'show-downloads', label: 'Open Downloads', group: 'Pages', def: 'Mod+Alt+D' },
  { id: 'split-toggle', label: 'Toggle Split View', group: 'Split view', def: 'Mod+Shift+S' },
  { id: 'split-go', label: 'Navigate in Split Pane', group: 'Split view', def: 'Mod+Alt+O' },
  { id: 'fullscreen', label: 'Toggle Full Screen', group: 'Window', def: 'F11' },
]

const DEFAULT_SHORTCUT_MAP = {}
for (const s of SHORTCUTS) DEFAULT_SHORTCUT_MAP[s.id] = s.def

function comboToAccelerator(combo) {
  // Electron Menu accelerator syntax
  return String(combo || '').replace(/\bMod\b/g, 'CmdOrCtrl')
}

function isMac() {
  if (typeof process !== 'undefined' && process.platform) return process.platform === 'darwin'
  if (typeof navigator !== 'undefined') return /Mac|iPhone|iPad/.test(navigator.platform || '')
  return false
}

function comboToLabel(combo) {
  const mac = isMac()
  const parts = String(combo || '').split('+')
  return parts
    .map((p) => {
      if (p === 'Mod') return mac ? '⌘' : 'Ctrl'
      if (p === 'Shift') return mac ? '⇧' : 'Shift'
      if (p === 'Alt') return mac ? '⌥' : 'Alt'
      if (p === ' ') return 'Space'
      let k = p
      if (k.startsWith('Arrow')) k = k.slice(5)
      if (k.length === 1) k = k.toUpperCase()
      return k
    })
    .join(mac ? '' : '+')
}

// Portable combo from a keyboard event (used by the Settings capture UI)
function comboFromEvent(e) {
  const mac = isMac()
  const parts = []
  if (mac ? e.metaKey : e.ctrlKey) parts.push('Mod')
  else if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  let key = e.key
  if (!key || ['Control', 'Meta', 'Shift', 'Alt', 'CapsLock', 'Dead'].includes(key)) return null
  if (key === ' ') key = 'Space'
  if (key.length === 1) key = key.toUpperCase()
  parts.push(key)
  return parts.join('+')
}

module.exports = { SHORTCUTS, SHORTCUT_GROUPS, DEFAULT_SHORTCUT_MAP, comboToAccelerator, comboToLabel, comboFromEvent }
