import { NextRequest, NextResponse } from 'next/server'
import { importMarkdownFiles, parseNotionZip, parseObsidianZip } from '@/lib/tools/import'
import { getAllArticles } from '@/lib/content'
import { rebuildIndex } from '@/lib/tools/memory'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const type = formData.get('type') as string
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let parsedFiles

  if (type === 'notion') {
    parsedFiles = await parseNotionZip(buffer)
  } else if (type === 'obsidian') {
    parsedFiles = await parseObsidianZip(buffer)
  } else {
    const content = buffer.toString('utf-8')
    parsedFiles = [{ name: file.name, content }]
  }

  const result = await importMarkdownFiles(parsedFiles)
  const articles = await getAllArticles()
  await rebuildIndex(articles)

  return NextResponse.json(result)
}
