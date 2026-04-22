'use client'

import { useState, useRef } from 'react'

interface DropZoneProps {
  onFiles: (files: FileList) => void
  accept: string
}

export function DropZone({ onFiles, accept }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
        dragging ? 'border-purple bg-purple/5' : 'border-border-purple/30 hover:border-border-purple/60'
      }`}
    >
      <div className="text-4xl mb-3">📁</div>
      <div className="text-sm text-text-secondary font-semibold mb-1">拖拽文件到这里，或点击选择</div>
      <div className="text-xs text-text-muted">{accept}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  )
}
