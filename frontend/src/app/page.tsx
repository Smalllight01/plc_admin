'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
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
    <AuthGuard>
      <MainLayout>
        <div className="p-6 space-y-8">
          {/* 页面标题 - 增强扁平拟物风格 */}
          <div className="neumorphic-card p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-neumorphic-lg">
                  <BarChart3 className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-h1 gradient-text mb-2">系统仪表板</h1>
                  <p className="text-body text-muted-foreground flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    实时监控系统状态和关键指标
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-body-sm font-medium text-emerald-700">实时更新</span>
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <Button
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  variant="default"
                  size="lg"
                  className="shadow-neumorphic hover:shadow-neumorphic-lg"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
              </div>
            </div>
          </div>

          {/* 统计卡片网格 - 增强扁平拟物风格 */}
          <div className="dashboard-grid">
            {statCards.map((card, index) => {
              const Icon = card.icon

              return (
                <div key={index} className="stat-card group">
                  <div className="flex items-start justify-between mb-6">
                    <div className="space-y-2">
                      <h3 className="text-h4 text-foreground group-hover:text-primary transition-colors duration-300">
                        {card.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-medium bg-muted/50 px-3 py-1 rounded-full border border-border/50 shadow-neumorphic-sm">
                          {card.trend}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-2xl ${card.bgColor} shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out`}>
                      <Icon className={`h-6 w-6 ${card.color} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="stat-card-number group-hover:scale-105 transition-transform duration-300">
                      {isLoading ? (
                        <div className="loading-shimmer h-10 w-24 rounded-xl"></div>
                      ) : (
                        <span className="text-mono">{card.value}</span>
                      )}
                    </div>
                    <p className="stat-card-label">
                      {card.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 系统状态和快速操作 */}
          <div className="responsive-grid-2">
            {/* 系统状态 */}
            <div className="neumorphic-card p-6 lg:p-8">
              <div className="flex items-center gap-4 mb-6 lg:mb-8">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-neumorphic-lg">
                  <Activity className="h-5 w-5 lg:h-6 lg:w-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-h3 lg:text-h2 gradient-text">系统状态</h2>
                  <p className="text-body-sm lg:text-body text-muted-foreground">当前系统运行状态概览</p>
                </div>
              </div>

              <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 lg:p-5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300">
                  <div className="flex items-center gap-3 lg:gap-4 mb-3 sm:mb-0">
                    <div className="p-2 lg:p-2.5 bg-emerald-500 rounded-xl shadow-neumorphic-sm">
                      <Shield className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </div>
                    <span className="text-body-sm lg:text-body font-semibold text-foreground">系统运行状态</span>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                    <span className="status-indicator status-online text-body-sm lg:text-body">正常运行</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 lg:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300">
                  <div className="flex items-center gap-3 lg:gap-4 mb-3 sm:mb-0">
                    <div className="p-2 lg:p-2.5 bg-blue-500 rounded-xl shadow-neumorphic-sm">
                      <Database className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </div>
                    <span className="text-body-sm lg:text-body font-semibold text-foreground">数据采集状态</span>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-500 rounded-full animate-pulse shadow-lg"></div>
                    <span className="status-indicator status-online text-body-sm lg:text-body">采集中</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 lg:p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300">
                  <div className="flex items-center gap-3 lg:gap-4 mb-3 sm:mb-0">
                    <div className="p-2 lg:p-2.5 bg-purple-500 rounded-xl shadow-neumorphic-sm">
                      <Wifi className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </div>
                    <span className="text-body-sm lg:text-body font-semibold text-foreground">设备连接率</span>
                  </div>
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="text-h4 lg:text-h3 text-mono">
                      {stats.total_devices > 0
                        ? `${Math.round((stats.online_devices / stats.total_devices) * 100)}%`
                        : '0%'
                      }
                    </div>
                    <div className="w-16 lg:w-24 h-2 lg:h-3 rounded-full bg-muted overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-700 ease-out shadow-neumorphic-sm"
                        style={{ width: stats.total_devices > 0 ? `${(stats.online_devices / stats.total_devices) * 100}%` : '0%' }}
                      ></div>
                    </div>
                  </div>
                </div>

                {stats.recent_alerts > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 lg:p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300">
                    <div className="flex items-center gap-3 lg:gap-4 mb-3 sm:mb-0">
                      <div className="p-2 lg:p-2.5 bg-orange-500 rounded-xl shadow-neumorphic-sm">
                        <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                      </div>
                      <span className="text-body-sm lg:text-body font-semibold text-foreground">近期告警</span>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3">
                      <span className="status-indicator bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 shadow-neumorphic-sm text-body-sm lg:text-body">
                        {stats.recent_alerts} 条
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 快速操作 */}
            <div className="neumorphic-card p-6 lg:p-8">
              <div className="flex items-center gap-4 mb-6 lg:mb-8">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-neumorphic-lg">
                  <Zap className="h-5 w-5 lg:h-6 lg:w-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-h3 lg:text-h2 gradient-text">快速操作</h2>
                  <p className="text-body-sm lg:text-body text-muted-foreground">常用功能快速入口</p>
                </div>
              </div>

              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <Link href="/realtime">
                    <div className="group p-4 lg:p-6 text-left bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl hover:border-emerald-400 hover:shadow-neumorphic-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-neumorphic-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <Activity className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                        </div>
                        <span className="text-body lg:text-h4 font-bold text-foreground group-hover:text-emerald-700 transition-colors">实时数据</span>
                      </div>
                      <p className="text-caption lg:text-body-sm text-muted-foreground group-hover:text-foreground transition-colors">查看实时采集数据</p>
                    </div>
                  </Link>

                  <Link href="/devices">
                    <div className="group p-4 lg:p-6 text-left bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl hover:border-purple-400 hover:shadow-neumorphic-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-neumorphic-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <HardDrive className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                        </div>
                        <span className="text-body lg:text-h4 font-bold text-foreground group-hover:text-purple-700 transition-colors">设备管理</span>
                      </div>
                      <p className="text-caption lg:text-body-sm text-muted-foreground group-hover:text-foreground transition-colors">管理PLC设备</p>
                    </div>
                  </Link>

                  <Link href="/history">
                    <div className="group p-4 lg:p-6 text-left bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl hover:border-indigo-400 hover:shadow-neumorphic-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-neumorphic-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <History className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                        </div>
                        <span className="text-body lg:text-h4 font-bold text-foreground group-hover:text-indigo-700 transition-colors">历史数据</span>
                      </div>
                      <p className="text-caption lg:text-body-sm text-muted-foreground group-hover:text-foreground transition-colors">查看历史记录</p>
                    </div>
                  </Link>

                  <Link href="/statistics">
                    <div className="group p-4 lg:p-6 text-left bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl hover:border-blue-400 hover:shadow-neumorphic-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-neumorphic-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                        </div>
                        <span className="text-body lg:text-h4 font-bold text-foreground group-hover:text-blue-700 transition-colors">数据统计</span>
                      </div>
                      <p className="text-caption lg:text-body-sm text-muted-foreground group-hover:text-foreground transition-colors">数据分析统计</p>
                    </div>
                  </Link>
                </div>

                {/* 额外的快速操作 */}
                <div className="pt-4 lg:pt-6 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                    <Link href="/settings">
                      <Button variant="outline" size="lg" className="w-full justify-start gap-2 lg:gap-3 shadow-neumorphic-sm hover:shadow-neumorphic mobile-btn">
                        <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
                        <span className="text-body-sm lg:text-body">设置</span>
                      </Button>
                    </Link>
                    <Link href="/groups">
                      <Button variant="outline" size="lg" className="w-full justify-start gap-2 lg:gap-3 shadow-neumorphic-sm hover:shadow-neumorphic mobile-btn">
                        <Layers className="h-4 w-4 lg:h-5 lg:w-5" />
                        <span className="text-body-sm lg:text-body">分组</span>
                      </Button>
                    </Link>
                    <Link href="/users">
                      <Button variant="outline" size="lg" className="w-full justify-start gap-2 lg:gap-3 shadow-neumorphic-sm hover:shadow-neumorphic mobile-btn">
                        <Users className="h-4 w-4 lg:h-5 lg:w-5" />
                        <span className="text-body-sm lg:text-body">用户</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}