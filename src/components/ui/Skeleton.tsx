import { Card } from './Card'

interface SkeletonProps {
  h?: number
  w?: string | number
  r?: number
  mb?: number
}

export function Skeleton({ h = 16, w = '100%', r = 8, mb = 0 }: SkeletonProps) {
  return (
    <div
      className="skel"
      style={{ height: h, width: w, borderRadius: r, marginBottom: mb }}
    />
  )
}

export function SkeletonCard() {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <Skeleton h={12} w="40%" mb={12} />
      <Skeleton h={32} w="60%" mb={8} />
      <Skeleton h={10} w="30%" />
    </Card>
  )
}
