// Guest preload. SECURITY: this script runs on every page loaded in a
// webview with this preload, so the data bridge must only be exposed
// on Kamui's own internal pages (the Next.js UI server).
(() => {
  const INTERNAL_HOSTS = ['127.0.0.1', 'localhost']
  const INTERNAL_PORT = '3451'
  const isInternal = () =>
    INTERNAL_HOSTS.includes(location.hostname) && (location.port === INTERNAL_PORT || location.protocol === 'http:')

  if (!isInternal()) return // do not expose anything to third-party sites

  const { contextBridge, ipcRenderer } = require('electron')

  contextBridge.exposeInMainWorld('kamuiPages', {
    getData: (key) => ipcRenderer.invoke('data:get', key),
    setData: (key, value) => ipcRenderer.invoke('data:set', key, value),
    getPaths: () => ipcRenderer.invoke('app:paths'),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
    showInFolder: (file) => ipcRenderer.invoke('app:show-in-folder', file),
    // ask the shell to run one of its actions (e.g. open a private window)
    shellAction: (id) => ipcRenderer.invoke('shell:action', id),
    restart: () => ipcRenderer.invoke('app:restart'),
    getGPU: () => ipcRenderer.invoke('perf:gpu'),
    hello: (name) => ipcRenderer.send('guest:hello', name),
    onDataChanged: (cb) => {
      const listener = (_e, payload) => cb(payload)
      ipcRenderer.on('guest:data-changed', listener)
      return () => ipcRenderer.removeListener('guest:data-changed', listener)
    },
  })
})()
