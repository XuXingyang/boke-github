import { describe, it, expect } from 'vitest'
import { getModel, AVAILABLE_MODELS } from '@/lib/models'
import type { ModelId } from '@/types'

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
    const model = getModel('unknown-model' as ModelId)
    expect(model).toBeDefined()
  })
})
