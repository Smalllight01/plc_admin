import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from './providers'
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'

// 优化字体配置 - 主字体用于界面，等宽字体用于数据和代码
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans'
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'PLC采集平台',
  description: 'PLC数据采集与管理平台',
}

/**
 * 根布局组件
 * 提供全局样式、字体、Provider和Toast组件
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="font-sans antialiased bg-gradient-surface">
        <Providers>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}