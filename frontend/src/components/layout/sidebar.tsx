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
      title: '设备状态',
      href: '/devices/status',
      icon: Activity,
      description: '监控设备连接状态',
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
        'neumorphic-sidebar flex flex-col h-full transition-all duration-300 ease-in-out',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* 头部 */}
      <div className={cn(
        'flex items-center border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/5 transition-all duration-300',
        collapsed ? 'justify-center p-3' : 'justify-between p-4'
      )}>
        {!collapsed && (
          <div className="flex items-center space-x-3 animate-slide-in">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300 hover:scale-105">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg gradient-text">
                PLC平台
              </span>
              <div className="text-xs text-muted-foreground font-medium">
                数据采集系统
              </div>
            </div>
          </div>
        )}

        <Button
          variant="neumorphic"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300 hover:scale-105"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-foreground" />
          )}
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className={cn(
        'flex-1 custom-scrollbar overflow-y-auto',
        collapsed ? 'px-2 py-4' : 'px-4 py-5'
      )}>
        {navigationItems
          .filter(hasPermission)
          .map((item, index) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <div key={item.href} className={collapsed ? 'mb-3' : 'mb-4'}>
                <Link href={item.href}>
                <div
                  className={cn(
                    'group flex items-center transition-all duration-300 ease-out border-2',
                    'hover:shadow-neumorphic hover:-translate-y-0.5',
                    collapsed
                      ? 'justify-center px-1.5 py-2 rounded-lg w-10 h-10'
                      : 'justify-start space-x-3 px-3 py-2.5 rounded-xl min-h-[44px]',
                    active
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-primary-foreground border-primary shadow-neumorphic-lg scale-105'
                      : 'bg-card text-foreground border-border/50 hover:border-primary/50 hover:bg-muted/30'
                  )}
                  title={collapsed ? item.title : undefined}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div className={cn(
                    'transition-all duration-300 flex items-center justify-center',
                    active
                      ? 'bg-primary-foreground/20 shadow-inner'
                      : 'bg-gradient-to-br from-muted to-accent/20 group-hover:from-primary/10 group-hover:to-accent/30',
                    collapsed ? 'p-1.5 rounded-lg w-6 h-6' : 'p-2 rounded-lg'
                  )}>
                    <Icon className={cn(
                      'transition-all duration-300',
                      collapsed ? 'h-4 w-4' : 'h-5 w-5',
                      active ? 'text-primary-foreground' : 'text-foreground group-hover:text-primary group-hover:scale-110'
                    )} />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 animate-fade-in ml-2">
                      <div className={cn(
                        'font-bold text-sm transition-colors duration-300 leading-tight',
                        active ? 'text-primary-foreground' : 'text-foreground group-hover:text-primary'
                      )}>
                        {item.title}
                      </div>
                      {!active && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5 group-hover:text-primary/70 transition-colors leading-tight">
                          {item.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
              </div>
            )
          })}
      </nav>

      {/* 用户信息 */}
      {!collapsed && user && (
        <div className="p-3 border-t border-border/50 bg-gradient-to-r from-muted/30 to-accent/10 animate-slide-up">
          <div className="neumorphic-card p-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300 hover:scale-105">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground truncate">
                  {user.username}
                </div>
                <div className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded text-center mt-1">
                  {user.role === 'super_admin'
                    ? '超级管理员'
                    : user.role === 'admin'
                    ? '管理员'
                    : '普通用户'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}