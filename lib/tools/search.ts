import { tavily } from '@tavily/core'
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'notes')

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
  const client = tavily({ apiKey: process.env.TAVILY_API_KEY ?? '' })
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
    .replace(/[^\x00-\x7F]/g, '')  // strip non-ASCII (CJK etc.)
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return ascii.length > 0 ? ascii : 'article-' + Date.now()
}

export async function saveArticle(input: SaveArticleInput): Promise<string> {
  const slug = toSlug(input.title)
  const date = new Date().toISOString().slice(0, 10)
  const readTime = Math.max(1, Math.ceil(input.content.split(/\s+/).length / 200))

  const frontmatter = `---
title: "${input.title.replace(/"/g, '\\"')}"
slug: ${slug}
date: ${date}
tags: [${input.tags.join(', ')}]
keywords: [${input.keywords.join(', ')}]
summary: "${input.summary.replace(/"/g, '\\"')}"
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
