import { getAllArticles, getAllTags } from '@/lib/content'
import { getArticleProgress } from '@/lib/checkin'
import { ArticleCard } from '@/components/article/article-card'

export default async function HomePage() {
  const articles = await getAllArticles()
  const tags = await getAllTags()

  const progressList = await Promise.all(
    articles.map((a) => getArticleProgress(a.slug))
  )

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 px-6 py-5">
        <div className="flex justify-between items-center mb-4">
          <div className="text-[10px] text-text-muted uppercase tracking-widest">最新文章</div>
          <span className="text-[10px] text-text-muted">{articles.length} 篇</span>
        </div>
        {articles.length === 0 ? (
          <div className="text-center text-text-muted py-20">
            <p className="text-lg mb-2">还没有文章</p>
            <p className="text-sm">使用 Agent 搜索整理，或手动添加 Markdown 文件到 /content/</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {articles.map((article, i) => (
              <ArticleCard key={article.slug} article={article} progress={progressList[i]} />
            ))}
          </div>
        )}
      </div>

      <div className="w-52 border-l border-border-purple/20 px-4 py-5 bg-purple/[0.015]">
        <div className="text-[10px] text-text-muted uppercase tracking-widest mb-3">标签</div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded bg-bg-secondary border border-border text-text-muted hover:border-border-purple hover:text-purple transition-colors cursor-pointer"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6 text-[10px] text-text-muted uppercase tracking-widest mb-3">快捷操作</div>
        <div className="bg-bg-secondary border border-border-purple/20 rounded-lg p-2.5">
          <div className="text-[10px] text-purple mb-2">● Agent</div>
          <div className="flex flex-col gap-1">
            {['🔍 搜索网页', '📂 整理文章', '💡 今日推荐'].map((action) => (
              <a
                key={action}
                href="/agent"
                className="text-[10px] text-text-muted hover:text-text-secondary bg-bg-tertiary rounded px-2 py-1.5 cursor-pointer transition-colors"
              >
                {action}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
