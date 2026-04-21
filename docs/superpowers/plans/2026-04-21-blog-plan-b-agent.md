# 个人技术博客 Plan B：Agent 系统 + 导入 + 扩展功能

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Plan A 核心博客基础上，叠加 Multi-Agent 系统（Orchestrator + 搜索 Agent + 管理 Agent）、记忆去重层、多模型切换、文件导入工具。

**Architecture:** Vercel AI SDK 统一管理 streaming 和 tool calling。Orchestrator 负责意图路由，子 Agent 各司其职。记忆库存于 Vercel KV，首次搜索前做语义去重。

**Tech Stack:** Vercel AI SDK (`ai`), @ai-sdk/openai, @ai-sdk/anthropic, @tavily/core, gray-matter, jszip, @vercel/kv

**前置条件:** Plan A 已完成并部署

---

## 文件结构（Plan B 新增）

```
lib/
  models.ts                     # 多模型统一接口
  agents/
    orchestrator.ts             # 意图检测 + 子 Agent 路由
    search-agent.ts             # 搜索 Agent
    manage-agent.ts             # 管理 Agent
  tools/
    search.ts                   # tavily_search, save_article
    manage.ts                   # list_articles, read_article, update_frontmatter, generate_summary, search_content
    memory.ts                   # check_memory, update_memory, rebuild_index, semantic_similarity
    import.ts                   # import_markdown, parse_notion_zip, parse_obsidian_zip

app/
  agent/
    page.tsx                    # Agent 全屏页面（布局独立，无 StatsBar）
    layout.tsx                  # Agent 页面布局
  (blog)/
    import/page.tsx             # 导入工具页
  api/
    agent/
      chat/route.ts             # Orchestrator 流式 API

components/
  agent/
    chat-panel.tsx              # 聊天主界面
    message-bubble.tsx          # 消息气泡（user/assistant）
    model-selector.tsx          # 模型切换下拉
    quick-actions.tsx           # 快捷操作按钮
  import/
    drop-zone.tsx               # 文件拖拽上传区
    import-options.tsx          # 导入来源选择
```

---

## Task 1: 安装依赖 + 多模型接口

**Files:**
- Create: `lib/models.ts`
- Create: `tests/models.test.ts`

- [ ] **Step 1: 安装 AI SDK 依赖**

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @tavily/core jszip
```

- [ ] **Step 2: 写失败测试**

创建 `tests/models.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getModel, AVAILABLE_MODELS } from '@/lib/models'

