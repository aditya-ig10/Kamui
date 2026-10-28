'use client'

import { LOGO_PATHS, LOGO_VIEWBOX } from '@/lib/logodata'

/**
 * The layered Kamui brand mark, rendered inline so every layer can follow the
 * accent palette. Layer classes map to fills in styles/globals.css:
 *   .brand-l0 → var(--brand)         main shape
 *   .brand-l1 → var(--brand-press)   depth
 *   .brand-l2 → var(--brand-soft-2)  highlight
 */
export default function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      {LOGO_PATHS.map((d, i) => (
        <path key={i} className={`brand-l${i}`} d={d} />
      ))}
    </svg>
  )
}
