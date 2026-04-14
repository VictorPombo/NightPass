import { C } from '../../constants/theme'

interface FABProps {
  onClick: () => void
  icon?: string
  title?: string
  bottom?: number
  size?: number
}

export function FAB({ onClick, icon = '+', title = 'Ação', bottom = 88, size = 22 }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      style={{
        position: 'fixed', bottom, right: 24,
        width: 56, height: 56, borderRadius: 28,
        background: `linear-gradient(135deg,${C.acd},${C.acc})`,
        color: '#fff', border: 'none',
        fontSize: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 200,
        boxShadow: '0 6px 24px rgba(59,130,246,0.4), 0 0 60px rgba(59,130,246,0.12)',
        transition: 'transform .2s, box-shadow .2s, filter .2s',
        animation: 'float 3s ease-in-out infinite',
      }}
    >
      {icon}
    </button>
  )
}
