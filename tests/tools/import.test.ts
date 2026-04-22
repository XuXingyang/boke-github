import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true),
  },
}))

import { importMarkdownFiles } from '@/lib/tools/import'

beforeEach(() => vi.clearAllMocks())

describe('import tools', () => {
  it('importMarkdownFiles processes .md files with frontmatter', async () => {
    const result = await importMarkdownFiles([
      {
        name: 'test.md',
        content: `---\ntitle: Test Article\nslug: test-article\n---\n\n# Hello`,
      },
    ])
    expect(result.imported).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('importMarkdownFiles generates slug from filename if missing', async () => {
    const result = await importMarkdownFiles([
      { name: 'my-article.md', content: '# My Article\n\nContent here.' },
    ])
    expect(result.imported).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('importMarkdownFiles counts failed files on error', async () => {
    const fs = (await import('fs')).default
    vi.mocked(fs.writeFileSync).mockImplementationOnce(() => { throw new Error('disk full') })
    const result = await importMarkdownFiles([
      { name: 'bad.md', content: '---\ntitle: Bad\nslug: bad\n---\n\ncontent' },
    ])
    expect(result.failed).toBe(1)
    expect(result.errors[0]).toContain('disk full')
  })
})
