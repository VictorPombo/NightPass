/** Format date string to pt-BR */
export function fd(d?: string | null): string {
  if (!d) return '—'
  const dateStr = d.includes('T') ? d : d + 'T12:00:00'
  const dateObj = new Date(dateStr)
  if (isNaN(dateObj.getTime())) return 'Data Inválida'
  return dateObj.toLocaleDateString('pt-BR')
}

/** Format CPF: 000.000.000-00 */
export function fcpf(v?: string | null): string {
  return (v || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/** Format phone: (00) 00000-0000 */
export function ftel(v?: string | null): string {
  return (v || '').replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

/** Clean to digits only */
export function cn(v?: string | null): string {
  return (v || '').replace(/\D/g, '')
}

/** Format currency cents to R$ */
export function fmtCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Format date to relative label */
export function relativeDate(dateStr: string): string {
  const today = new Date()
  const str = dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00'
  const d = new Date(str)
  if (isNaN(d.getTime())) return 'Data Inválida'
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoje!'
  if (diff === 1) return 'Amanhã!'
  if (diff === -1) return 'Ontem'
  if (diff > 0) return `Em ${diff} dias`
  return `Há ${Math.abs(diff)} dias`
}

export type LoyalTier = { icon: string; label: string; color: string }

/** Loyalty tier based on checkin count */
export function loyalTier(n: number): LoyalTier {
  if (n >= 50) return { icon: '', label: 'VIP', color: '#c084fc' }
  if (n >= 20) return { icon: '', label: 'Ouro', color: '#60a5fa' }
  if (n >= 8)  return { icon: '', label: 'Prata', color: '#9ca3af' }
  if (n >= 3)  return { icon: '', label: 'Bronze', color: '#b45309' }
  return { icon: '', label: 'Novo', color: '#6b7280' }
}

/** Validate CPF using modulo-11 algorithm */
export function validCPF(raw?: string | null): boolean {
  const cpf = (raw || '').replace(/\D/g, '')
  if (cpf.length !== 11) return false
  // Reject known invalid sequences (all same digit)
  if (/^(\d)\1{10}$/.test(cpf)) return false
  // Validate check digits
  for (let t = 9; t < 11; t++) {
    let sum = 0
    for (let i = 0; i < t; i++) sum += parseInt(cpf[i]) * (t + 1 - i)
    const rem = (sum * 10) % 11
    if ((rem === 10 ? 0 : rem) !== parseInt(cpf[t])) return false
  }
  return true
}

/** Validate Brazilian phone (DDD + 9 digits for mobile, DDD + 8 for landline) */
export function validPhone(raw?: string | null): boolean {
  const ph = (raw || '').replace(/\D/g, '')
  // Accept 10 digits (landline) or 11 digits (mobile with 9)
  if (ph.length < 10 || ph.length > 11) return false
  const ddd = parseInt(ph.slice(0, 2))
  if (ddd < 11 || ddd > 99) return false
  // Mobile must start with 9
  if (ph.length === 11 && ph[2] !== '9') return false
  return true
}

/** Validate email format */
export function validEmail(v?: string | null): boolean {
  if (!v || !v.trim()) return true // empty is ok (optional field)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export const PAY_COLORS: Record<string, string> = {
  pix: '#10b981', cartao: '#3b82f6', credito: '#3b82f6',
  debito: '#60a5fa', dinheiro: '#f59e0b', cortesia: '#9ca3af',
}

export const PAY_LABELS: Record<string, string> = {
  pix: 'PIX', cartao: 'Cartão', credito: 'Crédito',
  debito: 'Débito', dinheiro: 'Dinheiro', cortesia: 'Cortesia',
}

export function payColor(k: string): string { return PAY_COLORS[k] || '#6b7280' }
export function payLabel(k: string): string { return PAY_LABELS[k] || k }
