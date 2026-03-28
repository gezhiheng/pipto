import type { Metadata } from 'next'
import { JetBrains_Mono, Noto_Sans_SC, Unbounded } from 'next/font/google'
import type { ReactNode } from 'react'
import { NextProvider } from 'fumadocs-core/framework/next'
import { RootProvider } from 'fumadocs-ui/provider'
import './globals.css'

const brand = Unbounded({
  subsets: ['latin'],
  variable: '--font-brand',
  weight: ['600', '700', '800']
})

const body = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '700', '900']
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['500', '700']
})

export const metadata: Metadata = {
  metadataBase: new URL('https://pipto.henryge.com'),
  title: {
    default: 'Pipto | 用 JSON 构建 PPT',
    template: '%s | Pipto'
  },
  description:
    'Pipto 将 schema、PPTX 导出、PPTX 解析、浏览器预览和主题替换组织成一条结构化演示文稿工作流。',
  keywords: [
    'Pipto',
    'json2pptx',
    'ppt2json',
    'presentation workflow',
    'PPTX automation',
    '演示文稿自动化'
  ],
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Pipto | JSON 驱动的演示文稿工作流',
    description:
      '从 JSON schema 到 PPTX 导出、主题替换和浏览器预览，Pipto 让演示文稿成为可组合的工程资产。',
    url: 'https://pipto.henryge.com',
    siteName: 'Pipto',
    type: 'website',
    locale: 'zh_CN'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pipto | JSON 驱动的演示文稿工作流',
    description:
      '结构化定义内容，稳定生成 PPTX，在浏览器里预览并改造主题。'
  }
}

export default function RootLayout ({
  children
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="zh-CN" className={`${brand.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <NextProvider>
          <RootProvider
            search={{
              enabled: false
            }}
            theme={{
              enabled: false
            }}
          >
            {children}
          </RootProvider>
        </NextProvider>
      </body>
    </html>
  )
}
