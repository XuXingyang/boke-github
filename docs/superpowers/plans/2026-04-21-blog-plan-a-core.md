# 个人技术博客 Plan A：核心博客 + 打卡系统

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可独立部署到 Vercel 的个人技术博客，包含文章展示、阅读进度、每日打卡 Streak、文章打卡、学习时长追踪。

**Architecture:** Next.js 15 App Router，Markdown 文章存 `/content/` 目录由 Git 管理，学习记录存 Vercel KV（Redis）。前端深色极客 + 紫蓝渐变风格，Tailwind CSS 实现。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, gray-matter, next-mdx-remote, @vercel/kv, Vitest, lucide-react

---

## 文件结构

```
app/
  (blog)/
    layout.tsx          # 博客布局：Nav + StatsBar
    page.tsx            # 首页/仪表盘
    [slug]/page.tsx     # 文章详情
    checkin/page.tsx    # 打卡/统计页
  api/
    checkin/route.ts    # 打卡 CRUD API
  layout.tsx            # Root layout
  globals.css           # 全局样式 + CSS 变量

lib/
  content.ts            # 解析 Markdown + frontmatter
  checkin.ts            # Streak / 时长 / 文章打卡逻辑

types/index.ts          # 共享 TypeScript 类型

components/
  layout/
    nav.tsx             # 顶部导航
    stats-bar.tsx       # 统计栏（Streak / 时长 / 已学）
  article/
    article-card.tsx    # 文章列表卡片
    article-reader.tsx  # MDX 渲染器 + 目录
    checkin-button.tsx  # 标记已学习按钮
    reading-timer.tsx   # 学习时长计时器（客户端）
  checkin/
    streak-card.tsx     # Streak 展示卡
    stats-card.tsx      # 时长 / 文章数统计
    heatmap-calendar.tsx # 月历热力图

content/
  react/.gitkeep
  typescript/.gitkeep
  notes/.gitkeep
  _sample.md            # 示例文章（开发用）
```

---

## Task 1: 初始化 Next.js 项目

**Files:**
- Create: `package.json` (via CLI)
- Create: `tailwind.config.ts`
- Create: `app/globals.css`
- Create: `app/layout.tsx`

- [ ] **Step 1: 创建 Next.js 15 项目**

```bash
cd /Users/cds-dn-181/Documents/boke-github
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 2: 安装依赖**

```bash
npm install gray-matter next-mdx-remote @vercel/kv lucide-react
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: 配置 Vitest**

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

创建 `vitest.setup.ts`：

```typescript
import '@testing-library/jest-dom'
```

在 `package.json` 的 `scripts` 中添加：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 配置 Tailwind 深色主题**

