'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ModelSelector } from './model-selector'
import { MessageBubble } from './message-bubble'
import { QuickActions } from './quick-actions'
import type { ModelId } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function ChatPanel() {
  const [modelId, setModelId] = useState<ModelId>('qwen-max')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const saved = localStorage.getItem('agent-model') as ModelId | null
    if (saved) setModelId(saved)
  }, [])

  function handleModelChange(id: ModelId) {
    setModelId(id)
    localStorage.setItem('agent-model', id)
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, modelId }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: '请求失败，请重试。' } : m))
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: '网络错误，请重试。' } : m))
      )
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, modelId])

  function handleQuickAction(prompt: string) {
    setInput(prompt)
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-purple/20 px-5 py-3 flex justify-between items-center">
        <div className="text-sm font-semibold text-purple">🤖 AI Agent</div>
        <ModelSelector value={modelId} onChange={handleModelChange} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-text-muted text-sm py-20">
            <div className="text-3xl mb-3">🤖</div>
            <p>你好！我可以帮你搜索技术内容、整理博客文章。</p>
            <p className="text-xs mt-1">试试下面的快捷操作，或直接输入你的需求。</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {isLoading && messages.at(-1)?.content === '' && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full progress-bar flex items-center justify-center text-[10px] shrink-0">🤖</div>
            <div className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-text-muted">
              思考中 <span className="animate-pulse">▌</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="border-t border-border-purple/10 px-5 py-2.5">
        <QuickActions onSelect={handleQuickAction} />
      </div>

      {/* Input */}
      <div className="border-t border-border-purple/20 px-5 py-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="输入你的需求... (Enter 发送，Shift+Enter 换行)"
          rows={1}
          className="flex-1 bg-bg-secondary border border-border-purple/25 rounded-lg px-3 py-2 text-xs text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-border-purple resize-none"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white progress-bar disabled:opacity-40 transition-opacity hover:opacity-90"
        >
          发送
        </button>
      </div>
    </div>
  )
}