describe('models', () => {
  it('AVAILABLE_MODELS includes qwen-max, gpt-4o, claude-sonnet', () => {
    const ids = AVAILABLE_MODELS.map((m) => m.id)
    expect(ids).toContain('qwen-max')
    expect(ids).toContain('gpt-4o')
    expect(ids).toContain('claude-sonnet')
  })

  it('getModel returns a model for known id', () => {
    const model = getModel('qwen-max')
    expect(model).toBeDefined()
  })

  it('getModel falls back to qwen-max for unknown id', () => {
    const model = getModel('unknown-model' as any)
    expect(model).toBeDefined()
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

```bash
npx vitest run tests/models.test.ts
```

Expected: FAIL

- [ ] **Step 4: 实现多模型接口**

创建 `lib/models.ts`：

```typescript
import { createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { ModelId } from '@/types'

const qwen = createOpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY ?? '',
})

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
})

export const AVAILABLE_MODELS = [
  { id: 'qwen-max' as ModelId, label: 'Qwen-Max', provider: 'qwen' },
  { id: 'gpt-4o' as ModelId, label: 'GPT-4o', provider: 'openai' },
  { id: 'claude-sonnet' as ModelId, label: 'Claude Sonnet', provider: 'anthropic' },
]

export function getModel(id: ModelId) {
  switch (id) {
    case 'gpt-4o':
      return openai('gpt-4o')
    case 'claude-sonnet':
      return anthropic('claude-sonnet-4-6')
    case 'qwen-max':
    default:
      return qwen('qwen-max')
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run tests/models.test.ts
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add lib/models.ts tests/models.test.ts
git commit -m "feat: add multi-model interface (Qwen/OpenAI/Claude)"
```

---

## Task 2: 记忆工具（Memory Layer）

**Files:**
- Create: `lib/tools/memory.ts`
- Create: `tests/tools/memory.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/tools/memory.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/kv', () => {
  const store = new Map<string, unknown>()
  return {
    kv: {
      get: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      set: vi.fn((k: string, v: unknown) => { store.set(k, v); return Promise.resolve() }),
    },
  }
})

// Mock AI call for semantic_similarity
vi.mock('@/lib/models', () => ({
  getModel: vi.fn(() => ({})),
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: '0.3' }),
}))

import { checkMemory, updateMemory, rebuildIndex } from '@/lib/tools/memory'
import type { ArticleMeta } from '@/types'

const sampleArticle: ArticleMeta = {
  title: 'React 19 新特性',
  slug: 'react-19',
  date: '2026-04-18',
  tags: ['React'],
  keywords: ['并发', 'Actions'],
  summary: 'React 19 引入了 Actions 和并发渲染改进',
  source: 'agent_search',
  read_time: 10,
}

beforeEach(() => vi.clearAllMocks())

describe('memory tools', () => {
  it('updateMemory stores article in index', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce([])
    await updateMemory(sampleArticle)
    expect(kv.set).toHaveBeenCalledWith(
      'memory:index',
      expect.arrayContaining([
        expect.objectContaining({ slug: 'react-19' }),
      ])
    )
  })

  it('checkMemory returns null when index is empty', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce([])
    const result = await checkMemory('React hooks')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run tests/tools/memory.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现记忆工具**

创建 `lib/tools/memory.ts`：

```typescript
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

interface MemoryCheckResult {
  found: true
  slug: string
  title: string
} | {
  found: false
}

async function getIndex(): Promise<MemoryIndex[]> {
  return (await kv.get<MemoryIndex[]>('memory:index')) ?? []
}

export async function updateMemory(article: ArticleMeta): Promise<void> {
  const index = await getIndex()
  const exists = index.findIndex((i) => i.slug === article.slug)
  const entry: MemoryIndex = {
    slug: article.slug,
    title: article.title,
    keywords: article.keywords,
    summary: article.summary,
  }
  if (exists >= 0) {
    index[exists] = entry
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
): Promise<MemoryCheckResult> {
  const index = await getIndex()
  if (index.length === 0) return { found: false }

  // Step 1: keyword match
  const lowerQuery = query.toLowerCase()
  for (const item of index) {
    const keywordMatch = item.keywords.some((k) =>
      lowerQuery.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerQuery)
    )
    const titleMatch = item.title.toLowerCase().includes(lowerQuery)
    if (keywordMatch || titleMatch) {
      return { found: true, slug: item.slug, title: item.title }
    }
  }

  // Step 2: semantic similarity via AI
  const summaries = index.map((i, idx) => `[${idx}] ${i.title}: ${i.summary}`).join('\n')
  const { text } = await generateText({
    model: getModel(modelId),
    prompt: `判断以下查询与哪篇文章最相关（相似度 0-1）。只返回最相关文章的序号和相似度，格式：序号,相似度。如果没有相关文章，返回 -1,0。\n\n查询：${query}\n\n文章列表：\n${summaries}`,
  })

  const [idxStr, scoreStr] = text.trim().split(',')
  const idx = parseInt(idxStr)
  const score = parseFloat(scoreStr)

  if (idx >= 0 && score > 0.85 && index[idx]) {
    return { found: true, slug: index[idx].slug, title: index[idx].title }
  }

  return { found: false }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run tests/tools/memory.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add lib/tools/memory.ts tests/tools/memory.test.ts
git commit -m "feat: add memory tools with keyword + semantic deduplication"
```

---

## Task 3: 搜索工具（Tavily + 存文章）

**Files:**
- Create: `lib/tools/search.ts`
- Create: `tests/tools/search.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/tools/search.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@tavily/core', () => ({
  tavily: vi.fn(() => ({
    search: vi.fn().mockResolvedValue({
      results: [
        { title: 'React 19 release', content: 'React 19 introduces Actions...', url: 'https://react.dev' },
      ],
    }),
  })),
}))

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return { ...actual, writeFileSync: vi.fn(), mkdirSync: vi.fn(), existsSync: vi.fn(() => true) }
})

import { searchWeb, saveArticle } from '@/lib/tools/search'

