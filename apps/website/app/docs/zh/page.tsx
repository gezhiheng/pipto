import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PackageDocPage as PackageDocView } from '../doc-page'
import { getPackageDoc } from '../../../lib/package-docs'

export async function generateMetadata (): Promise<Metadata> {
  const doc = await getPackageDoc('pipto', 'zh')

  if (!doc) {
    return {
      title: '文档不存在'
    }
  }

  return {
    title: `${doc.title} 文档`,
    description: doc.summary || `查看 ${doc.packageName} 的中文 README 文档。`
  }
}

export default async function DocsChineseIndexPage () {
  const doc = await getPackageDoc('pipto', 'zh')

  if (!doc) notFound()

  return <PackageDocView doc={doc} locale='zh' />
}
