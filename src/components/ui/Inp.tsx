import type { CSSProperties } from 'react'
import { C } from '../../constants/theme'
import { cn, fcpf, ftel } from '../../utils/format'

type InputMask = 'cpf' | 'phone' | 'currency' | 'date'

interface InpProps {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mask?: InputMask
  type?: string
  required?: boolean
  disabled?: boolean
  style?: CSSProperties
  rows?: number
}


export function Inp({ label, value, onChange, placeholder, mask, type = 'text', required, disabled, style, rows }: InpProps) {
  function handleChange(ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    let v = ev.target.value
    if (mask === 'cpf') v = cn(v).slice(0, 11)
    if (mask === 'phone') v = cn(v).slice(0, 11)
    onChange(v)
  }

  const displayValue =
    mask === 'cpf'   ? fcpf(value) :
    mask === 'phone' ? ftel(value) : value

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 12, color: C.mut, fontWeight: 600 }}>
          {label}{required && <span style={{ color: C.red }}> *</span>}
        </label>
      )}
      {rows ? (
        <textarea
          className="inp-glass"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          style={{ resize: 'vertical', minHeight: rows * 24, ...style }}
        />
      ) : (
        <input
          className="inp-glass"
          type={type}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={style}
        />
      )}
    </div>
  )
}

interface SelProps {
  label?: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  style?: CSSProperties
}

export function Sel({ label, value, onChange, options, style }: SelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 12, color: C.mut, fontWeight: 600 }}>{label}</label>}
      <select
        className="inp-glass"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={style}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
