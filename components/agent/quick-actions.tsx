const ACTIONS = [
  { label: '🔍 搜索网页', prompt: '帮我搜索' },
  { label: '📂 整理文章', prompt: '帮我整理和分类现有的博客文章' },
  { label: '💡 今日推荐', prompt: '根据我还未学习的文章，推荐今天应该读哪篇' },
  { label: '📊 学习总结', prompt: '总结我最近的学习情况和文章内容' },
]

interface QuickActionsProps {
  onSelect: (prompt: string) => void
}

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => onSelect(a.prompt)}
          className="text-[10px] text-text-muted bg-bg-tertiary border border-border hover:border-border-purple hover:text-purple rounded px-2 py-1.5 transition-colors"
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