替换 `tailwind.config.ts`：

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d1117',
          secondary: '#161b22',
          tertiary: '#21262d',
        },
        border: {
          DEFAULT: '#30363d',
          purple: 'rgba(139,92,246,0.3)',
          'purple-glow': 'rgba(139,92,246,0.6)',
        },
        purple: {
          DEFAULT: '#a78bfa',
          dark: '#7c3aed',
        },
        blue: {
          accent: '#60a5fa',
          code: '#2563eb',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#c9d1d9',
          muted: '#8b949e',
        },
        green: { accent: '#34d399' },
        yellow: { accent: '#fbbf24' },
      },
      backgroundImage: {
        'gradient-purple-blue': 'linear-gradient(135deg, #7c3aed, #2563eb)',
        'gradient-nav': 'linear-gradient(90deg, rgba(139,92,246,0.1), rgba(96,165,250,0.06))',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 5: 设置全局样式**

替换 `app/globals.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #0d1117;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
}

@layer utilities {
  .gradient-text {
    background: linear-gradient(90deg, #a78bfa, #60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .progress-bar {
    background: linear-gradient(90deg, #7c3aed, #2563eb);
  }
  .border-glow {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.15);
  }
}
```

- [ ] **Step 6: 设置 root layout**

替换 `app/layout.tsx`：

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dev·Notes',
  description: '个人技术博客',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: 创建内容目录和示例文章**

```bash
mkdir -p content/{react,typescript,notes}
touch content/react/.gitkeep content/typescript/.gitkeep content/notes/.gitkeep
```

创建 `content/_sample.md`：

```markdown
---
title: "TypeScript 类型体操进阶"
slug: typescript-advanced-types
date: 2026-04-18
tags: [TypeScript, Frontend]
keywords: [条件类型, 映射类型, infer]
summary: "掌握 TypeScript 高级类型操作，写出更安全表达力更强的代码"
source: manual
read_time: 12
---

## 介绍

类型系统是 TypeScript 的核心能力...

## 条件类型

```typescript
type IsString<T> = T extends string ? 'yes' : 'no'
```

## 映射类型

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}
```

## 总结

掌握这些模式能显著提升代码质量。
```

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "chore: initialize Next.js 15 project with Tailwind dark theme"
```

---

## Task 2: 共享类型定义

**Files:**
- Create: `types/index.ts`
- Create: `tests/types.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/types.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import type { ArticleMeta, CheckinRecord, StreakState, ArticleProgress } from '@/types'

describe('Type structure', () => {
  it('ArticleMeta has required fields', () => {
    const meta: ArticleMeta = {
      title: 'Test',
      slug: 'test',
      date: '2026-04-18',
      tags: ['React'],
      keywords: ['hook'],
      summary: 'A test article',
      source: 'manual',
      read_time: 5,
    }
    expect(meta.slug).toBe('test')
  })

  it('CheckinRecord tracks study data', () => {
    const record: CheckinRecord = {
      checked: true,
      study_seconds: 3600,
      articles_read: ['react-hooks'],
    }
    expect(record.study_seconds).toBe(3600)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run tests/types.test.ts
```

Expected: FAIL — `Cannot find module '@/types'`

- [ ] **Step 3: 创建类型定义**

创建 `types/index.ts`：

```typescript
export type ArticleSource = 'manual' | 'agent_search' | 'import'

export interface ArticleMeta {
  title: string
  slug: string
  date: string
  tags: string[]
  keywords: string[]
  summary: string
  source: ArticleSource
  read_time: number
}

export interface ArticleWithContent extends ArticleMeta {
  content: string
}

export interface CheckinRecord {
  checked: boolean
  study_seconds: number
  articles_read: string[]
}

export interface StreakState {
  count: number
  last_date: string   // YYYY-MM-DD
  longest: number
}

export interface ArticleProgress {
  completed: boolean
  progress: number    // 0-100
  date: string        // YYYY-MM-DD, 完成日期
}

export interface DailyStats {
  streak: StreakState
  checkin: CheckinRecord
  total_articles: number
  completed_articles: number
}

export type ModelId = 'qwen-max' | 'gpt-4o' | 'claude-sonnet'
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run tests/types.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add types/index.ts tests/types.test.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: 内容工具（解析 Markdown）

**Files:**
- Create: `lib/content.ts`
- Create: `tests/content.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/content.test.ts`：

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { getArticle, getAllArticles, getArticleSlugs } from '@/lib/content'
import fs from 'fs'
import path from 'path'

describe('content utilities', () => {
  it('getAllArticles returns array of ArticleMeta', async () => {
    const articles = await getAllArticles()
    expect(Array.isArray(articles)).toBe(true)
    if (articles.length > 0) {
      expect(articles[0]).toHaveProperty('slug')
      expect(articles[0]).toHaveProperty('title')
      expect(articles[0]).toHaveProperty('date')
    }
  })

  it('getArticle returns content for valid slug', async () => {
    const article = await getArticle('typescript-advanced-types')
    expect(article).not.toBeNull()
    expect(article?.title).toBe('TypeScript 类型体操进阶')
    expect(article?.content).toContain('类型系统')
  })

  it('getArticle returns null for invalid slug', async () => {
    const article = await getArticle('nonexistent-slug')
    expect(article).toBeNull()
  })

  it('articles are sorted by date descending', async () => {
    const articles = await getAllArticles()
    for (let i = 1; i < articles.length; i++) {
      expect(articles[i - 1].date >= articles[i].date).toBe(true)
    }
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run tests/content.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/content'`

- [ ] **Step 3: 实现内容工具**

创建 `lib/content.ts`：

```typescript
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
      files.push(...getAllMdFiles(fullPath))
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
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run tests/content.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: 提交**

```bash
git add lib/content.ts tests/content.test.ts
git commit -m "feat: add content utilities for markdown parsing"
```

---

## Task 4: 打卡逻辑（Vercel KV）

**Files:**
- Create: `lib/checkin.ts`
- Create: `tests/checkin.test.ts`
- Create: `.env.local` (手动)

- [ ] **Step 1: 配置环境变量**

创建 `.env.local`（此文件不提交 git）：

```
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
```

Vercel KV 获取方式：在 Vercel Dashboard → Storage → Create Database → KV → 复制环境变量。

本地开发也可用 `@vercel/kv` 的 mock 模式：安装 `npm install -D @vercel/kv` 后 KV_URL 留空时自动用内存存储（仅开发）。

- [ ] **Step 2: 写失败测试**

创建 `tests/checkin.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @vercel/kv
vi.mock('@vercel/kv', () => {
  const store = new Map<string, unknown>()
  return {
    kv: {
      get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      set: vi.fn((key: string, val: unknown) => { store.set(key, val); return Promise.resolve() }),
      getdel: vi.fn((key: string) => { const v = store.get(key); store.delete(key); return Promise.resolve(v ?? null) }),
    },
  }
})

import {
  getTodayKey,
  getCheckinRecord,
  markDailyCheckin,
  addStudySeconds,
  markArticleRead,
  getStreak,
  getDailyStats,
} from '@/lib/checkin'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkin utilities', () => {
  it('getTodayKey returns YYYY-MM-DD format', () => {
    const key = getTodayKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('markDailyCheckin sets checked=true', async () => {
    await markDailyCheckin('2026-04-18')
    const { kv } = await import('@vercel/kv')
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ checked: true })
    )
  })

  it('addStudySeconds accumulates time', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ checked: true, study_seconds: 1800, articles_read: [] })
    await addStudySeconds('2026-04-18', 600)
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ study_seconds: 2400 })
    )
  })

  it('markArticleRead adds slug to articles_read', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ checked: true, study_seconds: 0, articles_read: [] })
    await markArticleRead('2026-04-18', 'react-hooks')
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ articles_read: ['react-hooks'] })
    )
  })

  it('streak increments on consecutive days', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ count: 5, last_date: '2026-04-17', longest: 10 })
    const streak = await getStreak('2026-04-18')
    expect(streak.count).toBe(6)
  })

  it('streak resets on non-consecutive day', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ count: 5, last_date: '2026-04-15', longest: 10 })
    const streak = await getStreak('2026-04-18')
    expect(streak.count).toBe(1)
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

