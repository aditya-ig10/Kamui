declare global {
  interface Window {
    kamui?: import('@/lib/bridge').KamuiBridge
    kamuiPages?: import('@/lib/bridge').PagesBridge
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // injected by Electron with webviewTag: true
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        partition?: string
        allowpopups?: boolean
        preload?: string
        src?: string
      }
    }
  }
}

export {}