describe('search tools', () => {
  it('searchWeb returns results array', async () => {
    const results = await searchWeb('React 19')
    expect(Array.isArray(results)).toBe(true)
    expect(results[0]).toHaveProperty('title')
    expect(results[0]).toHaveProperty('content')
  })

  it('saveArticle writes file and returns slug', async () => {
    const fs = await import('fs')
    const slug = await saveArticle({
      title: 'React 19 新特性',
      content: '# React 19\n\nContent here.',
      tags: ['React'],
      keywords: ['Actions'],
      summary: 'React 19 new features',
    })
    expect(slug).toBe('react-19-xin-te-xing')
    expect(fs.writeFileSync).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run tests/tools/search.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现搜索工具**

创建 `lib/tools/search.ts`：

```typescript
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
  return title
    .toLowerCase()
    .replace(/[\s一-鿿]+/g, (m) => {
      // For CJK, use pinyin-style placeholder; for spaces, use dash
      return m.trim() ? '-' + Buffer.from(m).toString('hex').slice(0, 8) : '-'
    })
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'article-' + Date.now()
}

export async function saveArticle(input: SaveArticleInput): Promise<string> {
  const slug = toSlug(input.title)
  const date = new Date().toISOString().slice(0, 10)
  const readTime = Math.ceil(input.content.split(/\s+/).length / 200)

  const frontmatter = `---
title: "${input.title}"
slug: ${slug}
date: ${date}
tags: [${input.tags.join(', ')}]
keywords: [${input.keywords.join(', ')}]
summary: "${input.summary}"
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
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run tests/tools/search.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add lib/tools/search.ts tests/tools/search.test.ts
git commit -m "feat: add search tools (Tavily + save article)"
```

---

## Task 4: 管理工具

**Files:**
- Create: `lib/tools/manage.ts`
- Create: `tests/tools/manage.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/tools/manage.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/content', () => ({
  getAllArticles: vi.fn().mockResolvedValue([
    { title: 'React 19', slug: 'react-19', date: '2026-04-18', tags: ['React'], keywords: ['Actions'], summary: 'summary', source: 'agent_search', read_time: 10 },
  ]),
  getArticle: vi.fn().mockResolvedValue({ title: 'React 19', slug: 'react-19', content: '# React 19\n\nContent', tags: [], keywords: [], summary: '', source: 'agent_search', read_time: 10, date: '2026-04-18' }),
}))

import { listArticles, searchContent } from '@/lib/tools/manage'

describe('manage tools', () => {
  it('listArticles returns all articles', async () => {
    const articles = await listArticles()
    expect(articles.length).toBe(1)
    expect(articles[0].slug).toBe('react-19')
  })

  it('searchContent filters by query', async () => {
    const results = await searchContent('React')
    expect(results.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run tests/tools/manage.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现管理工具**

创建 `lib/tools/manage.ts`：

```typescript
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
    if (entry.isDirectory()) files.push(...getAllMdFiles(fullPath))
    else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) files.push(fullPath)
  }
  return files
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run tests/tools/manage.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add lib/tools/manage.ts tests/tools/manage.test.ts
git commit -m "feat: add manage tools (list, search, summarize, update frontmatter)"
```

---

## Task 5: 搜索 Agent + 管理 Agent

**Files:**
- Create: `lib/agents/search-agent.ts`
- Create: `lib/agents/manage-agent.ts`

- [ ] **Step 1: 创建搜索 Agent**

创建 `lib/agents/search-agent.ts`：

```typescript
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { searchWeb, saveArticle } from '@/lib/tools/search'
import { updateMemory } from '@/lib/tools/memory'
import { getAllArticles } from '@/lib/content'
import type { ModelId } from '@/types'

export async function runSearchAgent(query: string, modelId: ModelId = 'qwen-max'): Promise<string> {
  const { text } = await generateText({
    model: getModel(modelId),
    maxSteps: 4,
    tools: {
      search_web: tool({
        description: '搜索网页获取最新技术资料',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const results = await searchWeb(query)
          return results.map((r) => `## ${r.title}\n${r.content}\n来源: ${r.url}`).join('\n\n')
        },
      }),
      save_article: tool({
        description: '将整理好的内容保存为博客文章',
        parameters: z.object({
          title: z.string(),
          content: z.string().describe('Markdown 格式的文章内容'),
          tags: z.array(z.string()),
          keywords: z.array(z.string()),
          summary: z.string(),
        }),
        execute: async (input) => {
          const slug = await saveArticle(input)
          const articles = await getAllArticles()
          const article = articles.find((a) => a.slug === slug)
          if (article) await updateMemory(article)
          return `文章已保存，slug: ${slug}`
        },
      }),
    },
    prompt: `你是一个技术内容研究助手。用户想了解：${query}

请按以下步骤操作：
1. 使用 search_web 搜索相关内容
2. 整理搜索结果，生成一篇结构清晰的中文技术文章（Markdown格式）
3. 使用 save_article 保存文章

文章要求：有引言、正文分节、代码示例（如有）、总结。`,
  })
  return text
}
```

- [ ] **Step 2: 创建管理 Agent**

创建 `lib/agents/manage-agent.ts`：

```typescript
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { listArticles, searchContent, generateSummary, updateFrontmatter } from '@/lib/tools/manage'
import { rebuildIndex } from '@/lib/tools/memory'
import { getAllArticles } from '@/lib/content'
import type { ModelId } from '@/types'

