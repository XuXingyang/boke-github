import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { checkMemory, updateMemory } from '@/lib/tools/memory'
import { searchWeb, saveArticle } from '@/lib/tools/search'
import { listArticles, searchContent } from '@/lib/tools/manage'
import { getAllArticles } from '@/lib/content'
import type { ModelId } from '@/types'

export function createOrchestratorStream(message: string, modelId: ModelId = 'qwen-max') {
  return streamText({
    model: getModel(modelId),
    stopWhen: stepCountIs(3),   // 最多 3 步，避免超时
    tools: {
      check_memory: tool({
        description: '搜索前先查询记忆库，看是否已有相关文章',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const result = await checkMemory(query, modelId)
          if (result) return `已有相关文章：《${result.title}》，slug: ${result.slug}，无需重复搜索。`
          return '记忆库中未找到相关内容。'
        },
      }),
      search_and_save: tool({
        description: '搜索网页内容并保存为博客文章（一步完成）',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const results = await searchWeb(query, 3)
          if (results.length === 0) return '未找到相关内容'
          const top = results.slice(0, 2)
          const content = `## 概述\n\n${top[0].content.slice(0, 500)}\n\n## 参考资料\n\n${top.map(r => `- [${r.title}](${r.url})`).join('\n')}`
          const slug = await saveArticle({
            title: query,
            content,
            tags: [],
            keywords: [query],
            summary: top[0].content.slice(0, 100),
          })
          const articles = await getAllArticles()
          const article = articles.find(a => a.slug === slug)
          if (article) await updateMemory(article)
          return `已搜索并保存文章，slug: ${slug}`
        },
      }),
      list_articles: tool({
        description: '列出博客已有文章',
        inputSchema: z.object({ tag: z.string().optional() }),
        execute: async ({ tag }) => {
          const articles = await listArticles(tag ? { tag } : undefined)
          if (articles.length === 0) return '暂无文章'
          return articles.map(a => `- ${a.slug}: ${a.title}`).join('\n')
        },
      }),
      search_blog: tool({
        description: '在已有博客文章中搜索',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const results = await searchContent(query)
          if (results.length === 0) return '未找到相关文章'
          return results.map(a => `- ${a.slug}: ${a.title}`).join('\n')
        },
      }),
    },
    system: `你是个人技术博客的 AI 助手。
规则：
- 搜索类 → 先 check_memory，未命中再用 search_and_save（一步完成搜索+保存）
- 管理类 → 用 list_articles 或 search_blog
- 始终用中文回复，回答要简洁`,
    prompt: message,
  })
}
