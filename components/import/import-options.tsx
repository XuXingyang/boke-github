'use client'

import { useState } from 'react'
import { DropZone } from './drop-zone'

type ImportType = 'markdown' | 'notion' | 'obsidian'

const OPTIONS: { type: ImportType; label: string; desc: string; accept: string; activeColor: string }[] = [
  { type: 'markdown', label: '📝 Markdown / MDX', desc: '.md .mdx 文件，保留 frontmatter', accept: '.md,.mdx', activeColor: 'border-purple/40 text-purple' },
  { type: 'notion', label: '🗒 Notion Export', desc: 'Notion 导出的 .zip 包', accept: '.zip', activeColor: 'border-yellow-accent/40 text-yellow-accent' },
  { type: 'obsidian', label: '🔮 Obsidian Vault', desc: 'Obsidian 仓库 .zip 包', accept: '.zip', activeColor: 'border-green-accent/40 text-green-accent' },
]

export function ImportOptions() {
  const [selected, setSelected] = useState<ImportType>('markdown')
  const [status, setStatus] = useState<{ imported?: number; failed?: number; errors?: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const currentOption = OPTIONS.find((o) => o.type === selected)!

  async function handleFiles(files: FileList) {
    setLoading(true)
    setStatus(null)
    try {
      const formData = new FormData()
      formData.append('type', selected)
      formData.append('file', files[0])
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ imported: 0, failed: 1, errors: ['网络错误，请重试'] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            onClick={() => setSelected(o.type)}
            className={`flex-1 bg-bg-secondary border rounded-xl p-3 text-left transition-all ${
              selected === o.type ? o.activeColor : 'border-border text-text-muted hover:border-border-purple/30'
            }`}
          >
            <div className="text-xs font-semibold mb-1">{o.label}</div>
            <div className="text-[10px] text-text-muted">{o.desc}</div>
          </button>
        ))}
      </div>

      <DropZone onFiles={handleFiles} accept={currentOption.accept} />

      {loading && <div className="text-center text-xs text-text-muted py-4">正在导入...</div>}

      {status && (
        <div className={`rounded-xl p-4 text-sm ${
          (status.failed ?? 0) === 0
            ? 'bg-green-accent/10 border border-green-accent/20 text-green-accent'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {(status.failed ?? 0) === 0 ? '✅' : '⚠️'} 成功导入 {status.imported} 篇
          {(status.failed ?? 0) > 0 && `，失败 ${status.failed} 篇`}
          {(status.errors?.length ?? 0) > 0 && (
            <div className="text-[10px] mt-2 text-text-muted">{status.errors!.join('; ')}</div>
          )}
        </div>
      )}
    </div>
  )
}
