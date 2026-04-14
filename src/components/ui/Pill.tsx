import { C } from '../../constants/theme'

interface PillProps {
  color?: string
  small?: boolean
  children: React.ReactNode
}

export function Pill({ color = C.acc, small = false, children }: PillProps) {
  return (
    <span
      style={{
        background: color + '22',
        color,
        border: `1px solid ${color}44`,
        borderRadius: 99,
        padding: small ? '2px 8px' : '3px 10px',
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </span>
  )
}
