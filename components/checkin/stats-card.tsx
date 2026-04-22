interface StatsCardProps {
  value: string | number
  label: string
  sub?: string
  color: string
}

export function StatsCard({ value, label, sub, color }: StatsCardProps) {
  return (
    <div className="flex-1 bg-bg-secondary border border-border rounded-xl p-4 text-center">
      <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-text-muted mt-1">{label}</div>
      {sub && <div className="text-[9px] text-text-muted mt-1">{sub}</div>}
    </div>
  )
}
