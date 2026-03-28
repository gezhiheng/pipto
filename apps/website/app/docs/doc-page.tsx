import type { Route } from 'next'
import Link from 'next/link'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import type { PackageDocEntry } from '../../lib/package-docs'

type PackageDocPageProps = {
  doc: PackageDocEntry
  locale: 'default' | 'zh'
}

export function PackageDocPage ({
  doc,
  locale
}: PackageDocPageProps) {
  return (
    <DocsPage
      toc={doc.toc}
      footer={{
        items: doc.footer
      }}
      tableOfContent={{
        style: 'clerk'
      }}
      editOnGithub={{
        owner: 'gezhiheng',
        repo: 'pipto',
        sha: 'main',
        path: doc.sourceRepoPath
      }}
    >
      <DocsTitle>{doc.title}</DocsTitle>
      <DocsDescription>
        {doc.summary || '当前页面直接渲染自仓库中的 README 内容。'}
      </DocsDescription>

      <div className='not-prose mb-8 flex flex-wrap items-center gap-3'>
        <span className='inline-flex min-h-10 items-center rounded-full border border-fd-border bg-fd-secondary px-4 text-sm font-medium text-fd-muted-foreground'>
          {doc.packageName}
        </span>
        <span className='inline-flex min-h-10 items-center rounded-full border border-fd-border bg-fd-secondary px-4 text-sm font-medium text-fd-muted-foreground'>
          来源: {doc.sourceFileName}
        </span>
        <a
          className='inline-flex min-h-10 items-center rounded-full border border-fd-border bg-fd-secondary px-4 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground'
          href={`https://github.com/gezhiheng/pipto/tree/main/packages/${doc.packageDir}`}
          rel='noreferrer'
          target='_blank'
        >
          打开 package 目录
        </a>

        {doc.chineseUrl && (
          <div className='ms-auto flex flex-wrap gap-2'>
            <Link
              href={doc.defaultUrl as Route}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                locale === 'default'
                  ? 'border-transparent bg-fd-primary text-fd-primary-foreground'
                  : 'border-fd-border bg-fd-secondary text-fd-foreground hover:bg-fd-accent hover:text-fd-accent-foreground'
              }`}
            >
              English
            </Link>
            <Link
              href={doc.chineseUrl as Route}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                locale === 'zh'
                  ? 'border-transparent bg-fd-primary text-fd-primary-foreground'
                  : 'border-fd-border bg-fd-secondary text-fd-foreground hover:bg-fd-accent hover:text-fd-accent-foreground'
              }`}
            >
              中文
            </Link>
          </div>
        )}
      </div>

      <DocsBody>{doc.content}</DocsBody>
    </DocsPage>
  )
}
