import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'
import { Fragment, cache, createElement } from 'react'
import { createCompiler } from '@fumadocs/mdx-remote'
import type { PageTree, TableOfContents } from 'fumadocs-core/server'
import Link from 'fumadocs-core/link'
import defaultMdxComponents from 'fumadocs-ui/mdx'

export type PackageDocLanguage = 'default' | 'zh'

export type PackageDocItem = {
  slug: string
  packageDir: string
  packageName: string
}

export type PackageDocListEntry = PackageDocItem & {
  title: string
  summary: string
  hasChineseReadme: boolean
  hasEnglishReadme: boolean
  defaultSourceFileName: string
  defaultUrl: string
}

export type PackageDocFooterItem = Pick<PageTree.Item, 'name' | 'description' | 'url'>

export type PackageDocEntry = PackageDocListEntry & {
  language: PackageDocLanguage
  markdown: string
  sourceFileName: string
  sourcePath: string
  sourceRepoPath: string
  url: string
  chineseUrl: string | null
  toc: TableOfContents
  content: ReactNode
  footer: {
    previous?: PackageDocFooterItem
    next?: PackageDocFooterItem
  }
}

const PACKAGE_DOCS: PackageDocItem[] = [
  // The docs nav mirrors the supported package surface on pipto.henryge.com:
  // the umbrella entry package plus the five public companion packages.
  {
    slug: 'pipto',
    packageDir: 'pipto',
    packageName: '@henryge/pipto'
  },
  {
    slug: 'json2pptx-schema',
    packageDir: 'json2pptx-schema',
    packageName: 'json2pptx-schema'
  },
  {
    slug: 'json2pptx',
    packageDir: 'json2pptx',
    packageName: 'json2pptx'
  },
  {
    slug: 'pptx2json',
    packageDir: 'pptx2json',
    packageName: 'ppt2json'
  },
  {
    slug: 'pptx-custom',
    packageDir: 'pptx-custom',
    packageName: 'pptx-custom'
  },
  {
    slug: 'pptx-previewer',
    packageDir: 'pptx-previewer',
    packageName: 'pptx-previewer'
  }
]

const compiler = createCompiler({
  preset: 'fumadocs',
  remarkImageOptions: {
    useImport: false,
    external: false
  }
})

const REPO_ROOT = path.resolve(process.cwd(), '..', '..')

async function fileExists (filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function stripMarkdown (value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle (markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? stripMarkdown(match[1]) : fallback
}

function extractSummary (markdown: string): string {
  const lines = markdown.split('\n')
  let inCodeBlock = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock || line.length === 0) continue
    if (
      line.startsWith('#') ||
      line.startsWith('- ') ||
      line.startsWith('* ') ||
      /^\d+\.\s/.test(line)
    ) {
      continue
    }
    return stripMarkdown(line)
  }

  return ''
}

function getDefaultDocUrl (slug: string) {
  return slug === 'pipto' ? '/docs' : `/docs/${slug}`
}

function getDocUrl (slug: string, language: PackageDocLanguage = 'default') {
  if (language === 'default') {
    return getDefaultDocUrl(slug)
  }

  return slug === 'pipto' ? '/docs/zh' : `/docs/${slug}/zh`
}

function supportsChineseToggle (doc: Pick<PackageDocListEntry, 'hasChineseReadme'>) {
  return doc.hasChineseReadme
}

function getChineseUrl (doc: Pick<PackageDocListEntry, 'slug' | 'hasChineseReadme'>) {
  return supportsChineseToggle(doc) ? getDocUrl(doc.slug, 'zh') : null
}

function trimDocIntro (markdown: string, summary: string) {
  const lines = markdown.split('\n')
  let start = 0

  while (start < lines.length && lines[start]?.trim() === '') start += 1

  if (/^#\s+/.test(lines[start] ?? '')) {
    start += 1
  }

  while (start < lines.length && lines[start]?.trim() === '') start += 1

  if (summary) {
    let end = start

    while (end < lines.length && lines[end]?.trim() !== '') {
      end += 1
    }

    const leadParagraph = lines.slice(start, end).join(' ')
    if (stripMarkdown(leadParagraph) === summary) {
      start = end
    }
  }

  while (start < lines.length && lines[start]?.trim() === '') start += 1

  return lines.slice(start).join('\n')
}

async function resolveReadmePaths (packageDir: string) {
  const baseDir = path.join(REPO_ROOT, 'packages', packageDir)
  const zhPath = path.join(baseDir, 'README.zh-CN.md')
  const defaultPath = path.join(baseDir, 'README.md')
  const hasChineseReadme = await fileExists(zhPath)
  const hasEnglishReadme = await fileExists(defaultPath)

  return {
    baseDir,
    zhPath,
    defaultPath,
    hasChineseReadme,
    hasEnglishReadme
  }
}

