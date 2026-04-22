import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { searchWeb, saveArticle } from '@/lib/tools/search'
import { updateMemory } from '@/lib/tools/memory'
import { getAllArticles } from '@/lib/content'
import type { ModelId } from '@/types'

export async function runSearchAgent(query: string, modelId: ModelId = 'qwen-max'): Promise<string> {
  const { text } = await generateText({
    model: getModel(modelId),
    stopWhen: stepCountIs(4),
    tools: {
      search_web: tool({
        description: '搜索网页获取最新技术资料',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query: q }) => {
          const results = await searchWeb(q)
          return results.map((r) => `## ${r.title}\n${r.content}\n来源: ${r.url}`).join('\n\n')
        },
      }),
      save_article: tool({
        description: '将整理好的内容保存为博客文章',
        inputSchema: z.object({
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
