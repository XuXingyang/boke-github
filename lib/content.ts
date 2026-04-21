import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { ArticleMeta, ArticleWithContent } from '@/types'

const CONTENT_DIR = path.join(process.cwd(), 'content')

function getAllMdFiles(dir: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('_')) {
        files.push(...getAllMdFiles(fullPath))
      }
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      files.push(fullPath)
    }
  }
  return files
}

export async function getAllArticles(): Promise<ArticleMeta[]> {
  const files = getAllMdFiles(CONTENT_DIR)
  const articles: ArticleMeta[] = []

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf-8')
    const { data } = matter(raw)
    if (!data.slug || !data.title) continue
    articles.push({
      title: data.title,
      slug: data.slug,
      date: data.date ? String(data.date).slice(0, 10) : '',
      tags: data.tags ?? [],
      keywords: data.keywords ?? [],
      summary: data.summary ?? '',
      source: data.source ?? 'manual',
      read_time: data.read_time ?? 5,
    })
  }

  return articles.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getArticle(slug: string): Promise<ArticleWithContent | null> {
  const files = getAllMdFiles(CONTENT_DIR)
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf-8')
    const { data, content } = matter(raw)
    if (data.slug === slug) {
      return {
        title: data.title,
        slug: data.slug,
        date: data.date ? String(data.date).slice(0, 10) : '',
        tags: data.tags ?? [],
        keywords: data.keywords ?? [],
        summary: data.summary ?? '',
        source: data.source ?? 'manual',
        read_time: data.read_time ?? 5,
        content,
      }
    }
  }
  return null
}

export async function getArticleSlugs(): Promise<string[]> {
  const articles = await getAllArticles()
  return articles.map((a) => a.slug)
}

export async function getArticlesByTag(tag: string): Promise<ArticleMeta[]> {
  const articles = await getAllArticles()
  return articles.filter((a) => a.tags.includes(tag))
}

export async function getAllTags(): Promise<string[]> {
  const articles = await getAllArticles()
  const tags = new Set(articles.flatMap((a) => a.tags))
  return Array.from(tags).sort()
}
