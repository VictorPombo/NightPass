export const C = {
  bg: '#030305',
  bg2: '#0b0d14',
  card: 'rgba(15, 20, 35, 0.6)',
  brd: 'rgba(255, 255, 255, 0.08)',
  acc: '#06b6d4', // Cyan Neon
  acd: '#0891b2',
  mag: '#ec4899', // Magenta Neon
  gold: '#facc15',
  grn: '#10b981',
  red: '#f87171',
  txt: '#f9fafb',
  mut: '#94a3b8',
  sub: '#64748b',
  inp: 'rgba(0, 0, 0, 0.3)',
} as const

export const RC: Record<string, string> = {
  super_admin: '#60a5fa',
  admin: '#3b82f6',
  door: '#10b981',
  finance: '#9ca3af',
  promoter: '#6366f1',
}

export const RL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  door: 'Porteiro',
  finance: 'Financeiro',
  promoter: 'Promoter',
}

export type Role = keyof typeof RL
export type ColorKey = keyof typeof C
