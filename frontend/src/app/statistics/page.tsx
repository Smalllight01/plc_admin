'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Monitor,
  HardDrive,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

import { dataService, deviceService, groupService } from '@/services/api'
import { StatisticsData, Device, Group, StatisticsQueryParams } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { performanceService } from '@/services/performanceService'

/**
 * 数据统计页面组件
 * 提供设备数据的统计分析和可视化展示
 */
export default function StatisticsPage() {
  // 状态管理
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<StatisticsData[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<'10m' | '30m' | '1h' | '24h' | '7d' | '30d'>('24h')
  const [error, setError] = useState<string | null>(null)
  
  // 异常分析相关状态
  const [anomalyLoading, setAnomalyLoading] = useState(false)
  const [anomalyData, setAnomalyData] = useState<any>(null)
  const [anomalyError, setAnomalyError] = useState<string | null>(null)
  
  // 异常列表分页和过滤状态
  const [anomalyPage, setAnomalyPage] = useState(1)
  const [anomalyPageSize, setAnomalyPageSize] = useState(10)
  const [anomalySearchTerm, setAnomalySearchTerm] = useState('')
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState<string>('all')
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState<string>('all')
  
  // 性能分析相关状态
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [performanceError, setPerformanceError] = useState<string | null>(null)
  const [trends, setTrends] = useState<any[]>([])
  
  const { user, isAuthenticated, token } = useAuthStore()

  /**
   * 获取统计数据
   */
  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: StatisticsQueryParams = {
        time_range: timeRange
      }
      
      if (selectedDevice !== 'all') {
        params.device_id = parseInt(selectedDevice)
      }
      
      if (selectedGroup !== 'all') {
        params.group_id = parseInt(selectedGroup)
      }
      
      console.log('统计数据查询参数:', params)
      const data = await dataService.getStatistics(params)
      console.log('获取到的统计数据:', data)
      setStatistics(data || [])
      
    } catch (error: any) {
      console.error('获取统计数据失败:', error)
      let errorMessage = '获取统计数据失败'
      
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = '网络连接失败，请检查后端服务是否正常运行'
      } else if (error.response?.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试'
      } else if (error.response?.data?.detail?.error) {
        errorMessage = error.response.data.detail.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      setStatistics([])
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取异常分析数据
   */
  const fetchAnomalies = async () => {
    try {
      setAnomalyLoading(true)
      setAnomalyError(null)
      
      const params: any = {
        time_range: timeRange
      }
      
      if (selectedDevice !== 'all') {
        params.device_id = parseInt(selectedDevice)
      }
      
      if (selectedGroup !== 'all') {
        params.group_id = parseInt(selectedGroup)
      }
      
      const data = await dataService.getAnomalies(params)
      setAnomalyData(data || { anomalies: [], summary: {} })
      
    } catch (error: any) {
      console.error('获取异常分析数据失败:', error)
      let errorMessage = '获取异常分析数据失败'
      
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = '网络连接失败，请检查后端服务是否正常运行'
      } else if (error.response?.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试'
      } else if (error.response?.data?.detail?.error) {
        errorMessage = error.response.data.detail.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setAnomalyError(errorMessage)
      setAnomalyData({ anomalies: [], summary: {} })
      toast.error(errorMessage)
    } finally {
      setAnomalyLoading(false)
    }
  }

  /**
   * 获取设备列表
   */
  const fetchDevices = async (retryCount = 0) => {
    try {
      const response = await deviceService.getDevices({ page_size: 1000 }) // 获取所有设备
      console.log('获取到的设备数据:', response)
      setDevices(response.data || [])
    } catch (error: any) {
      console.error('获取设备列表失败:', error)
      setDevices([]) // 确保设置为空数组
      
      // 如果是网络错误且重试次数少于3次，则重试
      if (retryCount < 3 && (error.code === 'NETWORK_ERROR' || error.response?.status >= 500)) {
        setTimeout(() => fetchDevices(retryCount + 1), 1000 * (retryCount + 1))
      } else {
        toast.error('获取设备列表失败，请刷新页面重试')
      }
    }
  }

  /**
   * 获取分组列表
   */
  const fetchGroups = async (retryCount = 0) => {
    try {
      // 移除权限检查，所有用户都可以查看分组
      const response = await groupService.getGroups({ page_size: 1000 }) // 获取所有分组
      setGroups(response.data || [])
      console.log('获取到的分组数据:', response.data)
    } catch (error: any) {
      console.error('获取分组列表失败:', error)
      setGroups([]) // 确保设置为空数组
      
      // 如果是网络错误且重试次数少于3次，则重试
      if (retryCount < 3 && (error.code === 'NETWORK_ERROR' || error.response?.status >= 500)) {
        setTimeout(() => fetchGroups(retryCount + 1), 1000 * (retryCount + 1))
      } else {
        toast.error('获取分组列表失败，请刷新页面重试')
      }
    }
  }

  /**
   * 导出统计数据
   */
  const exportStatistics = () => {
    try {
      const csvContent = generateCSV(statistics)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `statistics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('统计数据导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败')
    }
  }

  /**
   * 生成CSV内容
   */
  const generateCSV = (data: StatisticsData[]): string => {
    const headers = ['设备ID', '设备名称', '总数据点', '地址数量', 'PLC类型', '时间范围', '开始时间']
    const rows = data.map(item => [
      item.device_id,
      item.device_name,
      item.statistics?.total_points || 0,
      Object.keys(item.statistics?.addresses || {}).length,
      item.plc_type,
      item.time_range,
      item.start_time || 'N/A'
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * 获取时间范围显示文本
   */
  const getTimeRangeText = (range: string): string => {
    const timeRangeMap = {
      '10m': '最近10分钟',
      '30m': '最近30分钟',
      '1h': '最近1小时',
      '24h': '最近24小时',
      '7d': '最近7天',
      '30d': '最近30天'
    }
    return timeRangeMap[range as keyof typeof timeRangeMap] || range
  }
  
  /**
   * 将时间范围转换为小时数
   */
  const timeRangeToHours = (range: string): number => {
    switch (range) {
      case '10m': return 0.17 // 10分钟
      case '30m': return 0.5 // 30分钟
      case '1h': return 1
      case '24h': return 24
      case '7d': return 168 // 7*24
      case '30d': return 720 // 30*24
      default: return 24
    }
  }
  
  /**
   * 获取性能分析数据
   */
  const fetchPerformanceData = async () => {
    setPerformanceLoading(true)
    setPerformanceError(null)
    
    try {
      const params = {
        hours: timeRangeToHours(timeRange),
        ...(selectedGroup !== 'all' && { group_id: parseInt(selectedGroup) })
      }
      
      const response = await performanceService.getPerformanceOverview(params)
      
      if (response.success) {
        setPerformanceData(response.data)
      } else {
        const errorMessage = response.message || '加载性能数据失败'
        setPerformanceError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error: any) {
      console.error('获取性能概览失败:', error)
      const errorMessage = error.response?.data?.detail?.error || error.response?.data?.message || error.message || '网络错误，请稍后重试'
      setPerformanceError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setPerformanceLoading(false)
    }
  }
  
  /**
   * 获取性能趋势数据
   */
  const fetchTrendsData = async () => {
    try {
      const params = {
        hours: timeRangeToHours(timeRange),
        interval: Math.max(1, Math.floor(timeRangeToHours(timeRange) / 24)), // 动态计算间隔
        ...(selectedGroup !== 'all' && { group_id: parseInt(selectedGroup) }),
        ...(selectedDevice !== 'all' && { device_id: parseInt(selectedDevice) })
      }
      
      const response = await performanceService.getPerformanceTrends(params)
      
      if (response.success) {
        setTrends(response.data?.trends || [])
      } else {
        const errorMessage = response.message || '加载趋势数据失败'
        toast.error(errorMessage)
      }
    } catch (error: any) {
      console.error('获取性能趋势数据失败:', error)
      const errorMessage = error.response?.data?.detail?.error || error.response?.data?.message || error.message || '网络错误，请稍后重试'
      toast.error(errorMessage)
      setTrends([])
    }
  }
  
  /**
   * 获取健康状态颜色和图标
   */
  const getHealthStatus = (score: number) => {
    if (score >= 80) {
      return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: '健康' };
    } else if (score >= 60) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, label: '警告' };
    } else {
      return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: '严重' };
    }
  }

  /**
   * 计算总体统计
   */
  const calculateOverallStats = () => {
    if (statistics.length === 0) {
      return {
        totalPoints: 0,
        avgSuccessRate: 0,
        activeDevices: 0,
        totalDevices: 0
      }
    }
    
    const totalPoints = statistics.reduce((sum, item) => sum + (item.statistics?.total_points || 0), 0)
    // 计算成功率：有数据点的设备视为活跃
    const activeDevices = statistics.filter(item => (item.statistics?.total_points || 0) > 0).length
    const avgSuccessRate = statistics.length > 0 ? activeDevices / statistics.length : 0
    const totalDevices = statistics.length
    
    return {
      totalPoints,
      avgSuccessRate,
      activeDevices,
      totalDevices
    }
  }


  /**
   * 准备图表数据
   */
  const prepareChartData = () => {
    return statistics.map(item => ({
      name: item.device_name,
      device_id: item.device_id,
      total_points: item.statistics?.total_points || 0,
      address_count: Object.keys(item.statistics?.addresses || {}).length,
      plc_type: item.plc_type
    }))
  }

  /**
   * 准备饼图数据
   */
  const preparePieData = () => {
    const overallStats = calculateOverallStats()
    return [
      {
        name: '活跃设备',
        value: overallStats.activeDevices,
        color: '#10b981'
      },
      {
        name: '非活跃设备',
        value: overallStats.totalDevices - overallStats.activeDevices,
        color: '#ef4444'
      }
    ]
  }

  /**
   * 准备PLC类型分布数据
   */
  const preparePlcTypeData = () => {
    const typeCount: { [key: string]: number } = {}
    statistics.forEach(item => {
      const type = item.plc_type || '未知'
      typeCount[type] = (typeCount[type] || 0) + 1
    })
    
    return Object.entries(typeCount).map(([type, count]) => ({
      name: type,
      value: count,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`
    }))
  }

  /**
   * 过滤异常数据
   */
  const filteredAnomalies = useMemo(() => {
    if (!anomalyData?.anomalies) return []
    
    return anomalyData.anomalies.filter((anomaly: any) => {
      // 搜索过滤
      const searchMatch = anomalySearchTerm === '' || 
        anomaly.device_name?.toLowerCase().includes(anomalySearchTerm.toLowerCase()) ||
        anomaly.address?.toLowerCase().includes(anomalySearchTerm.toLowerCase()) ||
        anomaly.anomaly_description?.toLowerCase().includes(anomalySearchTerm.toLowerCase())
      
      // 严重程度过滤
      const severityMatch = anomalySeverityFilter === 'all' || anomaly.severity === anomalySeverityFilter
      
      // 异常类型过滤
      const typeMatch = anomalyTypeFilter === 'all' || anomaly.anomaly_type === anomalyTypeFilter
      
      return searchMatch && severityMatch && typeMatch
    })
  }, [anomalyData?.anomalies, anomalySearchTerm, anomalySeverityFilter, anomalyTypeFilter])

  /**
   * 分页异常数据
   */
  const paginatedAnomalies = useMemo(() => {
    const startIndex = (anomalyPage - 1) * anomalyPageSize
    const endIndex = startIndex + anomalyPageSize
    return filteredAnomalies.slice(startIndex, endIndex)
  }, [filteredAnomalies, anomalyPage, anomalyPageSize])

  /**
   * 计算总页数
   */
  const totalPages = Math.ceil(filteredAnomalies.length / anomalyPageSize)

  /**
   * 重置异常分析过滤条件
   */
  const resetAnomalyFilters = () => {
    setAnomalySearchTerm('')
    setAnomalySeverityFilter('all')
    setAnomalyTypeFilter('all')
    setAnomalyPage(1)
  }

  /**
   * 获取异常类型名称
   */
  const getTypeName = (type: string) => {
    switch (type) {
      case 'value_spike': return '数值突变'
      case 'data_interruption': return '数据中断'
      case 'out_of_range': return '超范围值'
      case 'communication_error': return '通信异常'
      default: return '未知异常'
    }
  }

  /**
   * 获取异常类型图标
   */
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'value_spike': return <TrendingUp className="h-4 w-4" />
      case 'data_interruption': return <Activity className="h-4 w-4" />
      case 'out_of_range': return <BarChart3 className="h-4 w-4" />
      case 'communication_error': return <AlertTriangle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  /**
   * 获取严重程度颜色
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // 页面加载时获取数据
  useEffect(() => {
    fetchDevices()
    fetchGroups()
  }, [])

  // 当筛选条件变化时重新获取数据
  useEffect(() => {
    fetchStatistics()
    fetchAnomalies()
    fetchPerformanceData()
    fetchTrendsData()
  }, [selectedDevice, selectedGroup, timeRange])

  const overallStats = calculateOverallStats()
  const chartData = prepareChartData()
  const pieData = preparePieData()

  return (
    <AuthGuard>
      <MainLayout>
        <div className="w-full max-w-none p-6 space-y-6">
          {/* 页面标题 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">数据统计</h1>
                    <p className="text-blue-600 mt-1 font-medium">
                      查看和分析设备数据采集统计信息
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchStatistics()
                    fetchAnomalies()
                  }}
                  disabled={loading || anomalyLoading}
                  className="bg-white hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(loading || anomalyLoading) ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportStatistics}
                  disabled={loading || statistics.length === 0}
                  className="bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出数据
                </Button>
              </div>
            </div>
          </div>

          {/* 筛选条件 */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Filter className="h-5 w-5 mr-2" />
                筛选条件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 时间范围选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">时间范围</label>
                  <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10m">最近10分钟</SelectItem>
                      <SelectItem value="30m">最近30分钟</SelectItem>
                      <SelectItem value="1h">最近1小时</SelectItem>
                      <SelectItem value="24h">最近24小时</SelectItem>
                      <SelectItem value="7d">最近7天</SelectItem>
                      <SelectItem value="30d">最近30天</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 分组选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">分组</label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部分组</SelectItem>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 设备选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">设备</label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部设备</SelectItem>
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id.toString()}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setError(null)
                    fetchStatistics()
                  }}
                  className="ml-4"
                >
                  重试
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* 总体统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">总数据点</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">{overallStats.totalPoints.toLocaleString()}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {getTimeRangeText(timeRange)}采集的数据点总数
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">平均成功率</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">
                {(overallStats.avgSuccessRate * 100).toFixed(1)}%
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              数据采集平均成功率
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">活跃设备</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">
                {overallStats.activeDevices}/{overallStats.totalDevices}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              有数据采集的设备数量
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">时间范围</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{getTimeRangeText(timeRange)}</div>
            <p className="text-xs text-gray-500 mt-1">
              当前统计时间范围
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 图表和详细数据 */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">图表分析</TabsTrigger>
          <TabsTrigger value="details">详细数据</TabsTrigger>
          <TabsTrigger value="data">表格数据</TabsTrigger>
          <TabsTrigger value="anomalies">异常分析</TabsTrigger>
          <TabsTrigger value="performance">性能分析</TabsTrigger>
        </TabsList>

        {/* 图表分析 */}
        <TabsContent value="charts" className="space-y-4 lg:space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            {/* 数据点统计柱状图 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  设备数据点统计
                </CardTitle>
                <CardDescription>
                  各设备在{getTimeRangeText(timeRange)}内的数据点采集情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis yAxisId="left" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_points" fill="#3b82f6" name="数据点数" yAxisId="left" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 地址数量统计折线图 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  设备地址数量统计
                </CardTitle>
                <CardDescription>
                  各设备配置的地址数量趋势
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis yAxisId="left" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} />
                      <Tooltip formatter={(value) => [value, '地址数量']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="address_count" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="地址数量"
                        yAxisId="left"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 设备活跃状态饼图 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Activity className="h-5 w-5 mr-2" />
                  设备活跃状态分布
                </CardTitle>
                <CardDescription>
                  活跃设备与非活跃设备的比例
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : pieData.some(item => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PLC类型分布统计 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Monitor className="h-5 w-5 mr-2" />
                  PLC类型分布
                </CardTitle>
                <CardDescription>
                  各设备的PLC类型分布情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-80 w-full" />
                ) : statistics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={preparePlcTypeData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      />
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 详细数据 */}
        <TabsContent value="details">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Monitor className="h-5 w-5 mr-2" />
                设备统计详情
              </CardTitle>
              <CardDescription>
                {getTimeRangeText(timeRange)}内各设备的详细统计数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : statistics.length > 0 ? (
                <div className="space-y-4">
                  {statistics.map((item) => (
                    <Card key={item.device_id} className="p-4 border-0 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">{item.device_name}</h3>
                          <Badge variant="outline">ID: {item.device_id}</Badge>
                          <Badge 
                          variant={(item.statistics?.total_points || 0) > 0 ? 'default' : 'destructive'}
                        >
                          状态: {(item.statistics?.total_points || 0) > 0 ? '有数据' : '无数据'}
                        </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">总数据点:</span>
                          <div className="font-medium">{(item.statistics?.total_points || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">地址数量:</span>
                          <div className="font-medium">{Object.keys(item.statistics?.addresses || {}).length}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">时间范围:</span>
                          <div className="font-medium">{item.time_range}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PLC类型:</span>
                          <div className="font-medium">{item.plc_type}</div>
                        </div>
                      </div>
                      
                      {item.end_time && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          最后采集时间: {new Date(item.end_time).toLocaleString()}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">暂无统计数据</h3>
                  <p className="text-sm text-muted-foreground">
                    请检查筛选条件或确认设备是否有数据采集
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 表格数据 */}
        <TabsContent value="data">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <BarChart3 className="h-5 w-5 mr-2" />
                详细数据
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
                  ))}
                </div>
              ) : statistics.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    <table className="w-full border-collapse border border-gray-200 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-2 sm:px-4 py-2 text-left font-medium">设备名称</th>
                          <th className="border border-gray-200 px-2 sm:px-4 py-2 text-left font-medium">总数据点</th>
                          <th className="border border-gray-200 px-2 sm:px-4 py-2 text-left font-medium">地址数量</th>
                          <th className="border border-gray-200 px-2 sm:px-4 py-2 text-left font-medium hidden sm:table-cell">PLC类型</th>
                          <th className="border border-gray-200 px-2 sm:px-4 py-2 text-left font-medium hidden sm:table-cell">时间范围</th>
                          <th className="border border-gray-200 px-2 sm:px-4 py-2 text-left font-medium hidden md:table-cell">状态</th>
                          <th className="border border-gray-200 px-2 sm:px-4 py-2 text-left font-medium hidden lg:table-cell">开始时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.map((stat) => (
                          <tr key={stat.device_id} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-2 sm:px-4 py-2 font-medium">{stat.device_name}</td>
                            <td className="border border-gray-200 px-2 sm:px-4 py-2">{stat.statistics?.total_points || 0}</td>
                            <td className="border border-gray-200 px-2 sm:px-4 py-2">{Object.keys(stat.statistics?.addresses || {}).length}</td>
                            <td className="border border-gray-200 px-2 sm:px-4 py-2 hidden sm:table-cell">{stat.plc_type}</td>
                            <td className="border border-gray-200 px-2 sm:px-4 py-2 hidden sm:table-cell">{stat.time_range}</td>
                            <td className="border border-gray-200 px-2 sm:px-4 py-2 hidden md:table-cell">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                (stat.statistics?.total_points || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {(stat.statistics?.total_points || 0) > 0 ? '有数据' : '无数据'}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-2 sm:px-4 py-2 hidden lg:table-cell text-xs">
                              {stat.start_time ? new Date(stat.start_time).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

        {/* 异常分析 */}
        <TabsContent value="anomalies" className="space-y-4 lg:space-y-6">
          {/* 异常统计概览 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">异常总数</CardTitle>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                {anomalyLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">
                    {anomalyData?.summary?.total_anomalies || 0}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {getTimeRangeText(timeRange)}检测到的异常数量
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">数值突变</CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                {anomalyLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">
                    {anomalyData?.summary?.anomaly_types?.value_spike || 0}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  数值异常突变次数
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">数据中断</CardTitle>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Activity className="h-4 w-4 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                {anomalyLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">
                    {anomalyData?.summary?.anomaly_types?.data_interruption || 0}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  数据采集中断次数
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">超范围值</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                {anomalyLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">
                    {anomalyData?.summary?.anomaly_types?.out_of_range || 0}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  数值超出正常范围次数
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 异常错误提示 */}
            {anomalyError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{anomalyError}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setAnomalyError(null)
                      fetchAnomalies()
                    }}
                    className="ml-4"
                  >
                    重试
                  </Button>
                </AlertDescription>
              </Alert>
            )}

          {/* 异常列表 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center text-lg">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    异常详情列表
                  </CardTitle>
                  <CardDescription>
                    显示{getTimeRangeText(timeRange)}内检测到的异常情况 
                    {filteredAnomalies.length > 0 && (
                      <span className="ml-2 text-sm font-medium">
                        (共 {filteredAnomalies.length} 条，显示第 {(anomalyPage - 1) * anomalyPageSize + 1}-{Math.min(anomalyPage * anomalyPageSize, filteredAnomalies.length)} 条)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAnomalyFilters}
                  disabled={anomalySearchTerm === '' && anomalySeverityFilter === 'all' && anomalyTypeFilter === 'all'}
                >
                  重置筛选
                </Button>
              </div>
              
              {/* 搜索和过滤条件 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索设备名称、地址或描述..."
                    value={anomalySearchTerm}
                    onChange={(e) => {
                      setAnomalySearchTerm(e.target.value)
                      setAnomalyPage(1) // 重置到第一页
                    }}
                    className="pl-10"
                  />
                </div>
                
                {/* 严重程度过滤 */}
                <Select value={anomalySeverityFilter} onValueChange={(value) => {
                  setAnomalySeverityFilter(value)
                  setAnomalyPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="严重程度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部严重程度</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 异常类型过滤 */}
                <Select value={anomalyTypeFilter} onValueChange={(value) => {
                  setAnomalyTypeFilter(value)
                  setAnomalyPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="异常类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="value_spike">数值突变</SelectItem>
                    <SelectItem value="data_interruption">数据中断</SelectItem>
                    <SelectItem value="out_of_range">超范围值</SelectItem>
                    <SelectItem value="communication_error">通信异常</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 每页显示数量 */}
                <Select value={anomalyPageSize.toString()} onValueChange={(value) => {
                  setAnomalyPageSize(parseInt(value))
                  setAnomalyPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">每页 5 条</SelectItem>
                    <SelectItem value="10">每页 10 条</SelectItem>
                    <SelectItem value="20">每页 20 条</SelectItem>
                    <SelectItem value="50">每页 50 条</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {anomalyLoading ? (
                <div className="space-y-3">
                  {[...Array(anomalyPageSize)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[60%]" />
                        <Skeleton className="h-4 w-[40%]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : paginatedAnomalies.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {paginatedAnomalies.map((anomaly: any, index: number) => (
                      <div key={`${anomaly.device_id}-${anomaly.timestamp}-${index}`} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              anomaly.anomaly_type === 'value_spike' ? 'bg-orange-100 text-orange-600' :
                              anomaly.anomaly_type === 'data_interruption' ? 'bg-yellow-100 text-yellow-600' :
                              anomaly.anomaly_type === 'out_of_range' ? 'bg-purple-100 text-purple-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {getTypeIcon(anomaly.anomaly_type)}
                            </div>
                            <div>
                              <h4 className="font-medium">{anomaly.device_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                地址: {anomaly.address} | 设备ID: {anomaly.device_id}
                              </p>
                            </div>
                          </div>
                          <Badge className={getSeverityColor(anomaly.severity)}>
                            {anomaly.severity === 'high' ? '高' : anomaly.severity === 'medium' ? '中' : '低'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">异常类型:</span>
                            <span className="ml-2">{getTypeName(anomaly.anomaly_type)}</span>
                          </div>
                          <div>
                            <span className="font-medium">发生时间:</span>
                            <span className="ml-2">{new Date(anomaly.timestamp).toLocaleString('zh-CN')}</span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium">异常描述:</span>
                            <span className="ml-2">{anomaly.anomaly_description}</span>
                          </div>
                          {anomaly.value !== undefined && (
                            <div>
                              <span className="font-medium">异常值:</span>
                              <span className="ml-2 font-mono">{anomaly.value}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 分页控件 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        显示第 {(anomalyPage - 1) * anomalyPageSize + 1}-{Math.min(anomalyPage * anomalyPageSize, filteredAnomalies.length)} 条，共 {filteredAnomalies.length} 条
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAnomalyPage(1)}
                          disabled={anomalyPage === 1}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAnomalyPage(prev => Math.max(1, prev - 1))}
                          disabled={anomalyPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (anomalyPage <= 3) {
                              pageNum = i + 1
                            } else if (anomalyPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = anomalyPage - 2 + i
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === anomalyPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAnomalyPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAnomalyPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={anomalyPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAnomalyPage(totalPages)}
                          disabled={anomalyPage === totalPages}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {anomalyData?.anomalies?.length > 0 ? (
                    <div>
                      <p className="mb-2">没有找到符合条件的异常数据</p>
                      <Button variant="outline" size="sm" onClick={resetAnomalyFilters}>
                        清除筛选条件
                      </Button>
                    </div>
                  ) : (
                    <p>在{getTimeRangeText(timeRange)}内未检测到异常</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 性能分析标签页 */}
        <TabsContent value="performance" className="space-y-4">
          {/* 错误提示 */}
            {performanceError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{performanceError}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setPerformanceError(null)
                      fetchPerformanceData()
                    }}
                    className="ml-4"
                  >
                    重试
                  </Button>
                </AlertDescription>
              </Alert>
            )}

          {/* 性能概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">设备总数</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{performanceData?.summary?.total_devices || 0}</div>
                )}
                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                    健康 {performanceData?.summary?.healthy_devices || 0}
                  </span>
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1"></div>
                    警告 {performanceData?.summary?.warning_devices || 0}
                  </span>
                  <span className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                    严重 {performanceData?.summary?.critical_devices || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均正常运行时间</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{performanceData?.summary?.avg_uptime?.toFixed(1) || 0}%</div>
                )}
                <Progress 
                  value={performanceData?.summary?.avg_uptime || 0} 
                  className="h-1.5 mt-2" 
                />
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均响应时间</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{performanceData?.summary?.avg_response_time?.toFixed(0) || 0}ms</div>
                )}
                <div className="flex items-center space-x-1 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    (performanceData?.summary?.avg_response_time || 0) <= 200 ? 'bg-green-500' : 
                    (performanceData?.summary?.avg_response_time || 0) <= 500 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <p className="text-xs text-gray-500">
                    {(performanceData?.summary?.avg_response_time || 0) <= 200 ? '响应良好' : 
                     (performanceData?.summary?.avg_response_time || 0) <= 500 ? '响应一般' : '响应较慢'}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均采集成功率</CardTitle>
                <CheckCircle className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{performanceData?.summary?.avg_collection_rate?.toFixed(1) || 0}%</div>
                )}
                <Progress 
                  value={performanceData?.summary?.avg_collection_rate || 0} 
                  className="h-1.5 mt-2" 
                />
              </CardContent>
            </Card>
          </div>

          {/* 性能详情 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 设备健康状态 */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <Activity className="h-5 w-5 mr-2 text-gray-600" />
                  设备健康状态
                </CardTitle>
                <CardDescription className="text-gray-500 text-sm mt-1">
                  各设备的健康评分和状态分布
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : performanceData?.devices && performanceData.devices.length > 0 ? (
                  <div className="space-y-4">
                    {performanceData.devices.slice(0, 5).map((device: any) => {
                      const status = getHealthStatus(device.health_score || 0);
                      const StatusIcon = status.icon;
                      return (
                        <div key={device.device_id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${status.bg}`}>
                              <StatusIcon className={`h-4 w-4 ${status.color}`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{device.device_name}</h4>
                              <p className="text-xs text-gray-500">设备ID: {device.device_id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">{device.health_score?.toFixed(0) || 0}</div>
                            <Badge variant="outline" className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无设备性能数据</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 性能趋势图表 */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <TrendingUp className="h-5 w-5 mr-2 text-gray-600" />
                  性能趋势分析
                </CardTitle>
                <CardDescription className="text-gray-500 text-sm mt-1">
                  {getTimeRangeText(timeRange)}内的性能变化趋势
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : trends && trends.length > 0 ? (
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={(value) => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          fontSize={11}
                          stroke="#9ca3af"
                        />
                        <YAxis yAxisId="left" fontSize={11} stroke="#9ca3af" />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#9ca3af" />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString('zh-CN')}
                          formatter={(value: any, name: string) => [
                            name === 'avg_response_time' ? `${value?.toFixed(0)}ms` : 
                            name === 'avg_uptime' ? `${value?.toFixed(1)}%` : 
                            `${value?.toFixed(1)}%`,
                            name === 'avg_response_time' ? '平均响应时间' :
                            name === 'avg_uptime' ? '平均正常运行时间' :
                            '平均采集成功率'
                          ]}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        />
                        <Legend fontSize={12} />
                        <Line 
                          type="monotone" 
                          dataKey="avg_response_time" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          name="平均响应时间(ms)"
                          yAxisId="left"
                          dot={false}
                          activeDot={{ r: 4, stroke: '#f59e0b' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avg_uptime" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="平均正常运行时间(%)"
                          yAxisId="right"
                          dot={false}
                          activeDot={{ r: 4, stroke: '#10b981' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avg_collection_rate" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="平均采集成功率(%)"
                          yAxisId="right"
                          dot={false}
                          activeDot={{ r: 4, stroke: '#3b82f6' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
                    <TrendingUp className="h-12 w-12 mb-3" />
                    <p className="text-sm font-medium">暂无趋势数据</p>
                    <p className="text-xs mt-1">请选择不同的时间范围或设备筛选条件</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 性能排行榜 */}
          {performanceData?.summary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 最佳性能设备 */}
              <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    最佳性能设备
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">
                    健康评分最高的设备
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceData.summary.top_performers && performanceData.summary.top_performers.length > 0 ? (
                    <div className="space-y-4">
                      {performanceData.summary.top_performers.map((device: any, index: number) => (
                        <div key={device.device_id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{device.device_name}</h4>
                              <p className="text-xs text-gray-500">设备ID: {device.device_id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">{device.health_score?.toFixed(0)}</div>
                            <p className="text-xs text-gray-500">健康评分</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                      <p className="text-sm font-medium">暂无数据</p>
                      <p className="text-xs mt-1">当前筛选条件下没有找到设备</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 需要关注的设备 */}
              <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    需要关注的设备
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">
                    健康评分较低的设备
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceData.summary.poor_performers && performanceData.summary.poor_performers.length > 0 ? (
                    <div className="space-y-4">
                      {performanceData.summary.poor_performers.map((device: any, index: number) => (
                        <div key={device.device_id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{device.device_name}</h4>
                              <p className="text-xs text-gray-500">设备ID: {device.device_id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">{device.health_score?.toFixed(0)}</div>
                            <p className="text-xs text-gray-500">健康评分</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
                      <p className="text-sm font-medium">暂无数据</p>
                      <p className="text-xs mt-1">所有设备运行状态良好</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

          </Tabs>
        </div>
        
      </MainLayout>
    </AuthGuard>
  )
}