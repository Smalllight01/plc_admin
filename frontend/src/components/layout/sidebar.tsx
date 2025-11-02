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
        'glass-surface h-full transition-all duration-300 ease-in-out animate-[slideInLeft_0.8s_ease-out_0.4s_both]',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* 头部 */}
      <div className={cn(
        'border-b border-white/10 transition-all duration-300',
        collapsed ? 'p-5' : 'p-6 pb-5'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3 animate-[fadeIn_0.6s_ease-out_0.2s_both]">
            <div className="h-10 w-10 rounded-xl bg-accent/20 backdrop-blur ring-1 ring-accent/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight text-white">
                PLC平台
              </div>
              <div className="text-xs text-white/60">
                数据采集系统
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center animate-[fadeIn_0.6s_ease-out_0.2s_both]">
            <div className="h-10 w-10 rounded-xl bg-accent/20 backdrop-blur ring-1 ring-accent/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-accent" />
            </div>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className={cn(
        'flex-1 custom-scrollbar overflow-y-auto',
        collapsed ? 'pt-5 pr-5 pb-5 pl-5' : 'pt-5 pr-5 pb-5 pl-5'
      )}>
        {/* 概览部分 */}
        <div className="animate-[fadeIn_0.6s_ease-out_0.6s_both]">
          <div className="text-xs uppercase tracking-wide text-white/50 mb-3 font-medium">
            概览
          </div>
          <ul className="space-y-2 mb-6">
            {navigationItems
              .filter(item =>
                hasPermission(item) &&
                ['仪表板', '分组管理', '设备管理', '实时数据'].includes(item.title)
              )
              .map((item, index) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          'group flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200',
                          active
                            ? 'bg-card/80 backdrop-blur ring-1 ring-white/10 text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {!collapsed && active && (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent/20 ring-1 ring-accent/30">
                              <Icon className="w-4 h-4 text-accent" />
                            </span>
                          )}
                          {!collapsed && !active && (
                            <Icon className="w-5 h-5" />
                          )}
                          {collapsed && (
                            <span className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-lg',
                              active
                                ? 'bg-accent/20 ring-1 ring-accent/30'
                                : 'bg-white/10'
                            )}>
                              <Icon className={cn(
                                'w-4 h-4',
                                active ? 'text-accent' : 'text-white/70'
                              )} />
                            </span>
                          )}
                          {!collapsed && (
                            <span className="text-sm font-medium">
                              {item.title}
                            </span>
                          )}
                        </div>
                        {!collapsed && active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
          </ul>
        </div>

        {/* 数据分析部分 */}
        <div className="animate-[fadeIn_0.6s_ease-out_0.7s_both]">
          <div className="text-xs uppercase tracking-wide text-white/50 mb-3 font-medium">
            数据分析
          </div>
          <ul className="space-y-2 mb-6">
            {navigationItems
              .filter(item =>
                hasPermission(item) &&
                ['历史数据', '数据统计'].includes(item.title)
              )
              .map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200',
                          active && 'bg-card/80 backdrop-blur ring-1 ring-white/10 text-white'
                        )}
                      >
                        {collapsed ? (
                          <Icon className="w-5 h-5" />
                        ) : (
                          <>
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-medium text-white/70">
                              {item.title}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
          </ul>
        </div>

        {/* 管理部分 */}
        <div className="animate-[fadeIn_0.6s_ease-out_0.8s_both]">
          <div className="text-xs uppercase tracking-wide text-white/50 mb-3 font-medium">
            管理
          </div>
          <ul className="space-y-2">
            {navigationItems
              .filter(item =>
                hasPermission(item) &&
                ['用户管理', '系统设置'].includes(item.title)
              )
              .map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200',
                          active && 'bg-card/80 backdrop-blur ring-1 ring-white/10 text-white'
                        )}
                      >
                        {collapsed ? (
                          <Icon className="w-5 h-5" />
                        ) : (
                          <>
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-medium text-white/70">
                              {item.title}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
          </ul>
        </div>
      </nav>

      {/* 用户信息 */}
      {!collapsed && user && (
        <div className="p-4 border-t border-white/10 animate-[fadeInUp_0.6s_ease-out_0.9s_both]">
          <div className="rounded-2xl p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/20 backdrop-blur ring-1 ring-accent/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  {user.username}
                </div>
                <div className="text-xs text-white/60 font-medium">
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

      {/* 收起状态下用户图标 */}
      {collapsed && user && (
        <div className="p-4 border-t border-white/10 animate-[fadeIn_0.6s_ease-out_1s_both]">
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-xl bg-accent/20 backdrop-blur ring-1 ring-accent/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}