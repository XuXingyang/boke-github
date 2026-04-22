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
