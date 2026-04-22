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
    stopWhen: stepCountIs(4),
    tools: {
      check_memory: tool({
        description: '搜索前先查询记忆库，看是否已有相关文章',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const result = await checkMemory(query, modelId)
          if (result) return `已有相关文章：《${result.title}》，slug: ${result.slug}，无需重复搜索。`
          return '记忆库中未找到相关内容，可以继续搜索。'
        },
      }),
      search_web: tool({
        description: '搜索网页，返回原始内容供整理',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const results = await searchWeb(query, 5)
          if (results.length === 0) return '未找到相关内容'
          return results.map((r, i) =>
            `### 来源 ${i + 1}：${r.title}\n${r.content.slice(0, 800)}\n链接：${r.url}`
          ).join('\n\n---\n\n')
        },
      }),
      save_article: tool({
        description: '将整理好的 Markdown 文章保存到博客',
        inputSchema: z.object({
          title: z.string().describe('文章标题'),
          content: z.string().describe('完整的 Markdown 文章内容，包含引言、正文、总结'),
          tags: z.array(z.string()).describe('标签列表'),
          keywords: z.array(z.string()).describe('关键词列表'),
          summary: z.string().describe('一句话摘要（不超过50字）'),
        }),
        execute: async (input) => {
          const slug = await saveArticle(input)
          const articles = await getAllArticles()
          const article = articles.find(a => a.slug === slug)
          if (article) await updateMemory(article)
          return `✅ 文章《${input.title}》已保存，slug: ${slug}`
        },
      }),
      list_articles: tool({
        description: '列出博客已有文章',
        inputSchema: z.object({ tag: z.string().optional() }),
        execute: async ({ tag }) => {
          const articles = await listArticles(tag ? { tag } : undefined)
          if (articles.length === 0) return '暂无文章'
          return articles.map(a => `- ${a.slug}: ${a.title} [${a.tags.join(', ')}]`).join('\n')
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
    system: `你是个人技术博客的 AI 助手，帮助用户搜索整理技术内容。

工作流程：
1. 纯搜索请求（"搜索xxx"、"查一下xxx"）→ check_memory 查是否已有 → 未命中则 search_web 获取内容 → 直接把搜索结果摘要展示给用户，不保存文件
2. 整理保存请求（"整理成文档"、"保存"、"记录下来"）→ search_web 获取内容 → 整理成结构化 Markdown（有引言、分节正文、代码示例、总结）→ 调用 save_article 保存
3. 管理类请求 → 用 list_articles 或 search_blog

重要规则：
- 没有明确要求保存时，绝对不调用 save_article
- 整理文章时必须生成完整高质量 Markdown，不直接粘贴原始内容
- 始终用中文回复`,
    prompt: message,
  })
}
