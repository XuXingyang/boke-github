import { tavily } from '@tavily/core'
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = process.env.VERCEL
  ? path.join('/tmp', 'content', 'notes')
  : path.join(process.cwd(), 'content', 'notes')

export interface SearchResult {
  title: string
  content: string
  url: string
}

export interface SaveArticleInput {
  title: string
  content: string
  tags: string[]
  keywords: string[]
  summary: string
}

export async function searchWeb(query: string, maxResults = 5): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY environment variable is not set')
  const client = tavily({ apiKey })
  const response = await client.search(query, { maxResults })
  return response.results.map((r: any) => ({
    title: r.title,
    content: r.content,
    url: r.url,
  }))
}

function toSlug(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return ascii.length > 0 ? ascii : 'article-' + Date.now()
}

function yamlEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function yamlArrayValue(items: string[]): string {
  return '[' + items.map((item) => `"${yamlEscape(item)}"`).join(', ') + ']'
}

export async function saveArticle(input: SaveArticleInput): Promise<string> {
  const slug = toSlug(input.title)
  const date = new Date().toISOString().slice(0, 10)
  const readTime = Math.max(1, Math.ceil(input.content.split(/\s+/).length / 200))

  const frontmatter = `---
title: "${yamlEscape(input.title)}"
slug: ${slug}
date: ${date}
tags: ${yamlArrayValue(input.tags)}
keywords: ${yamlArrayValue(input.keywords)}
summary: "${yamlEscape(input.summary)}"
source: agent_search
read_time: ${readTime}
---

`

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
  }

  fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), frontmatter + input.content, 'utf-8')
  return slug
}