function getDocSequence (
  docs: PackageDocListEntry[],
  language: PackageDocLanguage
): PackageDocFooterItem[] {
  return docs
    .filter((doc) => language === 'default' || supportsChineseToggle(doc))
    .map((doc) => ({
      name: doc.packageName,
      description: doc.summary,
      url: language === 'zh' ? getDocUrl(doc.slug, 'zh') : doc.defaultUrl
    }))
}

function getDocFooter (
  docs: PackageDocListEntry[],
  slug: string,
  language: PackageDocLanguage
) {
  const sequence = getDocSequence(docs, language)
  const index = sequence.findIndex((item) => item.url === getDocUrl(slug, language))

  return {
    previous: index > 0 ? sequence[index - 1] : undefined,
    next: index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : undefined
  }
}

function resolveReadmeHref (
  currentDoc: PackageDocEntry,
  docs: PackageDocListEntry[],
  href?: string
) {
  if (!href?.startsWith('.')) return href

  const absolutePath = path.posix.normalize(
    path.posix.join('/packages', currentDoc.packageDir, currentDoc.sourceFileName, '..', href)
  )
  const match = absolutePath.match(/^\/packages\/([^/]+)\/(README(?:\.zh-CN)?\.md)$/)
  if (!match) return href

  const target = docs.find((item) => item.packageDir === match[1])
  if (!target) return href

  if (match[2] === 'README.zh-CN.md') {
    return getChineseUrl(target) ?? getDefaultDocUrl(target.slug)
  }

  return getDefaultDocUrl(target.slug)
}

function createMdxComponents (
  currentDoc: PackageDocEntry,
  docs: PackageDocListEntry[]
): MDXComponents {
  return {
    ...defaultMdxComponents,
    a ({ href, children, ...props }) {
      const resolvedHref = resolveReadmeHref(currentDoc, docs, href)
      if (!resolvedHref) return createElement(Fragment, null, children)

      if (resolvedHref.startsWith('/')) {
        return createElement(Link, { href: resolvedHref, ...props }, children)
      }

      return createElement(
        'a',
        {
          href: resolvedHref,
          rel: 'noreferrer',
          target: '_blank',
          ...props
        },
        children
      )
    }
  }
}

export const getPackageDocList = cache(async (): Promise<PackageDocListEntry[]> => {
  const docs = await Promise.all(
    PACKAGE_DOCS.map(async (item) => {
      const { zhPath, defaultPath, hasChineseReadme, hasEnglishReadme } =
        await resolveReadmePaths(item.packageDir)
      const selectedPath = hasEnglishReadme ? defaultPath : zhPath
      const markdown = await readFile(selectedPath, 'utf8')

      return {
        ...item,
        title: extractTitle(markdown, item.packageName),
        summary: extractSummary(markdown),
        hasChineseReadme,
        hasEnglishReadme,
        defaultSourceFileName: path.basename(selectedPath),
        defaultUrl: getDefaultDocUrl(item.slug)
      }
    })
  )

  return docs
})

export const getDocsTree = cache(async (): Promise<PageTree.Root> => {
  const docs = await getPackageDocList()

  return {
    name: 'Pipto Docs',
    children: docs.map((doc) => ({
      type: 'page' as const,
      name: doc.packageName,
      description: doc.summary,
      url: doc.defaultUrl
    }))
  }
})

export const getPackageDoc = cache(async (
  slug: string,
  language: PackageDocLanguage = 'default'
): Promise<PackageDocEntry | null> => {
  const item = PACKAGE_DOCS.find((entry) => entry.slug === slug)
  if (!item) return null

  const docs = await getPackageDocList()
  const listEntry = docs.find((entry) => entry.slug === slug)
  if (!listEntry) return null

  const { zhPath, defaultPath } = await resolveReadmePaths(item.packageDir)
  if (language === 'zh' && !listEntry.hasChineseReadme) return null

  const selectedPath = language === 'zh'
    ? zhPath
    : listEntry.hasEnglishReadme
      ? defaultPath
      : zhPath

  if (!(await fileExists(selectedPath))) return null

  const markdown = await readFile(selectedPath, 'utf8')
  const sourceFileName = path.basename(selectedPath)
  const normalizedMarkdown = trimDocIntro(markdown, listEntry.summary)
  const doc: Omit<PackageDocEntry, 'toc' | 'content'> = {
    ...listEntry,
    language,
    markdown: normalizedMarkdown,
    sourceFileName,
    sourcePath: selectedPath,
    sourceRepoPath: `packages/${item.packageDir}/${sourceFileName}`,
    url: getDocUrl(slug, language),
    chineseUrl: getChineseUrl(listEntry),
    footer: getDocFooter(docs, slug, language)
  }

  const components = createMdxComponents(doc as PackageDocEntry, docs)
  const compiled = await compiler.compile({
    source: normalizedMarkdown,
    filePath: selectedPath,
    components
  })

  return {
    ...doc,
    toc: compiled.toc,
    content: await compiled.body({ components })
  }
})