```bash
npx vitest run tests/checkin.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/checkin'`

- [ ] **Step 4: 实现打卡逻辑**

创建 `lib/checkin.ts`：

```typescript
import { kv } from '@vercel/kv'
import type { CheckinRecord, StreakState, ArticleProgress, DailyStats } from '@/types'

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateIsConsecutive(prev: string, next: string): boolean {
  const p = new Date(prev)
  const n = new Date(next)
  const diff = (n.getTime() - p.getTime()) / (1000 * 60 * 60 * 24)
  return diff === 1
}

export async function getCheckinRecord(date: string): Promise<CheckinRecord> {
  const record = await kv.get<CheckinRecord>(`checkin:${date}`)
  return record ?? { checked: false, study_seconds: 0, articles_read: [] }
}

export async function markDailyCheckin(date: string): Promise<void> {
  const record = await getCheckinRecord(date)
  await kv.set(`checkin:${date}`, { ...record, checked: true })
  await updateStreak(date)
}

export async function addStudySeconds(date: string, seconds: number): Promise<void> {
  const record = await getCheckinRecord(date)
  await kv.set(`checkin:${date}`, {
    ...record,
    study_seconds: record.study_seconds + seconds,
  })
}

export async function markArticleRead(date: string, slug: string): Promise<void> {
  const record = await getCheckinRecord(date)
  if (record.articles_read.includes(slug)) return
  await kv.set(`checkin:${date}`, {
    ...record,
    articles_read: [...record.articles_read, slug],
  })
  await kv.set(`article:${slug}`, {
    completed: true,
    progress: 100,
    date,
  } satisfies ArticleProgress)
}

export async function getArticleProgress(slug: string): Promise<ArticleProgress | null> {
  return kv.get<ArticleProgress>(`article:${slug}`)
}

export async function getStreak(date: string): Promise<StreakState> {
  const current = await kv.get<StreakState>('streak:current')
  if (!current) return { count: 1, last_date: date, longest: 1 }

  if (current.last_date === date) return current

  const count = dateIsConsecutive(current.last_date, date) ? current.count + 1 : 1
  return {
    count,
    last_date: date,
    longest: Math.max(current.longest, count),
  }
}

async function updateStreak(date: string): Promise<void> {
  const streak = await getStreak(date)
  await kv.set('streak:current', streak)
}

export async function getDailyStats(date: string, totalArticles: number): Promise<DailyStats> {
  const [streak, checkin] = await Promise.all([
    getStreak(date),
    getCheckinRecord(date),
  ])
  return {
    streak,
    checkin,
    total_articles: totalArticles,
    completed_articles: checkin.articles_read.length,
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run tests/checkin.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 6: 提交**

```bash
git add lib/checkin.ts tests/checkin.test.ts
git commit -m "feat: add check-in logic with streak tracking"
```

---

## Task 5: 打卡 API Route

**Files:**
- Create: `app/api/checkin/route.ts`

- [ ] **Step 1: 创建打卡 API**

创建 `app/api/checkin/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  getTodayKey,
  markDailyCheckin,
  addStudySeconds,
  markArticleRead,
  getCheckinRecord,
  getStreak,
} from '@/lib/checkin'
import { getAllArticles } from '@/lib/content'

