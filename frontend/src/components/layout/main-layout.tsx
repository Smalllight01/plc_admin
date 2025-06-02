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
      setIsMobile(mobile)
      
      // 在移动端默认收起侧边栏
      if (mobile) {
        setSidebarCollapsed(true)
        setMobileMenuOpen(false)
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
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      {/* 移动端遮罩层 */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0',
          isMobile
            ? mobileMenuOpen
              ? 'translate-x-0'
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <Header onMenuClick={toggleSidebar} />

        {/* 主内容 */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-blue-50/50">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}