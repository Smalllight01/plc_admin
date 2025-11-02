'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
}

/**
 * 主布局组件
 * 提供应用的整体布局结构，包括侧边栏、顶部导航和主内容区域
 */
export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      const tablet = window.innerWidth < 1024

      setIsMobile(mobile)

      // 在移动端和平板端默认收起侧边栏
      if (mobile || tablet) {
        setSidebarCollapsed(true)
        setMobileMenuOpen(false)
      } else {
        setSidebarCollapsed(false)
      }
    }

    // 初始检查
    checkScreenSize()

    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize)

    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  /**
   * 切换侧边栏状态
   */
  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  /**
   * 关闭移动端菜单
   */
  const closeMobileMenu = () => {
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-zinc-900">
      {/* 移动端遮罩层 - Novara风格 */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.3s_ease-out]"
          onClick={closeMobileMenu}
        />
      )}

      {/* 侧边栏容器 - 应用玻璃效果 */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out',
          'md:relative md:translate-x-0',
          isMobile
            ? mobileMenuOpen
              ? 'translate-x-0 animate-[slideInLeft_0.4s_ease-out]'
              : '-translate-x-full'
            : 'translate-x-0'
        )}
      >
        <Sidebar
          collapsed={!isMobile && sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
        {/* 顶部导航栏 - 使用深色背景 */}
        <div className="bg-zinc-900 border-b border-white/10 animate-[fadeInDown_0.6s_ease-out_0.3s_both]">
          <Header onMenuClick={toggleSidebar} />
        </div>

        {/* 主内容 - 深色背景，不使用玻璃拟态 */}
        <main className="flex-1 overflow-auto custom-scrollbar">
          <div className="px-4 md:px-6 lg:px-8 py-6 lg:py-8 min-h-full animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}