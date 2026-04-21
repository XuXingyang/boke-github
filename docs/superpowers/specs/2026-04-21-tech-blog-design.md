# 个人技术博客 · 设计文档

**日期：** 2026-04-21  
**状态：** 已确认  

---

## 1. 项目概述

个人技术博客，内置多 Agent 系统，支持网页搜索整理内容、管理博客文章、学习打卡追踪。前端采用深色极客 + 紫蓝渐变混合风格，部署于 Vercel。

---

## 2. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 框架 | Next.js 15（App Router） |
| 部署 | Vercel（Streaming 模式） |
| Agent SDK | Vercel AI SDK |
| 文章存储 | Markdown 文件（Git 管理，`/content/`） |
| 学习数据 | Vercel KV（Redis） |
| 记忆库 | Vercel KV |
| 搜索服务 | Tavily API |
| AI 模型 | Qwen（默认）/ OpenAI / Claude（可切换） |

---

## 3. 目录结构

```
boke-github/
├── app/
│   ├── (blog)/
│   │   ├── page.tsx              # 首页 / 仪表盘
│   │   ├── [slug]/page.tsx       # 文章详情
│   │   ├── checkin/page.tsx      # 打卡 / 统计
│   │   └── import/page.tsx       # 导入工具
│   ├── agent/page.tsx            # Agent 全屏面板
│   └── api/
│       ├── agent/chat/route.ts   # Orchestrator（Streaming）
│       ├── agent/search/route.ts # 搜索 Agent
│       ├── agent/manage/route.ts # 管理 Agent
│       ├── checkin/route.ts      # 打卡 API
│       └── import/route.ts       # 导入 API
├── content/                      # Markdown 文章
│   ├── react/
│   ├── typescript/
│   └── notes/
├── lib/
│   ├── agents/
│   │   ├── orchestrator.ts       # 意图判断 + 路由
│   │   ├── search-agent.ts       # 网页搜索 Agent
│   │   └── manage-agent.ts       # 文章管理 Agent
│   ├── tools/
│   │   ├── search.ts             # tavily_search, save_article
│   │   ├── manage.ts             # list_articles, read_article, update_frontmatter, generate_summary
│   │   └── memory.ts             # check_memory, update_memory, rebuild_index, semantic_similarity
│   ├── models.ts                 # 多模型统一接口
│   ├── checkin.ts                # 打卡逻辑（streak、时长、文章标记）
│   └── content.ts                # Markdown 解析工具
├── components/
│   ├── layout/                   # Nav, StatsBar
│   ├── article/                  # ArticleCard, ArticleReader, CheckinButton
│   ├── agent/                    # ChatPanel, MessageBubble, ModelSelector, QuickActions
│   └── checkin/                  # StreakCard, HeatmapCalendar, StatsCard
└── public/
```

---

## 4. Multi-Agent 架构

### 4.1 Orchestrator Agent

**职责：** 接收用户消息，判断意图，路由到子 Agent，汇总结果流式返回。

**执行流程：**
1. 调用 `check_memory(query)` 查询记忆库
   - 命中（语义相似度 > 0.85）→ 直接返回已有文章链接，终止流程
   - 未命中 → 继续
2. 判断意图：`search`（网页搜索）/ `manage`（文章管理）/ `both`
3. 按意图调用对应子 Agent
4. 汇总结果，流式返回前端

### 4.2 搜索 Agent（Search Agent）

**职责：** 网页搜索 → AI 摘要 → 存为 Markdown → 更新记忆库

**工具调用链：**
```
tavily_search(query)
  → summarize(results)        // AI 提炼关键内容
  → save_article(markdown)    // 写入 /content/
  → update_memory(article)    // 更新记忆库索引
```

### 4.3 管理 Agent（Manage Agent）

**职责：** 读取本地文章 → 分类打标签 → 生成摘要 → 重建索引

**工具调用链：**
```
list_articles(filter?)
  → categorize(articles)           // AI 分类
  → update_frontmatter(slug, data) // 更新 frontmatter
  → generate_summary(slug)         // 生成/更新摘要
  → rebuild_index()                // 重建记忆库文章索引
```

### 4.4 记忆层（Memory Layer）

存储于 Vercel KV，持久化跨会话。

| Key | 内容 | 用途 |
|-----|------|------|
| `memory:search` | 搜索历史数组 | 去重判断 |
| `memory:index` | 文章索引（slug + title + keywords + summary） | 语义相似度计算 |

**去重逻辑：**
1. 关键词精确匹配 `memory:index`
2. 未匹配时，让 AI 对 query 与每篇文章 summary 做语义相似度打分
3. 相似度 > 0.85 视为已有内容，返回已有文章

### 4.5 工具函数清单

**搜索工具（`lib/tools/search.ts`）**
- `tavily_search(query: string): SearchResult[]`
- `save_article(content: string, meta: ArticleMeta): string`

**管理工具（`lib/tools/manage.ts`）**
- `list_articles(filter?: ArticleFilter): ArticleMeta[]`
- `read_article(slug: string): string`
- `update_frontmatter(slug: string, data: Partial<ArticleMeta>): void`
- `generate_summary(slug: string): string`
- `search_content(query: string): ArticleMeta[]`
- `import_markdown(files: File[]): ImportResult`

