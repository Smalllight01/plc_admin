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
        <div className="p-6 space-y-6">
          {/* 页面标题 - 优化版本 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">系统仪表板</h1>
                    <p className="text-blue-600 mt-1 font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      实时监控系统状态和关键指标
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-emerald-700">实时更新</span>
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                <Button
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  size="sm"
                  className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 hover:border-blue-300"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
              </div>
            </div>
          </div>

          {/* 统计卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon
              
              return (
                <Card key={index} className={`group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 ${card.borderColor} bg-white overflow-hidden relative`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50"></div>
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                        {card.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {card.trend}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl ${card.bgColor} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-6 w-6 ${card.color} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                      {isLoading ? (
                        <div className="animate-pulse bg-gradient-to-r from-gray-200 to-gray-300 h-9 w-20 rounded-lg"></div>
                      ) : (
                        <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                          {card.value}
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-sm text-gray-600 leading-relaxed">
                      {card.description}
                    </CardDescription>
                    
                    {/* 装饰性元素 */}
                    <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-gray-100 to-transparent rounded-tl-full opacity-30"></div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* 快速操作和状态信息 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 系统状态 */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-800">系统状态</span>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  当前系统运行状态概览
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">系统运行状态</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-sm font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">正常运行</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">数据采集状态</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">采集中</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Wifi className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">设备连接率</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-lg font-bold text-purple-700">
                      {stats.total_devices > 0 
                        ? `${Math.round((stats.online_devices / stats.total_devices) * 100)}%`
                        : '0%'
                      }
                    </div>
                    <div className={`w-16 h-2 rounded-full ${stats.total_devices > 0 && (stats.online_devices / stats.total_devices) > 0.8 ? 'bg-green-400' : stats.total_devices > 0 && (stats.online_devices / stats.total_devices) > 0.5 ? 'bg-yellow-400' : 'bg-red-400'}`}>
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: stats.total_devices > 0 ? `${(stats.online_devices / stats.total_devices) * 100}%` : '0%' }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {stats.recent_alerts > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">近期告警</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                        {stats.recent_alerts} 条
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 快速操作 */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-800">快速操作</span>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  常用功能快速入口
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/realtime">
                    <div className="group p-4 text-left bg-white border-2 border-green-200 rounded-xl hover:border-green-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
                          <Activity className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-green-700 transition-colors">实时数据</span>
                      </div>
                      <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">查看实时采集数据</p>
                    </div>
                  </Link>
                  
                  <Link href="/devices">
                    <div className="group p-4 text-left bg-white border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
                          <HardDrive className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-purple-700 transition-colors">设备管理</span>
                      </div>
                      <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">管理PLC设备</p>
                    </div>
                  </Link>
                  
                  <Link href="/history">
                    <div className="group p-4 text-left bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
                          <History className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">历史数据</span>
                      </div>
                      <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">查看历史记录</p>
                    </div>
                  </Link>
                  
                  <Link href="/statistics">
                    <div className="group p-4 text-left bg-white border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform duration-300">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">数据统计</span>
                      </div>
                      <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">数据分析统计</p>
                    </div>
                  </Link>
                </div>
                
                {/* 额外的快速操作 */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-3">
                    <Link href="/settings">
                      <Button variant="outline" size="sm" className="w-full justify-start space-x-2 hover:bg-gray-50">
                        <Settings className="h-4 w-4" />
                        <span>设置</span>
                      </Button>
                    </Link>
                    <Link href="/groups">
                      <Button variant="outline" size="sm" className="w-full justify-start space-x-2 hover:bg-gray-50">
                        <Layers className="h-4 w-4" />
                        <span>分组</span>
                      </Button>
                    </Link>
                    <Link href="/users">
                      <Button variant="outline" size="sm" className="w-full justify-start space-x-2 hover:bg-gray-50">
                        <Users className="h-4 w-4" />
                        <span>用户</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}