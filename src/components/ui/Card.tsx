import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  style?: CSSProperties
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ style, children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`card-3d ${className ?? ''}`}
      style={{
        background: 'rgba(17,24,39,0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 20,
        padding: '20px 24px',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 6px rgba(0,0,0,0.3), ' +
          '0 12px 24px rgba(0,0,0,0.45), 0 32px 64px rgba(0,0,0,0.3)',
        transform: 'translateY(-2px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
