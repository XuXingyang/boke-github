import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { generateText } from 'ai'
import { getAllArticles, getArticle } from '@/lib/content'
import { getModel } from '@/lib/models'
import type { ArticleMeta, ModelId } from '@/types'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export async function listArticles(filter?: { tag?: string; source?: string }): Promise<ArticleMeta[]> {
  const articles = await getAllArticles()
  if (!filter) return articles
  return articles.filter((a) => {
    if (filter.tag && !a.tags.includes(filter.tag)) return false
    if (filter.source && a.source !== filter.source) return false
    return true
  })
}

export async function readArticle(slug: string): Promise<string | null> {
  const article = await getArticle(slug)
  return article?.content ?? null
}

export async function searchContent(query: string): Promise<ArticleMeta[]> {
  const articles = await getAllArticles()
  const lower = query.toLowerCase()
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.summary.toLowerCase().includes(lower) ||
      a.tags.some((t) => t.toLowerCase().includes(lower)) ||
      a.keywords.some((k) => k.toLowerCase().includes(lower))
  )
}

export async function generateSummary(slug: string, modelId: ModelId = 'qwen-max'): Promise<string> {
  const content = await readArticle(slug)
  if (!content) return ''
  const { text } = await generateText({
    model: getModel(modelId),
    prompt: `用一句话（不超过50字）总结以下文章的核心内容：\n\n${content.slice(0, 2000)}`,
  })
  return text.trim()
}

export async function updateFrontmatter(slug: string, data: Partial<ArticleMeta>): Promise<void> {
  const files = getAllMdFiles(CONTENT_DIR)
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf-8')
    const parsed = matter(raw)
    if (parsed.data.slug === slug) {
      const updated = matter.stringify(parsed.content, { ...parsed.data, ...data })
      fs.writeFileSync(file, updated, 'utf-8')
      return
    }
  }
}

function getAllMdFiles(dir: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('_')) {
      files.push(...getAllMdFiles(fullPath))
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      files.push(fullPath)
    }
  }
  return files
}
