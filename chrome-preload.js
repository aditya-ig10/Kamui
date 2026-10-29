const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('kamui', {
  // Data
  getData: (key) => ipcRenderer.invoke('data:get', key),
  setData: (key, value) => ipcRenderer.invoke('data:set', key, value),

  // Paths
  getPaths: () => ipcRenderer.invoke('app:paths'),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  editCmd: (cmd) => ipcRenderer.invoke('guest:edit', cmd),

  // Window controls (frameless)
  minimize: () => ipcRenderer.invoke('win:minimize'),
  maximize: () => ipcRenderer.invoke('win:maximize'),
  close: () => ipcRenderer.invoke('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
  isFullscreen: () => ipcRenderer.invoke('win:is-fullscreen'),

  // Private window + dock icon
  newIncognitoWindow: () => ipcRenderer.invoke('app:new-incognito-window'),
  setDockIcon: (hex) => ipcRenderer.invoke('dock:icon', hex),

  // Dock DevTools into the shell's right-hand pane
  dtAttach: (tabWcId, dtWcId, attach) => ipcRenderer.invoke('dt:attach', { tabWcId, dtWcId, attach }),

  // current title/url of a guest tab (shell resyncs tab names after navigations)
  tabMeta: (tabWcId) => ipcRenderer.invoke('tab:meta', tabWcId),

  // Page actions on a guest tab (print / save as)
  pagePrint: (tabWcId) => ipcRenderer.invoke('page:print', tabWcId),
  pageSave: (tabWcId) => ipcRenderer.invoke('page:save', tabWcId),

  // Events from main (accelerators, data changes, downloads, maximized)
  on: (channel, cb) => {
    const ALLOWED = [
      'accel:new-tab', 'accel:new-tab-with-url', 'accel:new-tab-background', 'accel:close-tab',
      'accel:reopen-tab', 'accel:reload', 'accel:stop', 'accel:find',
      'accel:devtools', 'accel:zoom-in', 'accel:zoom-out', 'accel:zoom-reset',
      'accel:fullscreen', 'accel:next-tab', 'accel:prev-tab',
      'accel:toggle-bookmark', 'accel:focus-omnibox', 'accel:split-toggle',
      'accel:split-go', 'accel:show-settings', 'accel:show-history',
      'accel:show-bookmarks', 'accel:show-downloads', 'accel:clear-history',
      'data:changed', 'win:maximized', 'win:focused', 'win:fullscreen',
      'download:started', 'download:progress', 'download:done',
      'perf:battery', 'chrome:scrolled', 'accel:new-incognito-tab',
      'accel:page-print', 'accel:page-save',
      'guest:navigated', 'guest:title', 'guest:favicon',
    ]
    if (!ALLOWED.includes(channel)) return
    const listener = (_e, ...args) => cb(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
})
