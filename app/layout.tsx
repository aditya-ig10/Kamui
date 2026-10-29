import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import '@/styles/globals.css'

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })

export const metadata: Metadata = {
  title: 'Kamui Browser',
  description: 'A Chromium-based browser with a Next.js UI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={figtree.variable}>{children}</body>
    </html>
  )
}
