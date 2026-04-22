'use client'

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'

interface ArticleReaderProps {
  source: MDXRemoteSerializeResult
}

const components = {
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-lg font-bold text-text-primary mt-8 mb-3 border-b border-border pb-2" {...props} />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-base font-semibold text-text-secondary mt-6 mb-2" {...props} />
  ),
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="text-sm text-text-secondary leading-7 mb-4" {...props} />
  ),
  code: (props: React.ComponentPropsWithoutRef<'code'>) => (
    <code className="font-mono text-xs bg-bg-tertiary text-purple px-1 py-0.5 rounded" {...props} />
  ),
  pre: (props: React.ComponentPropsWithoutRef<'pre'>) => (
    <pre className="bg-bg-secondary border border-border rounded-lg p-4 overflow-x-auto text-xs leading-relaxed mb-4" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="text-sm text-text-secondary leading-7 mb-4 list-disc list-inside" {...props} />
  ),
}

export function ArticleReader({ source }: ArticleReaderProps) {
  return (
    <article className="prose max-w-none">
      <MDXRemote {...source} components={components} />
    </article>
  )
}