export async function GET() {
  const today = getTodayKey()
  const [record, streak, articles] = await Promise.all([
    getCheckinRecord(today),
    getStreak(today),
    getAllArticles(),
  ])
  return NextResponse.json({ record, streak, total_articles: articles.length })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, slug, seconds } = body
  const today = getTodayKey()

  if (action === 'checkin') {
    await markDailyCheckin(today)
    return NextResponse.json({ ok: true })
  }

  if (action === 'study' && typeof seconds === 'number') {
    await addStudySeconds(today, seconds)
    return NextResponse.json({ ok: true })
  }

  if (action === 'article' && typeof slug === 'string') {
    await markArticleRead(today, slug)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}
```

- [ ] **Step 2: 验证 API 结构正确**

```bash
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add app/api/checkin/route.ts
git commit -m "feat: add check-in API route"
```

---

## Task 6: 布局组件（Nav + StatsBar）

**Files:**
- Create: `components/layout/nav.tsx`
- Create: `components/layout/stats-bar.tsx`
- Create: `app/(blog)/layout.tsx`

- [ ] **Step 1: 创建导航组件**

创建 `components/layout/nav.tsx`：

```typescript
import Link from 'next/link'

const links = [
  { href: '/', label: '文章' },
  { href: '/agent', label: 'Agent' },
  { href: '/checkin', label: '打卡' },
  { href: '/import', label: '导入' },
]

