'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import {
  Home,
  Users,
  Layers,
  HardDrive,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Activity,
  TrendingUp,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/**
 * 侧边栏导航组件
 * 提供主要的导航功能和菜单项
 */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  // 导航菜单项配置
  const navigationItems = [
    {
      title: '仪表板',
      href: '/',
      icon: Home,
      description: '系统概览和统计信息',
    },
    {
      title: '分组管理',
      href: '/groups',
      icon: Layers,
      description: '管理设备分组',
      requireSuperAdmin: true,
    },
    {
      title: '设备管理',
      href: '/devices',
      icon: HardDrive,
      description: '管理PLC设备',
      requireAdmin: true,
    },
    {
      title: '实时数据',
      href: '/realtime',
      icon: Activity,
      description: '查看实时采集数据',
    },
    {
      title: '历史数据',
      href: '/history',
      icon: Database,
      description: '查看历史数据记录',
    },
    {
      title: '数据统计',
      href: '/statistics',
      icon: BarChart3,
      description: '数据分析和统计',
    },
    {
      title: '性能分析',
      href: '/performance',
      icon: TrendingUp,
      description: '设备性能监控和分析',
    },
    {
      title: '用户管理',
      href: '/users',
      icon: Users,
      description: '管理系统用户',
      requireSuperAdmin: true,
    },
    {
      title: '系统设置',
      href: '/settings',
      icon: Settings,
      description: '系统配置和设置',
      requireSuperAdmin: true,
    },
  ]

  /**
   * 检查用户是否有权限访问菜单项
   */
  const hasPermission = (item: any): boolean => {
    if (item.requireSuperAdmin && user?.role !== 'super_admin') {
      return false
    }
    
    if (item.requireAdmin && user?.role !== 'admin' && user?.role !== 'super_admin') {
      return false
    }
    
    return true
  }

  /**
   * 检查菜单项是否为当前活动项
   */
  const isActive = (href: string): boolean => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white/80 backdrop-blur-sm border-r border-gray-200/50 transition-all duration-300 shadow-lg',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">
              PLC平台
            </span>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-9 w-9 hover:bg-blue-100 transition-colors border border-gray-200 hover:border-blue-300"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems
          .filter(hasPermission)
          .map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 border',
                    'hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm',
                    active
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-500 shadow-md hover:from-blue-600 hover:to-indigo-600'
                      : 'text-gray-700 hover:text-gray-900 border-transparent bg-white/50'
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    active ? 'text-white' : 'text-gray-600'
                  )} />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'font-semibold text-sm',
                        active ? 'text-white' : 'text-gray-900'
                      )}>
                        {item.title}
                      </div>
                      {!active && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
      </nav>

      {/* 用户信息 */}
      {!collapsed && user && (
        <div className="p-4 border-t border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center space-x-3 bg-white/80 rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">
                {user.username}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                {user.role === 'super_admin'
                  ? '超级管理员'
                  : user.role === 'admin'
                  ? '管理员'
                  : '普通用户'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}