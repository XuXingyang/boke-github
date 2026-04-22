import { Nav } from '@/components/layout/nav'
import { StatsBar } from '@/components/layout/stats-bar'
import { getAllArticles } from '@/lib/content'

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const articles = await getAllArticles()
  return (
    <div className="min-h-screen bg-bg-primary">
      <Nav />
      <StatsBar totalArticles={articles.length} />
      <main>{children}</main>
    </div>
  )
}
