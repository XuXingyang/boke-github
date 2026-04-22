import Link from 'next/link'
import type { ArticleMeta, ArticleProgress } from '@/types'

interface ArticleCardProps {
  article: ArticleMeta
  progress?: ArticleProgress | null
}

const TAG_COLORS: Record<string, string> = {
  TypeScript: 'text-blue-accent bg-blue-accent/10',
  React: 'text-orange-accent bg-orange-accent/10',
  Rust: 'text-yellow-accent bg-yellow-accent/10',
  'Next.js': 'text-purple bg-purple/10',
}

export function ArticleCard({ article, progress }: ArticleCardProps) {
  const isCompleted = progress?.completed
  const progressPct = progress?.progress ?? 0

  return (
    <Link href={`/${article.slug}`}>
      <div className="bg-bg-secondary border border-border rounded-lg p-3.5 hover:border-border-purple-glow transition-all cursor-pointer group">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-purple transition-colors">
            {article.title}
          </h3>
          {isCompleted ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-accent/10 border border-green-accent/30 text-green-accent whitespace-nowrap ml-2">
              ✓ 已打卡
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary border border-border text-text-muted whitespace-nowrap ml-2">
              未打卡
            </span>
          )}
        </div>
        <div className="text-[11px] text-text-muted mb-2.5">
          {article.date} · {article.read_time} min ·{' '}
          {article.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={`font-mono ${TAG_COLORS[tag] ?? 'text-text-muted'}`}>
              {tag}{' '}
            </span>
          ))}
        </div>
        <div className="h-0.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full progress-bar rounded-full transition-all"
            style={{ width: `${progressPct}%`, opacity: isCompleted ? 1 : 0.4 }}
          />
        </div>
      </div>
    </Link>
  )
}