**记忆工具（`lib/tools/memory.ts`）**
- `check_memory(query: string): MemoryCheckResult`
- `update_memory(article: ArticleMeta): void`
- `rebuild_index(): void`
- `semantic_similarity(a: string, b: string): number`

### 4.6 多模型切换

`lib/models.ts` 统一接口，通过环境变量 + 前端选择器动态切换：

```typescript
// Qwen 通过 OpenAI 兼容接口接入
const qwen = createOpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY,
});

const modelMap = {
  'qwen-max':      qwen('qwen-max'),
  'gpt-4o':        openai('gpt-4o'),
  'claude-sonnet': anthropic('claude-sonnet-4-6'),
};
```

---

## 5. 数据模型

### 5.1 文章 Frontmatter

```yaml
---
title: "文章标题"
slug: article-slug
date: 2026-04-18
tags: [React, Frontend]
keywords: [并发, Actions, use()]
summary: "一句话摘要"
source: manual | agent_search | import
read_time: 8   # 分钟
---
```

### 5.2 Vercel KV Schema

**打卡记录**
```
key: "checkin:YYYY-MM-DD"
value: {
  checked: boolean,
  study_seconds: number,
  articles_read: string[]   // slug 数组
}
```

**Streak 状态**
```
key: "streak:current"
value: {
  count: number,
  last_date: string,   // YYYY-MM-DD
  longest: number
}
```

**文章学习进度**
```
key: "article:{slug}"
value: {
  completed: boolean,
  progress: number,    // 0-100
  date: string         // 完成日期
}
```

**搜索记忆**
```
key: "memory:search"
value: Array<{
  query: string,
  article_slug: string,
  at: number           // Unix timestamp
}>
```

**文章索引（记忆去重）**
```
key: "memory:index"
value: Array<{
  slug: string,
  title: string,
  keywords: string[],
  summary: string
}>
```

---

## 6. 前端页面

### 6.1 视觉风格

深色极客（GitHub Dark 底色）+ 紫蓝渐变点缀（边框发光、渐变进度条、标题渐变）。主色调：`#0d1117` 底色，`#a78bfa` 紫色主调，`#60a5fa` 蓝色辅助。

### 6.2 页面清单

| 路由 | 页面 | 核心功能 |
|------|------|----------|
| `/` | 首页/仪表盘 | 统计栏、文章列表（含进度）、Agent 侧边快捷入口 |
| `/[slug]` | 文章详情 | MDX 渲染、阅读进度条、目录、打卡按钮 |
| `/agent` | Agent 面板 | 对话界面、流式输出、模型切换器、快捷操作 |
| `/checkin` | 打卡/统计 | 今日打卡、Streak、月历热力图、时长统计 |
| `/import` | 导入工具 | 拖拽上传、支持 MD/Notion/Obsidian |

### 6.3 统计栏（全局常驻）

首页顶部固定展示：当前 Streak 🔥 / 今日学习时长 ⏱ / 已完成文章数 ✅ / 本月进度条。

---

## 7. 学习打卡系统

### 7.1 每日签到
- 每天首次访问自动弹出打卡提示，或手动点击打卡
- 记录日期到 `checkin:YYYY-MM-DD`
- 更新 `streak:current`：若与 `last_date` 连续则 `count+1`，否则重置为 1

### 7.2 文章打卡
- 文章详情页底部"标记已学习"按钮
- 点击后写入 `article:{slug}.completed = true`，并追加到当天 `checkin.articles_read`

### 7.3 学习时长
- 文章详情页进入时开始计时，离开/切换 Tab 时暂停
- 累计时长写入 `checkin:YYYY-MM-DD.study_seconds`

---

## 8. 导入功能

| 来源 | 处理方式 |
|------|----------|
| `.md` / `.mdx` | 直接解析，保留原有 frontmatter，补充缺失字段 |
| Notion Export `.zip` | 解压 → 转换 Notion 格式 → 重建 frontmatter |
| Obsidian Vault | 解析双链 `[[...]]` → 转为标签，保留目录结构 |

导入后自动触发 `rebuild_index()` 更新记忆库。

---

## 9. 部署配置

**环境变量（Vercel）**
```
DASHSCOPE_API_KEY=      # Qwen
OPENAI_API_KEY=         # OpenAI
ANTHROPIC_API_KEY=      # Claude
TAVILY_API_KEY=         # 网页搜索
KV_REST_API_URL=        # Vercel KV
KV_REST_API_TOKEN=      # Vercel KV
```

**`.gitignore` 补充**
```
.env.local
.superpowers/
```

---

## 10. 开发优先级

1. **P0（核心链路）：** Next.js 项目初始化 + 文章列表/详情渲染 + Vercel KV 打卡 API + 基础打卡 UI
2. **P1（Agent 核心）：** Orchestrator + 搜索 Agent（Tavily + 保存）+ 记忆层去重
3. **P2（完善功能）：** 管理 Agent + 多模型切换 + 导入工具
4. **P3（体验提升）：** 热力图日历 + 阅读进度 + Streak 动画
