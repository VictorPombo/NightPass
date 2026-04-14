import { C } from '../../constants/theme'
import type { ToastState } from '../../utils/toast'

interface ToastProps {
  toast: ToastState | null
}

export function Toast({ toast }: ToastProps) {
  if (!toast?.msg) return null

  const col =
    toast.type === 'error' ? C.red :
    toast.type === 'warn'  ? C.gold : C.grn

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24,
        background: `linear-gradient(135deg,${col}22,${col}11)`,
        border: `1px solid ${col}44`,
        borderRadius: 12,
        padding: '12px 18px',
        color: col,
        fontSize: 13, fontWeight: 700,
        maxWidth: 320,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${col}22`,
        animation: 'fadeIn .25s ease',
        zIndex: 1100,
      }}
    >
      {toast.msg}
    </div>
  )
}
