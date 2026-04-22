interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[60%] bg-purple/15 border border-border-purple/30 rounded-xl px-3 py-2 text-xs text-text-secondary leading-relaxed">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full progress-bar flex items-center justify-center text-[10px] shrink-0 mt-0.5">
        🤖
      </div>
      <div className="max-w-[80%] bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}