export function Nav() {
  return (
    <nav className="bg-bg-primary border-b border-border-purple px-6 py-3 flex justify-between items-center sticky top-0 z-50">
      <Link href="/" className="font-bold text-sm gradient-text">
        ⚡ Dev·Notes
      </Link>
      <div className="flex gap-5 text-xs text-text-muted">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-purple transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: 创建统计栏组件**

创建 `components/layout/stats-bar.tsx`：

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { CheckinRecord, StreakState } from '@/types'

interface StatsBarProps {
  totalArticles: number
}

export function StatsBar({ totalArticles }: StatsBarProps) {
  const [streak, setStreak] = useState<StreakState>({ count: 0, last_date: '', longest: 0 })
  const [record, setRecord] = useState<CheckinRecord>({ checked: false, study_seconds: 0, articles_read: [] })

  useEffect(() => {
    fetch('/api/checkin')
      .then((r) => r.json())
      .then((data) => {
        setStreak(data.streak)
        setRecord(data.record)
      })
  }, [])

  const hours = (record.study_seconds / 3600).toFixed(1)
  const completedCount = record.articles_read.length
  const monthProgress = totalArticles > 0 ? Math.round((completedCount / totalArticles) * 100) : 0

  return (
    <div className="bg-gradient-nav border-b border-border-purple px-6 py-2.5 flex gap-5 items-center text-xs">
      <StatItem icon="🔥" value={streak.count} label="连续天数" color="text-yellow-accent" />
      <div className="w-px h-5 bg-border-purple" />
      <StatItem icon="⏱" value={`${hours}h`} label="今日学习" color="text-green-accent" />
      <div className="w-px h-5 bg-border-purple" />
      <StatItem icon="✅" value={completedCount} label="已学文章" color="text-purple" />
      <div className="ml-auto flex items-center gap-2">
        <span className="text-text-muted">本月</span>
        <div className="w-20 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full progress-bar rounded-full transition-all" style={{ width: `${monthProgress}%` }} />
        </div>
        <span className="text-purple">{monthProgress}%</span>
      </div>
    </div>
  )
}

function StatItem({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base">{icon}</span>
      <div>
        <div className={`text-sm font-bold leading-none ${color}`}>{value}</div>
        <div className="text-text-muted text-[10px] mt-0.5">{label}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建博客布局**

创建 `app/(blog)/layout.tsx`：

```typescript
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
```

- [ ] **Step 4: 提交**

```bash
git add components/layout/ app/\(blog\)/layout.tsx
git commit -m "feat: add nav, stats-bar, and blog layout"
```

---

## Task 7: 文章卡片 + 首页

**Files:**
- Create: `components/article/article-card.tsx`
- Create: `app/(blog)/page.tsx`

- [ ] **Step 1: 创建文章卡片组件**

创建 `components/article/article-card.tsx`：

```typescript
import Link from 'next/link'
import type { ArticleMeta, ArticleProgress } from '@/types'

interface ArticleCardProps {
  article: ArticleMeta
  progress?: ArticleProgress | null
}

const TAG_COLORS: Record<string, string> = {
  TypeScript: 'text-blue-accent bg-blue-accent/10',
  React: 'text-orange-400 bg-orange-400/10',
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
```

- [ ] **Step 2: 创建首页**

创建 `app/(blog)/page.tsx`：

```typescript
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
      {/* Main: article list */}
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

      {/* Sidebar */}
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
```

- [ ] **Step 3: 启动开发服务器检查首页**

```bash
npm run dev
```

打开 http://localhost:3000，确认：
- 深色背景，紫色渐变 Logo
- 统计栏显示（数值为 0 是正常的）
- 文章列表显示空状态提示
- 侧边标签和 Agent 快捷入口显示

- [ ] **Step 4: 提交**

```bash
git add components/article/article-card.tsx app/\(blog\)/page.tsx
git commit -m "feat: add article card and home page"
```

---

## Task 8: 打卡按钮 + 学习计时器

**Files:**
- Create: `components/article/checkin-button.tsx`
- Create: `components/article/reading-timer.tsx`

- [ ] **Step 1: 创建打卡按钮**

创建 `components/article/checkin-button.tsx`：

```typescript
'use client'

import { useState } from 'react'

interface CheckinButtonProps {
  slug: string
  isCompleted: boolean
}

export function CheckinButton({ slug, isCompleted: initialCompleted }: CheckinButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)

  async function handleCheckin() {
    if (completed || loading) return
    setLoading(true)
    await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'article', slug }),
    })
    setCompleted(true)
    setLoading(false)
  }

  if (completed) {
    return (
      <div className="flex items-center gap-2 text-green-accent text-sm font-semibold">
        <span className="text-xl">✅</span>
        已标记为已学习
      </div>
    )
  }

  return (
    <button
      onClick={handleCheckin}
      disabled={loading}
      className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white progress-bar disabled:opacity-50 transition-opacity hover:opacity-90"
    >
      {loading ? '记录中...' : '✅ 标记已学习'}
    </button>
  )
}
```

- [ ] **Step 2: 创建计时器组件**

创建 `components/article/reading-timer.tsx`：

```typescript
'use client'

import { useEffect, useRef } from 'react'

interface ReadingTimerProps {
  slug: string
}

export function ReadingTimer({ slug }: ReadingTimerProps) {
  const startRef = useRef<number>(Date.now())
  const accumulatedRef = useRef<number>(0)
  const isActiveRef = useRef<boolean>(true)
  const FLUSH_INTERVAL = 30

  useEffect(() => {
    startRef.current = Date.now()
    isActiveRef.current = true

    function handleVisibilityChange() {
      if (document.hidden) {
        accumulatedRef.current += Math.floor((Date.now() - startRef.current) / 1000)
        isActiveRef.current = false
      } else {
        startRef.current = Date.now()
        isActiveRef.current = true
      }
    }

    async function flush() {
      let seconds = accumulatedRef.current
      if (isActiveRef.current) {
        seconds += Math.floor((Date.now() - startRef.current) / 1000)
        startRef.current = Date.now()
        accumulatedRef.current = 0
      }
      if (seconds < 5) return
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'study', seconds }),
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    const interval = setInterval(flush, FLUSH_INTERVAL * 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
      flush()
    }
  }, [slug])

  return null
}
```

- [ ] **Step 3: 提交**

```bash
git add components/article/checkin-button.tsx components/article/reading-timer.tsx
git commit -m "feat: add article check-in button and reading timer"
```

---

## Task 9: 文章详情页（MDX 渲染 + 目录）

**Files:**
- Create: `components/article/article-reader.tsx`
- Modify: `app/(blog)/[slug]/page.tsx`

- [ ] **Step 1: 创建文章阅读器组件**

创建 `components/article/article-reader.tsx`：

```typescript
'use client'

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'

interface ArticleReaderProps {
  source: MDXRemoteSerializeResult
}

const components = {
  h2: (props: React.HTMLProps<HTMLHeadingElement>) => (
    <h2 className="text-lg font-bold text-text-primary mt-8 mb-3 border-b border-border pb-2" {...props} />
  ),
  h3: (props: React.HTMLProps<HTMLHeadingElement>) => (
    <h3 className="text-base font-semibold text-text-secondary mt-6 mb-2" {...props} />
  ),
  p: (props: React.HTMLProps<HTMLParagraphElement>) => (
    <p className="text-sm text-text-secondary leading-7 mb-4" {...props} />
  ),
  code: (props: React.HTMLProps<HTMLElement>) => (
    <code className="font-mono text-xs bg-bg-tertiary text-purple px-1 py-0.5 rounded" {...props} />
  ),
  pre: (props: React.HTMLProps<HTMLPreElement>) => (
    <pre className="bg-bg-secondary border border-border rounded-lg p-4 overflow-x-auto text-xs leading-relaxed mb-4" {...props} />
  ),
  ul: (props: React.HTMLProps<HTMLUListElement>) => (
    <ul className="text-sm text-text-secondary leading-7 mb-4 list-disc list-inside" {...props} />
  ),
}

export function ArticleReader({ source }: ArticleReaderProps) {
  return (
    <article className="prose max-w-none">
      <MDXRemote {...source} components={components} />
    </article>
  )
}
```

- [ ] **Step 2: 创建文章详情页**

创建 `app/(blog)/[slug]/page.tsx`：

```typescript
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

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug)
  if (!article) notFound()

  const [mdxSource, progress] = await Promise.all([
    serialize(article.content),
    getArticleProgress(params.slug),
  ])

  const isCompleted = progress?.completed ?? false

  return (
    <div className="flex min-h-screen">
      {/* Reading progress indicator */}
      <ReadingTimer slug={params.slug} />

      {/* Main content */}
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
          <CheckinButton slug={params.slug} isCompleted={isCompleted} />
        </div>
      </div>

      {/* TOC sidebar */}
      <div className="w-44 border-l border-border-purple/20 px-4 py-6 hidden lg:block">
        <div className="text-[10px] text-text-muted uppercase tracking-widest mb-3">目录</div>
        <div className="text-[10px] text-text-muted">自动从标题生成</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 启动验证文章页**

```bash
npm run dev
```

访问 http://localhost:3000/typescript-advanced-types，确认：
- 文章标题、日期、标签正确渲染
- MDX 内容含代码块正确显示
- 打卡按钮显示在底部

- [ ] **Step 4: 提交**

```bash
git add components/article/article-reader.tsx app/\(blog\)/\[slug\]/page.tsx
git commit -m "feat: add article detail page with MDX rendering"
```

---

## Task 10: 打卡统计页

**Files:**
- Create: `components/checkin/streak-card.tsx`
- Create: `components/checkin/stats-card.tsx`
- Create: `components/checkin/heatmap-calendar.tsx`
- Create: `app/(blog)/checkin/page.tsx`

- [ ] **Step 1: 创建 StreakCard**

创建 `components/checkin/streak-card.tsx`：

```typescript
'use client'

import { useState, useEffect } from 'react'
import type { StreakState } from '@/types'

export function StreakCard() {
  const [streak, setStreak] = useState<StreakState>({ count: 0, last_date: '', longest: 0 })
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/checkin')
      .then((r) => r.json())
      .then((d) => {
        setStreak(d.streak)
        setChecked(d.record.checked)
      })
  }, [])

  async function handleCheckin() {
    setLoading(true)
    await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin' }),
    })
    setChecked(true)
    setStreak((s) => ({ ...s, count: s.count + (checked ? 0 : 1) }))
    setLoading(false)
  }

  return (
    <div className="bg-bg-secondary border border-green-accent/20 rounded-xl p-4 flex justify-between items-center">
      <div>
        <div className="text-sm font-semibold text-text-primary mb-1">今日打卡</div>
        <div className="text-xs text-text-muted">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <button
        onClick={handleCheckin}
        disabled={checked || loading}
        className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all ${
          checked
            ? 'bg-green-accent/20 text-green-accent border border-green-accent/30 cursor-default'
            : 'progress-bar hover:opacity-90'
        }`}
      >
        {checked ? '🔥 已打卡' : loading ? '打卡中...' : '打卡'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 创建 StatsCard**

创建 `components/checkin/stats-card.tsx`：

```typescript
interface StatsCardProps {
  value: string | number
  label: string
  sub?: string
  color: string
}

export function StatsCard({ value, label, sub, color }: StatsCardProps) {
  return (
    <div className="flex-1 bg-bg-secondary border border-border rounded-xl p-4 text-center">
      <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-text-muted mt-1">{label}</div>
      {sub && <div className="text-[9px] text-border mt-1">{sub}</div>}
    </div>
  )
}
```

- [ ] **Step 3: 创建热力图日历**

创建 `components/checkin/heatmap-calendar.tsx`：

```typescript
'use client'

import { useEffect, useState } from 'react'

const LEVELS = [
  '#21262d',
  'rgba(52,211,153,0.2)',
  'rgba(52,211,153,0.5)',
  'rgba(52,211,153,0.85)',
]

export function HeatmapCalendar() {
  const [days, setDays] = useState<{ day: number; level: number }[]>([])

  useEffect(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    // In real impl: fetch each day's checkin. For now, generate sample data.
    const result = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      level: i < now.getDate() ? Math.floor(Math.random() * 4) : 0,
    }))
    setDays(result)
  }, [])

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-3">本月打卡日历</div>
      <div className="flex flex-wrap gap-1">
        {days.map(({ day, level }) => (
          <div
            key={day}
            title={`${day}日`}
            className="w-6 h-6 rounded flex items-center justify-center text-[9px] text-text-muted cursor-default"
            style={{ background: LEVELS[level] }}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[9px] text-text-muted">少</span>
        {LEVELS.map((color, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: color }} />
        ))}
        <span className="text-[9px] text-text-muted">多</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建打卡页**

创建 `app/(blog)/checkin/page.tsx`：

```typescript
import { StreakCard } from '@/components/checkin/streak-card'
import { StatsCard } from '@/components/checkin/stats-card'
import { HeatmapCalendar } from '@/components/checkin/heatmap-calendar'
import { getStreak, getCheckinRecord, getTodayKey } from '@/lib/checkin'
import { getAllArticles } from '@/lib/content'

export default async function CheckinPage() {
  const today = getTodayKey()
  const [streak, record, articles] = await Promise.all([
    getStreak(today),
    getCheckinRecord(today),
    getAllArticles(),
  ])

  const hours = (record.study_seconds / 3600).toFixed(1)

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5">
      <StreakCard />

      <div className="flex gap-3">
        <StatsCard
          value={streak.count}
          label="当前连续天数 🔥"
          sub={`历史最长 ${streak.longest} 天`}
          color="text-yellow-accent"
        />
        <StatsCard
          value={`${hours}h`}
          label="本月学习时长"
          sub="今日累计"
          color="text-green-accent"
        />
        <StatsCard
          value={record.articles_read.length}
          label="已完成文章"
          sub={`共 ${articles.length} 篇`}
          color="text-purple"
        />
      </div>

      <HeatmapCalendar />
    </div>
  )
}
```

- [ ] **Step 5: 验证打卡页**

```bash
npm run dev
```

访问 http://localhost:3000/checkin，确认：
- 打卡按钮可点击，点击后变为"已打卡"
- 三个统计卡片正确显示
- 热力图日历渲染

- [ ] **Step 6: 运行全部测试**

```bash
npx vitest run
```

Expected: 全部 PASS

- [ ] **Step 7: 提交**

```bash
git add components/checkin/ app/\(blog\)/checkin/page.tsx
git commit -m "feat: add check-in stats page with streak, stats cards, and heatmap"
```

---

## Task 11: 部署到 Vercel

**Files:**
- Create: `.gitignore`
- Create: `vercel.json`

- [ ] **Step 1: 更新 .gitignore**

确认 `.gitignore` 包含：

```
.env.local
.superpowers/
.next/
node_modules/
```

- [ ] **Step 2: 创建 Vercel 配置**

创建 `vercel.json`：

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

- [ ] **Step 3: 推送并部署**

```bash
git add .gitignore vercel.json
git commit -m "chore: add deployment config"
git push origin main
```

然后在 Vercel Dashboard：
1. 导入 GitHub 仓库
2. 在 Settings → Environment Variables 添加：
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. 在 Storage 绑定 Vercel KV 数据库
4. 点击 Deploy

- [ ] **Step 4: 验证线上部署**

访问 Vercel 分配的域名，确认：
- 首页加载正常
- 打卡 API 返回 200（KV 连接正常）
- 文章详情页渲染正确

---

## Plan A 完成标准

- [ ] 首页显示文章列表（含进度）和标签过滤
- [ ] 文章详情页 MDX 渲染正常，打卡按钮可用
- [ ] 学习时长自动计时并上报
- [ ] 打卡页 Streak / 统计卡 / 热力图正确显示
- [ ] 所有单元测试通过（`npx vitest run`）
- [ ] 成功部署到 Vercel
