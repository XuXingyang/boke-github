import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import JSZip from 'jszip'

const CONTENT_DIR = process.env.VERCEL
  ? path.join('/tmp', 'content', 'imports')
  : path.join(process.cwd(), 'content', 'imports')

export interface ParsedFile {
  name: string
  content: string
}

export interface ImportResult {
  imported: number
  failed: number
  errors: string[]
}

export async function importMarkdownFiles(files: ParsedFile[]): Promise<ImportResult> {
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true })

  let imported = 0
  let failed = 0
  const errors: string[] = []

  for (const file of files) {
    try {
      const { data, content } = matter(file.content)
      const slug = data.slug || file.name.replace(/\.mdx?$/, '')
      const date = data.date ? String(data.date).slice(0, 10) : new Date().toISOString().slice(0, 10)

      const frontmatter = {
        title: data.title || slug,
        slug,
        date,
        tags: data.tags ?? [],
        keywords: data.keywords ?? [],
        summary: data.summary ?? '',
        source: 'import',
        read_time: data.read_time ?? Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
      }

      const output = matter.stringify(content, frontmatter)
      fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), output, 'utf-8')
      imported++
    } catch (e) {
      failed++
      errors.push(`${file.name}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return { imported, failed, errors }
}

export async function parseNotionZip(buffer: Buffer): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(buffer)
  const files: ParsedFile[] = []

  for (const [name, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir || !name.endsWith('.md')) continue
    const content = await zipEntry.async('string')
    files.push({ name: path.basename(name), content: content.replace(/<[^>]+>/g, '') })
  }

  return files
}

export async function parseObsidianZip(buffer: Buffer): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(buffer)
  const files: ParsedFile[] = []

  for (const [name, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir || !name.endsWith('.md')) continue
    let content = await zipEntry.async('string')
    const wikilinks: string[] = []
    content = content.replace(/\[\[([^\]]+)\]\]/g, (_, link) => {
      wikilinks.push(link)
      return `\`${link}\``
    })
    if (!content.startsWith('---') && wikilinks.length > 0) {
      content = matter.stringify(content, { tags: wikilinks.slice(0, 5) })
    }
    files.push({ name: path.basename(name), content })
  }

  return files
}
