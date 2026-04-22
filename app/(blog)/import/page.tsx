import { ImportOptions } from '@/components/import/import-options'

export default function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary mb-1">📥 导入文章</h1>
        <p className="text-xs text-text-muted">支持 Markdown、Notion Export、Obsidian Vault 导入</p>
      </div>
      <ImportOptions />
    </div>
  )
}
