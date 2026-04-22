import Link from 'next/link'

const links = [
  { href: '/', label: '文章' },
  { href: '/agent', label: 'Agent' },
  { href: '/checkin', label: '打卡' },
  { href: '/import', label: '导入' },
]

export function Nav() {
  return (
    <nav className="bg-bg-primary border-b border-border-purple px-6 py-3 flex justify-between items-center sticky top-0 z-50">
      <Link href="/" className="font-bold text-sm gradient-text">
        ⚡ Dev·Notes
      </Link>
      <div className="flex gap-5 text-xs text-text-muted">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-purple transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
