import { redirect } from 'next/navigation'
import { getPackageDocList } from '../../../../lib/package-docs'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams () {
  const docs = await getPackageDocList()
  return docs
    .filter((doc) => doc.slug !== 'pipto')
    .map((doc) => ({ slug: doc.slug }))
}

export default async function PackageDocLegacyEnglishPage ({
  params
}: PageProps) {
  const { slug } = await params
  redirect(`/docs/${slug}`)
}
