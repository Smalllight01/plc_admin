'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { apiService } from '@/services/api'
import { DashboardStats } from '@/lib/api'
import {
  Users,
  Layers,
  HardDrive,
  Activity,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Settings,
  History,
  Zap,
  Shield,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react'
import Link from 'next/link'

/**
 * 仪表板页面组件
 * 显示系统概览和关键统计信息
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_groups: 0,
    total_devices: 0,
    online_devices: 0,
    offline_devices: 0,
    total_data_points: 0,
    recent_alerts: 0,
  })
  const [userGroupName, setUserGroupName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  /**
   * 加载仪表板数据
   */
  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // 使用新的仪表板API获取统计数据
      const dashboardStats = await apiService.getDashboardStats()

      setStats(dashboardStats)
      setUserGroupName(dashboardStats.user_group_name || '')
    } catch (error) {
      console.error('加载仪表板数据失败:', error)
      toast({
        title: '数据加载失败',
        description: '无法加载仪表板数据，请刷新页面重试',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    
    // 设置定时刷新（每30秒）
    const interval = setInterval(loadDashboardData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  /**
   * 统计卡片配置
   */
  const statCards = [
    {
      title: '用户总数',
      value: stats.total_users,
      description: userGroupName ? `${userGroupName}分组用户数量` : '系统注册用户数量',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      trend: '+2.5%',
    },
    {
      title: '分组数量',
      value: stats.total_groups,
      description: userGroupName ? `当前分组: ${userGroupName}` : '设备分组总数',
      icon: Layers,
      color: 'text-emerald-600',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      borderColor: 'border-emerald-200',
      trend: '+1.2%',
    },
    {
      title: '设备总数',
      value: stats.total_devices,
      description: userGroupName ? `${userGroupName}分组设备数量` : 'PLC设备总数量',
      icon: HardDrive,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      trend: '+5.8%',
    },
    {
      title: '在线设备',
      value: stats.online_devices,
      description: '当前在线设备数',
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      borderColor: 'border-green-200',
      trend: stats.total_devices > 0 ? `${Math.round((stats.online_devices / stats.total_devices) * 100)}%` : '0%',
    },
    {
      title: '离线设备',
      value: stats.offline_devices,
      description: '当前离线设备数',
      icon: WifiOff,
      color: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
      borderColor: 'border-red-200',
      trend: stats.total_devices > 0 ? `${Math.round((stats.offline_devices / stats.total_devices) * 100)}%` : '0%',
    },
    {
      title: '数据点数',
      value: stats.total_data_points.toLocaleString(),
      description: '累计采集数据点',
      icon: Database,
      color: 'text-indigo-600',
      bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      trend: '+12.3%',
    },
  ]

  return (
    <div className="space-y-6">
          {/* 页面标题 - Novara风格 */}
          <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <h1 className="text-2xl md:text-3xl tracking-tight text-white">
              PLC管理概览
            </h1>
          </div>

          {/* 顶部统计卡片 - Novara风格 */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 用户总数 */}
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">用户总数</div>
                <div className="p-2 rounded-xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl md:text-3xl tracking-tight text-white">
                  {isLoading ? (
                    <div className="loading-shimmer h-8 w-16 rounded-lg"></div>
                  ) : (
                    stats.total_users
                  )}
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">+2.5%</span>
                </div>
              </div>
            </div>

            {/* 分组数量 */}
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">分组数量</div>
                <div className="p-2 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl md:text-3xl tracking-tight text-white">
                  {isLoading ? (
                    <div className="loading-shimmer h-8 w-16 rounded-lg"></div>
                  ) : (
                    stats.total_groups
                  )}
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">+1.2%</span>
                </div>
              </div>
            </div>

            {/* 设备总数 */}
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_0.8s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">设备总数</div>
                <div className="p-2 rounded-xl bg-purple-500/20 backdrop-blur ring-1 ring-purple-500/30">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl md:text-3xl tracking-tight text-white">
                  {isLoading ? (
                    <div className="loading-shimmer h-8 w-16 rounded-lg"></div>
                  ) : (
                    stats.total_devices
                  )}
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">+5.8%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 中间：设备状态和数据统计 */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* 月度数据采集 */}
            <div className="lg:col-span-2 rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInLeft_0.8s_ease-out_0.9s_both]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500/20 backdrop-blur ring-1 ring-indigo-500/30">
                    <Database className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm text-white/70 font-medium">月度数据采集</div>
                    <div className="mt-1 text-xl font-semibold tracking-tight text-white">
                      {isLoading ? (
                        <div className="loading-shimmer h-8 w-32 rounded-lg"></div>
                      ) : (
                        `${stats.total_data_points.toLocaleString()} 条`
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  +12.4%
                </div>
              </div>
              <div className="mt-4 relative h-40">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Database className="w-12 h-12 mx-auto mb-2 text-white/20" />
                    <p className="text-xs text-white/40">数据趋势图</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 设备状态 */}
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInRight_0.8s_ease-out_0.9s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">设备连接状态</div>
                <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 text-xs text-emerald-400 font-medium">
                  <Activity className="w-3.5 h-3.5" />
                  实时监控
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">在线设备</div>
                      <div className="text-xs text-emerald-400/60 font-medium">
                        {isLoading ? (
                          <div className="loading-shimmer h-4 w-16 rounded"></div>
                        ) : (
                          `正常运行中`
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-400">
                    {isLoading ? (
                      <div className="loading-shimmer h-6 w-8 rounded"></div>
                    ) : (
                      stats.online_devices
                    )}
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-500/20 backdrop-blur ring-1 ring-red-500/30 flex items-center justify-center">
                      <WifiOff className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">离线设备</div>
                      <div className="text-xs text-red-400/60 font-medium">
                        {isLoading ? (
                          <div className="loading-shimmer h-4 w-16 rounded"></div>
                        ) : (
                          `需要检查连接`
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-red-400">
                    {isLoading ? (
                      <div className="loading-shimmer h-6 w-8 rounded"></div>
                    ) : (
                      stats.offline_devices
                    )}
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* 底部：系统状态和快速操作 */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* 系统状态 */}
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_1s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">系统运行状态</div>
                <div className="p-2 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-2xl tracking-tight text-white">正常运行</div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">99.9%</span>
                </div>
              </div>
            </div>

            {/* 设备连接率 */}
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_1.1s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">设备连接率</div>
                <div className="p-2 rounded-xl bg-amber-500/20 backdrop-blur ring-1 ring-amber-500/30">
                  <Wifi className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-2xl tracking-tight text-white">
                  {stats.total_devices > 0
                    ? `${Math.round((stats.online_devices / stats.total_devices) * 100)}%`
                    : '0%'
                  }
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">+3.2%</span>
                </div>
              </div>
            </div>

            {/* 总体资产 */}
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_1.2s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">系统总览</div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 text-xs text-emerald-400 font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  监控中
                </div>
              </div>
              <div className="mt-3 text-3xl tracking-tight text-white">
                {isLoading ? (
                  <div className="loading-shimmer h-10 w-24 rounded-lg"></div>
                ) : (
                  stats.total_devices
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={loadDashboardData}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-semibold">刷新</span>
                </button>
                <Link href="/realtime" className="flex-1">
                  <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm font-semibold">监控</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
    </div>
  )
}