export async function runManageAgent(instruction: string, modelId: ModelId = 'qwen-max'): Promise<string> {
  const { text } = await generateText({
    model: getModel(modelId),
    maxSteps: 5,
    tools: {
      list_articles: tool({
        description: '列出博客文章，可按标签或来源过滤',
        parameters: z.object({
          tag: z.string().optional(),
          source: z.enum(['manual', 'agent_search', 'import']).optional(),
        }),
        execute: async (filter) => {
          const articles = await listArticles(filter)
          return articles.map((a) => `- ${a.slug}: ${a.title} [${a.tags.join(', ')}]`).join('\n')
        },
      }),
      search_content: tool({
        description: '在博客文章中搜索内容',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const results = await searchContent(query)
          return results.map((a) => `- ${a.slug}: ${a.title}`).join('\n') || '未找到相关文章'
        },
      }),
      generate_summary: tool({
        description: '为指定文章生成/更新摘要',
        parameters: z.object({ slug: z.string() }),
        execute: async ({ slug }) => {
          const summary = await generateSummary(slug)
          await updateFrontmatter(slug, { summary })
          return `已更新 ${slug} 的摘要：${summary}`
        },
      }),
      rebuild_index: tool({
        description: '重建记忆库文章索引（整理完成后调用）',
        parameters: z.object({}),
        execute: async () => {
          const articles = await getAllArticles()
          await rebuildIndex(articles)
          return `已重建索引，共 ${articles.length} 篇文章`
        },
      }),
    },
    prompt: `你是博客内容管理助手。请按用户的指令操作博客文章。

用户指令：${instruction}

操作完成后，如果修改了文章，请调用 rebuild_index 更新记忆库。`,
  })
  return text
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/agents/search-agent.ts lib/agents/manage-agent.ts
git commit -m "feat: add search agent and manage agent"
```

---

## Task 6: Orchestrator + Streaming API

**Files:**
- Create: `lib/agents/orchestrator.ts`
- Create: `app/api/agent/chat/route.ts`

- [ ] **Step 1: 创建 Orchestrator**

创建 `lib/agents/orchestrator.ts`：

```typescript
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { checkMemory } from '@/lib/tools/memory'
import { runSearchAgent } from './search-agent'
import { runManageAgent } from './manage-agent'
import type { ModelId } from '@/types'

