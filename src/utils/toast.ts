export type ToastType = 'success' | 'error' | 'warn'
export interface ToastState { msg: string; type: ToastType }

/** Show a toast and auto-clear after 3s */
export function sT(
  set: React.Dispatch<React.SetStateAction<ToastState | null>>,
  msg: string,
  type: ToastType = 'success'
) {
  set({ msg, type })
  setTimeout(() => set(null), 3000)
}

/** Show a quick error overlay (fallback, no React context needed) */
export function _err(msg: string) {
  const el = document.createElement('div')
  el.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#f87171;color:#fff;' +
    'padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.5);' +
    'max-width:90vw;text-align:center;animation:fadeIn .2s'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

/** Show a quick success overlay */
export function _succ(msg: string) {
  const el = document.createElement('div')
  el.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;' +
    'padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.5);' +
    'max-width:90vw;text-align:center;animation:fadeIn .2s'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}

// React import needed for the type above
import type React from 'react'
