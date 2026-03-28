import type { MetadataRoute } from 'next'
import { getPackageDocList } from '../lib/package-docs'

export const dynamic = 'force-static'

export default async function sitemap (): Promise<MetadataRoute.Sitemap> {
  const docs = await getPackageDocList()
  const lastModified = new Date()

  return [
    {
      url: 'https://pipto.henryge.com',
      lastModified,
      changeFrequency: 'weekly',
      priority: 1
    },
    ...docs.map((doc) => ({
      url: doc.slug === 'pipto'
        ? 'https://pipto.henryge.com/docs'
        : `https://pipto.henryge.com/docs/${doc.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8
    })),
    ...docs
      .filter((doc) => doc.hasChineseReadme)
      .map((doc) => ({
        url: doc.slug === 'pipto'
          ? 'https://pipto.henryge.com/docs/zh'
          : `https://pipto.henryge.com/docs/${doc.slug}/zh`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.6
      }))
  ]
}