export function createOrchestratorStream(message: string, modelId: ModelId = 'qwen-max') {
  return streamText({
    model: getModel(modelId),
    maxSteps: 6,
    tools: {
      check_memory: tool({
        description: '搜索前先查询记忆库，看是否已有相关文章',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const result = await checkMemory(query, modelId)
          if (result.found) {
            return `已有相关文章：《${result.title}》，slug: ${result.slug}。建议直接查看已有内容，避免重复搜索。`
          }
          return '记忆库中未找到相关内容，可以继续搜索。'
        },
      }),
      search_agent: tool({
        description: '调用搜索 Agent：搜索网页并整理保存为文章',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => runSearchAgent(query, modelId),
      }),
      manage_agent: tool({
        description: '调用管理 Agent：整理、搜索、分类已有博客文章',
        parameters: z.object({ instruction: z.string() }),
        execute: async ({ instruction }) => runManageAgent(instruction, modelId),
      }),
    },
    system: `你是个人技术博客的 AI 助手，负责帮助用户搜索整理技术内容和管理博客文章。

判断意图的规则：
- 搜索类（"搜索xxx"、"查找xxx新特性"）→ 先用 check_memory 查询，未命中才调用 search_agent
- 管理类（"整理"、"分类"、"列出"、"总结"）→ 直接调用 manage_agent
- 混合类 → 先管理再搜索，或按用户意图顺序执行

始终用中文回复。`,
    prompt: message,
  })
}
```

- [ ] **Step 2: 创建流式 API Route**

创建 `app/api/agent/chat/route.ts`：

```typescript
import { NextRequest } from 'next/server'
import { createOrchestratorStream } from '@/lib/agents/orchestrator'
import type { ModelId } from '@/types'

export async function POST(req: NextRequest) {
  const { message, modelId } = await req.json()

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400 })
  }

  const stream = createOrchestratorStream(message, (modelId as ModelId) ?? 'qwen-max')
  return stream.toDataStreamResponse()
}

export const runtime = 'nodejs'
export const maxDuration = 60
```

- [ ] **Step 3: 验证 TypeScript 类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add lib/agents/orchestrator.ts app/api/agent/chat/route.ts
git commit -m "feat: add orchestrator agent and streaming API route"
```

---

## Task 7: Agent UI 组件

**Files:**
- Create: `components/agent/model-selector.tsx`
- Create: `components/agent/message-bubble.tsx`
- Create: `components/agent/quick-actions.tsx`
- Create: `components/agent/chat-panel.tsx`

- [ ] **Step 1: 创建模型选择器**

创建 `components/agent/model-selector.tsx`：

```typescript
'use client'

import { AVAILABLE_MODELS } from '@/lib/models'
import type { ModelId } from '@/types'

interface ModelSelectorProps {
  value: ModelId
  onChange: (id: ModelId) => void
}

const STATUS_COLORS: Record<ModelId, string> = {
  'qwen-max': 'text-yellow-accent',
  'gpt-4o': 'text-blue-accent',
  'claude-sonnet': 'text-purple',
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted">模型：</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModelId)}
        className="bg-bg-secondary border border-border-purple/30 text-purple rounded px-2 py-1 text-[10px] cursor-pointer focus:outline-none focus:border-border-purple"
      >
        {AVAILABLE_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: 创建消息气泡**

创建 `components/agent/message-bubble.tsx`：

```typescript
interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[60%] bg-purple/15 border border-border-purple/30 rounded-xl px-3 py-2 text-xs text-text-secondary leading-relaxed">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full progress-bar flex items-center justify-center text-[10px] shrink-0 mt-0.5">
        🤖
      </div>
      <div className="max-w-[80%] bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建快捷操作**

创建 `components/agent/quick-actions.tsx`：

