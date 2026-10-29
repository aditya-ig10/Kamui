// In-app menu bar (top navbar) definition.
// `action` ids map to Shell.runAction; `shortcut` refers to a shortcut id for
// the hint column (resolved live from the user's customizations).

export type StripItem = {
  type?: 'sep'
  label?: string
  action?: string
  shortcut?: string
  hint?: string
}

export const MENU_TITLES: { title: string; items: StripItem[] }[] = [
  {
    title: 'File',
    items: [
      { label: 'New Tab', action: 'new-tab', shortcut: 'new-tab' },
      { label: 'New Private Window', action: 'new-incognito-tab', shortcut: 'new-incognito-tab' },
      { label: 'Reopen Closed Tab', action: 'reopen-tab', shortcut: 'reopen-tab' },
      { type: 'sep' },
      { label: 'Focus Address Bar', action: 'focus-omnibox', shortcut: 'focus-omnibox' },
      { type: 'sep' },
      { label: 'Downloads', action: 'show-downloads', shortcut: 'show-downloads' },
      { label: 'Close Tab', action: 'close-tab', shortcut: 'close-tab' },
    ],
  },
  {
    title: 'Edit',
    items: [
      { label: 'Undo', action: 'edit:undo', hint: 'Mod+Z' },
      { label: 'Redo', action: 'edit:redo', hint: 'Mod+Shift+Z' },
      { type: 'sep' },
      { label: 'Cut', action: 'edit:cut', hint: 'Mod+X' },
      { label: 'Copy', action: 'edit:copy', hint: 'Mod+C' },
      { label: 'Paste', action: 'edit:paste', hint: 'Mod+V' },
      { type: 'sep' },
      { label: 'Select All', action: 'edit:selectAll', hint: 'Mod+A' },
    ],
  },
  {
    title: 'View',
    items: [
      { label: 'Reload Page', action: 'reload', shortcut: 'reload' },
      { label: 'Stop Loading', action: 'stop', shortcut: 'stop' },
      { type: 'sep' },
      { label: 'Zoom In', action: 'zoom-in', shortcut: 'zoom-in' },
      { label: 'Zoom Out', action: 'zoom-out', shortcut: 'zoom-out' },
      { label: 'Actual Size', action: 'zoom-reset', shortcut: 'zoom-reset' },
      { type: 'sep' },
      { label: 'Toggle Split View', action: 'split-toggle', shortcut: 'split-toggle' },
      { type: 'sep' },
      { label: 'Developer Tools', action: 'devtools' },
      { type: 'sep' },
      { label: 'Full Screen', action: 'fullscreen', shortcut: 'fullscreen' },
    ],
  },
  {
    title: 'History',
    items: [
      { label: 'Show History', action: 'show-history', shortcut: 'show-history' },
      { type: 'sep' },
      { label: 'Clear History…', action: 'clear-history' },
    ],
  },
  {
    title: 'Bookmarks',
    items: [
      { label: 'Bookmark This Page', action: 'toggle-bookmark', shortcut: 'toggle-bookmark' },
      { label: 'Show Bookmarks', action: 'show-bookmarks', shortcut: 'show-bookmarks' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'Settings & Keyboard', action: 'show-settings', shortcut: 'show-settings' },
    ],
  },
]
