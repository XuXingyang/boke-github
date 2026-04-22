import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { checkMemory } from '@/lib/tools/memory'
import { runSearchAgent } from './search-agent'
import { runManageAgent } from './manage-agent'
import type { ModelId } from '@/types'

export function createOrchestratorStream(message: string, modelId: ModelId = 'qwen-max') {
  return streamText({
    model: getModel(modelId),
    stopWhen: stepCountIs(6),
    tools: {
      check_memory: tool({
        description: '搜索前先查询记忆库，看是否已有相关文章',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const result = await checkMemory(query, modelId)
          if (result) {
            return `已有相关文章：《${result.title}》，slug: ${result.slug}。建议直接查看已有内容，避免重复搜索。`
          }
          return '记忆库中未找到相关内容，可以继续搜索。'
        },
      }),
      search_agent: tool({
        description: '调用搜索 Agent：搜索网页并整理保存为文章',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => runSearchAgent(query, modelId),
      }),
      manage_agent: tool({
        description: '调用管理 Agent：整理、搜索、分类已有博客文章',
        inputSchema: z.object({ instruction: z.string() }),
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
