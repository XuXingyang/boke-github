import { kv } from '@vercel/kv'
import { generateText } from 'ai'
import { getModel } from '@/lib/models'
import type { ArticleMeta, ModelId } from '@/types'

interface MemoryIndex {
  slug: string
  title: string
  keywords: string[]
  summary: string
}

export type MemoryHit = { found: true; slug: string; title: string }

async function getIndex(): Promise<MemoryIndex[]> {
  return (await kv.get<MemoryIndex[]>('memory:index')) ?? []
}

export async function updateMemory(article: ArticleMeta): Promise<void> {
  const index = await getIndex()
  const existingIdx = index.findIndex((i) => i.slug === article.slug)
  const entry: MemoryIndex = {
    slug: article.slug,
    title: article.title,
    keywords: article.keywords,
    summary: article.summary,
  }
  if (existingIdx >= 0) {
    index[existingIdx] = entry
  } else {
    index.push(entry)
  }
  await kv.set('memory:index', index)
}

export async function rebuildIndex(articles: ArticleMeta[]): Promise<void> {
  const index: MemoryIndex[] = articles.map((a) => ({
    slug: a.slug,
    title: a.title,
    keywords: a.keywords,
    summary: a.summary,
  }))
  await kv.set('memory:index', index)
}

export async function checkMemory(
  query: string,
  modelId: ModelId = 'qwen-max'
): Promise<MemoryHit | null> {
  const index = await getIndex()
  if (index.length === 0) return null

  const lowerQuery = query.toLowerCase()
  for (const item of index) {
    const keywordMatch = item.keywords.some(
      (k) => lowerQuery.includes(k.toLowerCase())
    )
    const titleMatch = item.title.toLowerCase().includes(lowerQuery)
    if (keywordMatch || titleMatch) {
      return { found: true, slug: item.slug, title: item.title }
    }
  }

  // Semantic similarity via AI
  const summaries = index
    .map((item, i) => `[${i}] ${item.title}: ${item.summary}`)
    .join('\n')
  const { text } = await generateText({
    model: getModel(modelId),
    prompt: `判断以下查询与哪篇文章最相关（相似度 0-1）。只返回最相关文章的序号和相似度，格式：序号,相似度。如果没有相关文章，返回 -1,0。\n\n查询：${query}\n\n文章列表：\n${summaries}`,
  })

  const parts = text.trim().split(',')
  if (parts.length < 2) return null
  const idx = parseInt(parts[0], 10)
  const score = parseFloat(parts[1])

  if (idx >= 0 && score > 0.85 && index[idx]) {
    return { found: true, slug: index[idx].slug, title: index[idx].title }
  }

  return null
}
