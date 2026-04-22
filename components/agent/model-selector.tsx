'use client'

import { AVAILABLE_MODELS } from '@/lib/models'
import type { ModelId } from '@/types'

interface ModelSelectorProps {
  value: ModelId
  onChange: (id: ModelId) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted">模型：</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModelId)}
        className="bg-bg-secondary border border-border-purple/30 text-purple rounded px-2 py-1 text-[10px] cursor-pointer focus:outline-none focus:border-border-purple"
      >
        {AVAILABLE_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}
