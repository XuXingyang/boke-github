import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { listArticles, searchContent, generateSummary, updateFrontmatter } from '@/lib/tools/manage'
import { rebuildIndex } from '@/lib/tools/memory'
import { getAllArticles } from '@/lib/content'
import type { ModelId } from '@/types'

export async function runManageAgent(instruction: string, modelId: ModelId = 'qwen-max'): Promise<string> {
  const { text } = await generateText({
    model: getModel(modelId),
    stopWhen: stepCountIs(5),
    tools: {
      list_articles: tool({
        description: '列出博客文章，可按标签或来源过滤',
        inputSchema: z.object({
          tag: z.string().optional(),
          source: z.enum(['manual', 'agent_search', 'import']).optional(),
        }),
        execute: async (filter) => {
          const articles = await listArticles(filter)
          return articles.map((a) => `- ${a.slug}: ${a.title} [${a.tags.join(', ')}]`).join('\n') || '暂无文章'
        },
      }),
      search_content: tool({
        description: '在博客文章中搜索内容',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const results = await searchContent(query)
          return results.map((a) => `- ${a.slug}: ${a.title}`).join('\n') || '未找到相关文章'
        },
      }),
      generate_summary: tool({
        description: '为指定文章生成/更新摘要',
        inputSchema: z.object({ slug: z.string() }),
        execute: async ({ slug }) => {
          const summary = await generateSummary(slug)
          await updateFrontmatter(slug, { summary })
          return `已更新 ${slug} 的摘要：${summary}`
        },
      }),
      rebuild_index: tool({
        description: '重建记忆库文章索引（整理完成后调用）',
        inputSchema: z.object({}),
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
