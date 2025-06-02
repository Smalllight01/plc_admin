'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * 全局Provider组件
 * 提供React Query客户端和其他全局状态管理
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 数据缓存时间（5分钟）
            staleTime: 5 * 60 * 1000,
            // 缓存保持时间（10分钟）
            gcTime: 10 * 60 * 1000,
            // 重试次数
            retry: 1,
            // 重新获取数据的条件
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            // 变更重试次数
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}