import type { ReactNode, CSSProperties } from 'react'
import { C } from '../../constants/theme'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface BtnProps {
  onClick?: () => void
  variant?: BtnVariant
  disabled?: boolean
  small?: boolean
  icon?: string
  style?: CSSProperties
  children?: ReactNode
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
}

export function Btn({
  onClick,
  variant,
  disabled,
  small,
  icon,
  style,
  children,
  type = 'button',
  'aria-label': ariaLabel,
}: BtnProps) {
  const isPri = !variant || variant === 'primary'
  const bg =
    variant === 'danger' ? 'linear-gradient(135deg,#be123c,#e11d48)' :
    variant === 'ghost'  ? 'transparent' :
    variant === 'secondary' ? C.card :
    `linear-gradient(135deg, ${C.mag}, ${C.acc})`;

  const col = variant === 'ghost' ? C.mut : C.txt
  const bd =
    variant === 'danger'    ? '#7f1d1d55' :
    variant === 'secondary' ? C.brd :
    variant === 'ghost'     ? 'transparent' : 'transparent'

  const sh = isPri && !disabled
    ? `0 4px 20px rgba(236,72,153,0.35), 0 0 30px rgba(6,182,212,0.2)`
    : 'none'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        background: bg,
        color: col,
        border: `1px solid ${bd}`,
        borderRadius: 10,
        padding: small ? '6px 14px' : '10px 20px',
        fontSize: small ? 12 : 13,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: sh,
        minHeight: small ? 34 : 40,
        transition: 'transform .15s, box-shadow .15s',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap' as const,
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: small ? 13 : 15 }}>{icon}</span>}
      {children}
    </button>
  )
}