```typescript
const ACTIONS = [
  { label: '🔍 搜索网页', prompt: '帮我搜索' },
  { label: '📂 整理文章', prompt: '帮我整理和分类现有的博客文章' },
  { label: '💡 今日推荐', prompt: '根据我还未学习的文章，推荐今天应该读哪篇' },
  { label: '📊 学习总结', prompt: '总结我最近的学习情况和文章内容' },
]

interface QuickActionsProps {
  onSelect: (prompt: string) => void
}

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => onSelect(a.prompt)}
          className="text-[10px] text-text-muted bg-bg-tertiary border border-border hover:border-border-purple hover:text-purple rounded px-2 py-1.5 transition-colors"
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 创建聊天面板**

创建 `components/agent/chat-panel.tsx`：

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { ModelSelector } from './model-selector'
import { MessageBubble } from './message-bubble'
import { QuickActions } from './quick-actions'
import type { ModelId } from '@/types'

export function ChatPanel() {
  const [modelId, setModelId] = useState<ModelId>('qwen-max')
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, append, isLoading } = useChat({
    api: '/api/agent/chat',
    body: { modelId },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist model choice in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('agent-model') as ModelId | null
    if (saved) setModelId(saved)
  }, [])

  function handleModelChange(id: ModelId) {
    setModelId(id)
    localStorage.setItem('agent-model', id)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await append({ role: 'user', content: text })
  }

  function handleQuickAction(prompt: string) {
    setInput(prompt)
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-purple/20 px-5 py-3 flex justify-between items-center">
        <div className="text-sm font-semibold text-purple">🤖 AI Agent</div>
        <ModelSelector value={modelId} onChange={handleModelChange} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-text-muted text-sm py-20">
            <div className="text-3xl mb-3">🤖</div>
            <p>你好！我可以帮你搜索技术内容、整理博客文章。</p>
            <p className="text-xs mt-1">试试下面的快捷操作，或直接输入你的需求。</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role as 'user' | 'assistant'} content={m.content} />
        ))}
        {isLoading && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full progress-bar flex items-center justify-center text-[10px] shrink-0">🤖</div>
            <div className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-text-muted">
              思考中 <span className="animate-pulse">▌</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="border-t border-border-purple/10 px-5 py-2.5">
        <QuickActions onSelect={handleQuickAction} />
      </div>

      {/* Input */}
      <div className="border-t border-border-purple/20 px-5 py-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="输入你的需求... (Enter 发送，Shift+Enter 换行)"
          rows={1}
          className="flex-1 bg-bg-secondary border border-border-purple/25 rounded-lg px-3 py-2 text-xs text-text-secondary placeholder-text-muted focus:outline-none focus:border-border-purple resize-none"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white progress-bar disabled:opacity-40 transition-opacity hover:opacity-90"
        >
          发送
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 提交**

```bash
git add components/agent/
git commit -m "feat: add agent UI components (chat panel, model selector, quick actions)"
```

---

## Task 8: Agent 页面

**Files:**
- Create: `app/agent/layout.tsx`
- Create: `app/agent/page.tsx`

- [ ] **Step 1: 创建 Agent 布局（独立于博客布局）**

创建 `app/agent/layout.tsx`：

```typescript
import { Nav } from '@/components/layout/nav'

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      <Nav />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 Agent 页面**

创建 `app/agent/page.tsx`：

```typescript
import { ChatPanel } from '@/components/agent/chat-panel'

export default function AgentPage() {
  return <ChatPanel />
}
```

- [ ] **Step 3: 在 Vercel 添加环境变量**

在 `.env.local` 添加：

```
DASHSCOPE_API_KEY=your_qwen_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Tavily API Key 申请地址：https://app.tavily.com/

- [ ] **Step 4: 启动并测试 Agent**

```bash
npm run dev
```

访问 http://localhost:3000/agent：
1. 确认聊天界面正常显示
2. 输入"帮我搜索 React 19 新特性"，确认流式输出
3. 确认 Orchestrator 先调用 check_memory，未命中后调用搜索 Agent
4. 确认搜索结果保存到 `/content/notes/`
5. 切换模型到 GPT-4o，再次发送消息，确认模型切换生效

- [ ] **Step 5: 提交**

```bash
git add app/agent/
git commit -m "feat: add agent page with streaming chat interface"
```

---

## Task 9: 导入工具

**Files:**
- Create: `lib/tools/import.ts`
- Create: `tests/tools/import.test.ts`
- Create: `components/import/drop-zone.tsx`
- Create: `components/import/import-options.tsx`
- Create: `app/(blog)/import/page.tsx`
- Create: `app/api/import/route.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/tools/import.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return { ...actual, writeFileSync: vi.fn(), mkdirSync: vi.fn(), existsSync: vi.fn(() => true) }
})

import { importMarkdownFiles } from '@/lib/tools/import'

