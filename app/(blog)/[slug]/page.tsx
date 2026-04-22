import { notFound } from 'next/navigation'
import { serialize } from 'next-mdx-remote/serialize'
import { getArticle, getArticleSlugs } from '@/lib/content'
import { getArticleProgress } from '@/lib/checkin'
import { ArticleReader } from '@/components/article/article-reader'
import { CheckinButton } from '@/components/article/checkin-button'
import { ReadingTimer } from '@/components/article/reading-timer'

export async function generateStaticParams() {
  const slugs = await getArticleSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  const [mdxSource, progress] = await Promise.all([
    serialize(article.content),
    getArticleProgress(slug),
  ])

  const isCompleted = progress?.completed ?? false

  return (
    <div className="flex min-h-screen">
      <ReadingTimer slug={slug} />

      <div className="flex-1 px-8 py-6 max-w-3xl">
        <div className="flex gap-1.5 mb-3">
          {article.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-blue-accent/10 text-blue-accent border border-blue-accent/20">
              {tag}
            </span>
          ))}
          <span className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border">
            {article.read_time} min
          </span>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">{article.title}</h1>
        <div className="text-xs text-text-muted mb-8">
          {article.date} · {article.source === 'agent_search' ? 'Agent 生成' : article.source === 'import' ? '导入' : '手写'}
        </div>

        <ArticleReader source={mdxSource} />

        <div className="mt-10 flex items-center gap-4 border-t border-border pt-6">
          <CheckinButton slug={slug} isCompleted={isCompleted} />
        </div>
      </div>

      <div className="w-44 border-l border-border-purple/20 px-4 py-6 hidden lg:block">
        <div className="text-[10px] text-text-muted uppercase tracking-widest mb-3">目录</div>
        <div className="text-[10px] text-text-muted">自动从标题生成</div>
      </div>
    </div>
  )
}
