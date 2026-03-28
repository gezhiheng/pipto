import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PackageDocPage as PackageDocView } from '../../doc-page'
import { getPackageDoc, getPackageDocList } from '../../../../lib/package-docs'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams () {
  const docs = await getPackageDocList()
  return docs
    .filter((doc) => doc.hasChineseReadme)
    .map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata ({
  params
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const doc = await getPackageDoc(slug, 'zh')

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

export default async function PackageDocChinesePage ({
  params
}: PageProps) {
  const { slug } = await params
  const doc = await getPackageDoc(slug, 'zh')

  if (!doc) notFound()

  return <PackageDocView doc={doc} locale='zh' />
}