describe('import tools', () => {
  it('importMarkdownFiles processes .md files', async () => {
    const result = await importMarkdownFiles([
      {
        name: 'test.md',
        content: `---\ntitle: Test Article\nslug: test-article\n---\n\n# Hello`,
      },
    ])
    expect(result.imported).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('importMarkdownFiles generates slug from filename if missing', async () => {
    const result = await importMarkdownFiles([
      {
        name: 'my-article.md',
        content: '# My Article\n\nContent here.',
      },
    ])
    expect(result.imported).toBe(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run tests/tools/import.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现导入工具**

创建 `lib/tools/import.ts`：

```typescript
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import JSZip from 'jszip'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'imports')

export interface ParsedFile {
  name: string
  content: string
}

export interface ImportResult {
  imported: number
  failed: number
  errors: string[]
}

export async function importMarkdownFiles(files: ParsedFile[]): Promise<ImportResult> {
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true })

  let imported = 0
  let failed = 0
  const errors: string[] = []

  for (const file of files) {
    try {
      const { data, content } = matter(file.content)
      const slug = data.slug || file.name.replace(/\.mdx?$/, '')
      const date = data.date ? String(data.date).slice(0, 10) : new Date().toISOString().slice(0, 10)

      const frontmatter = {
        title: data.title || slug,
        slug,
        date,
        tags: data.tags ?? [],
        keywords: data.keywords ?? [],
        summary: data.summary ?? '',
        source: 'import',
        read_time: data.read_time ?? Math.ceil(content.split(/\s+/).length / 200),
      }

      const output = matter.stringify(content, frontmatter)
      fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), output, 'utf-8')
      imported++
    } catch (e) {
      failed++
      errors.push(`${file.name}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return { imported, failed, errors }
}

export async function parseNotionZip(buffer: Buffer): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(buffer)
  const files: ParsedFile[] = []

  for (const [name, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue
    if (!name.endsWith('.md')) continue
    const content = await zipEntry.async('string')
    // Notion exports use HTML in some blocks; strip basic HTML tags
    const cleaned = content.replace(/<[^>]+>/g, '')
    files.push({ name: path.basename(name), content: cleaned })
  }

  return files
}

export async function parseObsidianZip(buffer: Buffer): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(buffer)
  const files: ParsedFile[] = []

  for (const [name, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue
    if (!name.endsWith('.md')) continue
    let content = await zipEntry.async('string')
    // Convert Obsidian wikilinks [[Link]] to tags
    const wikilinks: string[] = []
    content = content.replace(/\[\[([^\]]+)\]\]/g, (_, link) => {
      wikilinks.push(link)
      return `\`${link}\``
    })
    // Prepend wikilinks as tags if no frontmatter
    if (!content.startsWith('---') && wikilinks.length > 0) {
      const fm = matter.stringify(content, { tags: wikilinks.slice(0, 5) })
      content = fm
    }
    files.push({ name: path.basename(name), content })
  }

  return files
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run tests/tools/import.test.ts
```

Expected: PASS

- [ ] **Step 5: 创建导入 API**

创建 `app/api/import/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { importMarkdownFiles, parseNotionZip, parseObsidianZip } from '@/lib/tools/import'
import { getAllArticles } from '@/lib/content'
import { rebuildIndex } from '@/lib/tools/memory'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const type = formData.get('type') as string
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let parsedFiles

  if (type === 'notion' || type === 'obsidian') {
    parsedFiles = type === 'notion'
      ? await parseNotionZip(buffer)
      : await parseObsidianZip(buffer)
  } else {
    const content = buffer.toString('utf-8')
    parsedFiles = [{ name: file.name, content }]
  }

  const result = await importMarkdownFiles(parsedFiles)

  // Rebuild memory index after import
  const articles = await getAllArticles()
  await rebuildIndex(articles)

  return NextResponse.json(result)
}
```

- [ ] **Step 6: 创建导入组件**

创建 `components/import/drop-zone.tsx`：

```typescript
'use client'

import { useState, useRef } from 'react'

interface DropZoneProps {
  onFiles: (files: FileList) => void
  accept: string
}

export function DropZone({ onFiles, accept }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
        dragging ? 'border-purple bg-purple/5' : 'border-border-purple/30 hover:border-border-purple/60'
      }`}
    >
      <div className="text-4xl mb-3">📁</div>
      <div className="text-sm text-text-secondary font-semibold mb-1">拖拽文件到这里，或点击选择</div>
      <div className="text-xs text-text-muted">{accept}</div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" multiple onChange={(e) => e.target.files && onFiles(e.target.files)} />
    </div>
  )
}
```

创建 `components/import/import-options.tsx`：

```typescript
'use client'

import { useState } from 'react'
import { DropZone } from './drop-zone'

type ImportType = 'markdown' | 'notion' | 'obsidian'

const OPTIONS: { type: ImportType; label: string; desc: string; accept: string; color: string }[] = [
  { type: 'markdown', label: '📝 Markdown / MDX', desc: '.md .mdx 文件，保留 frontmatter', accept: '.md,.mdx', color: 'border-purple/30 text-purple' },
  { type: 'notion', label: '🗒 Notion Export', desc: 'Notion 导出的 .zip 包', accept: '.zip', color: 'border-yellow-accent/30 text-yellow-accent' },
  { type: 'obsidian', label: '🔮 Obsidian Vault', desc: 'Obsidian 仓库 .zip 包', accept: '.zip', color: 'border-green-accent/30 text-green-accent' },
]

export function ImportOptions() {
  const [selected, setSelected] = useState<ImportType>('markdown')
  const [status, setStatus] = useState<{ imported?: number; failed?: number; errors?: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const currentOption = OPTIONS.find((o) => o.type === selected)!

  async function handleFiles(files: FileList) {
    setLoading(true)
    setStatus(null)
    const formData = new FormData()
    formData.append('type', selected)
    formData.append('file', files[0])

    const res = await fetch('/api/import', { method: 'POST', body: formData })
    const data = await res.json()
    setStatus(data)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            onClick={() => setSelected(o.type)}
            className={`flex-1 bg-bg-secondary border rounded-xl p-3 text-left transition-all ${
              selected === o.type ? o.color + ' bg-opacity-5' : 'border-border text-text-muted hover:border-border-purple/30'
            }`}
          >
            <div className="text-xs font-semibold mb-1">{o.label}</div>
            <div className="text-[10px] text-text-muted">{o.desc}</div>
          </button>
        ))}
      </div>

      <DropZone onFiles={handleFiles} accept={currentOption.accept} />

      {loading && <div className="text-center text-xs text-text-muted py-4">正在导入...</div>}

      {status && (
        <div className={`rounded-xl p-4 text-sm ${status.failed === 0 ? 'bg-green-accent/10 border border-green-accent/20 text-green-accent' : 'bg-red-400/10 border border-red-400/20 text-red-400'}`}>
          ✅ 成功导入 {status.imported} 篇
          {status.failed! > 0 && `，失败 ${status.failed} 篇`}
          {status.errors?.length ? (
            <div className="text-[10px] mt-2 text-text-muted">{status.errors.join('; ')}</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: 创建导入页面**

创建 `app/(blog)/import/page.tsx`：

```typescript
import { ImportOptions } from '@/components/import/import-options'

export default function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary mb-1">📥 导入文章</h1>
        <p className="text-xs text-text-muted">支持 Markdown、Notion Export、Obsidian Vault 导入</p>
      </div>
      <ImportOptions />
    </div>
  )
}
```

- [ ] **Step 8: 验证导入功能**

```bash
npm run dev
```

访问 http://localhost:3000/import：
1. 选择 Markdown 标签，拖拽一个 .md 文件，确认显示"成功导入 1 篇"
2. 回到首页，确认新文章出现在列表中

- [ ] **Step 9: 运行全部测试**

```bash
npx vitest run
```

Expected: 全部 PASS

- [ ] **Step 10: 提交**

```bash
git add lib/tools/import.ts tests/tools/import.test.ts components/import/ app/\(blog\)/import/ app/api/import/
git commit -m "feat: add import tools and UI (Markdown/Notion/Obsidian)"
```

---

## Task 10: 最终部署

- [ ] **Step 1: 在 Vercel 添加剩余环境变量**

在 Vercel Dashboard → Settings → Environment Variables 添加：
```
DASHSCOPE_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
```

- [ ] **Step 2: 推送部署**

```bash
git push origin main
```

- [ ] **Step 3: 端对端验证**

在 Vercel 生产环境：
1. `/agent` 页面发送"搜索 TypeScript 5.0 新特性"，确认流式响应正常
2. Orchestrator 先检查记忆库，再搜索网页，保存文章
3. 再次发同样问题，确认命中记忆库直接返回已有文章
4. `/import` 页面导入一个 .md 文件，确认首页出现新文章

---

## Plan B 完成标准

- [ ] Agent 聊天界面流式输出正常
- [ ] Orchestrator 正确路由到搜索/管理 Agent
- [ ] 记忆去重生效（同一话题不重复搜索）
- [ ] 三个模型（Qwen/OpenAI/Claude）可切换
- [ ] 导入工具支持 MD/Notion/Obsidian
- [ ] 所有单元测试通过
- [ ] 生产环境部署验证通过
