import { NextRequest } from 'next/server'
import { createOrchestratorStream } from '@/lib/agents/orchestrator'
import type { ModelId } from '@/types'

export async function POST(req: NextRequest) {
  const { message, modelId } = await req.json()

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400 })
  }

  const stream = createOrchestratorStream(message, (modelId as ModelId) ?? 'qwen-max')
  return stream.toTextStreamResponse()
}

export const runtime = 'nodejs'
export const maxDuration = 60
