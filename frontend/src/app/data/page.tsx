'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { apiService } from '@/services/api'
import { Device, Group, DataPoint } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import {
  Search,
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  BarChart3,
  Filter,
  Eye,
  Zap,
  Signal,
  Wifi,
  WifiOff,
  Target,
} from 'lucide-react'

/**
 * 数据监控页面组件
 * 实时显示设备数据点的值和状态
 */
export default function DataPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [deviceFilter, setDeviceFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5秒
  
  // 获取设备列表
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => apiService.getDevices({ page: 1, page_size: 100 }),
  })

  // 获取分组列表
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiService.getGroups({ page: 1, page_size: 100 }),
  })

  // 获取数据点列表
  const {
    data: dataPointsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['data-points', { search: searchTerm, device: deviceFilter, group: groupFilter }],
    queryFn: () => apiService.getDataPoints({ 
      page: 1, 
      page_size: 100,
      search: searchTerm || undefined,
      device_id: deviceFilter !== 'all' ? parseInt(deviceFilter) : undefined,
      group_id: groupFilter !== 'all' ? parseInt(groupFilter) : undefined,
    }),
    refetchInterval: autoRefresh ? refreshInterval : false,
  })

  /**
   * 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  /**
   * 处理设备筛选
   */
  const handleDeviceFilter = (value: string) => {
    setDeviceFilter(value)
  }

  /**
   * 处理分组筛选
   */
  const handleGroupFilter = (value: string) => {
    setGroupFilter(value)
  }

  /**
   * 切换自动刷新
   */
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
  }

  /**
   * 获取设备名称
   */
  const getDeviceName = (deviceId: number) => {
    const device = devicesData?.data?.find((d: Device) => d.id === deviceId)
    return device?.name || '未知设备'
  }

  /**
   * 获取分组名称
   */
  const getGroupName = (groupId: number | null) => {
    if (!groupId) return '未分组'
    const group = groupsData?.data?.find((g: Group) => g.id === groupId)
    return group?.name || '未知分组'
  }

  /**
   * 获取数据类型显示信息
   */
  const getDataTypeInfo = (dataType: string) => {
    switch (dataType) {
      case 'boolean':
        return { label: '布尔', color: 'bg-blue-100 text-blue-800' }
      case 'integer':
        return { label: '整数', color: 'bg-green-100 text-green-800' }
      case 'float':
        return { label: '浮点', color: 'bg-purple-100 text-purple-800' }
      case 'string':
        return { label: '字符串', color: 'bg-yellow-100 text-yellow-800' }
      default:
        return { label: '未知', color: 'bg-gray-100 text-gray-800' }
    }
  }

  /**
   * 获取质量状态显示信息
   */
  const getQualityInfo = (quality: string) => {
    switch (quality) {
      case 'good':
        return { label: '良好', variant: 'default' as const, icon: CheckCircle }
      case 'bad':
        return { label: '错误', variant: 'destructive' as const, icon: AlertTriangle }
      case 'uncertain':
        return { label: '不确定', variant: 'secondary' as const, icon: Clock }
      default:
        return { label: '未知', variant: 'outline' as const, icon: AlertTriangle }
    }
  }

  /**
   * 格式化数据值
   */
  const formatValue = (value: any, dataType: string) => {
    if (value === null || value === undefined) {
      return '-'
    }

    switch (dataType) {
      case 'boolean':
        return value ? '真' : '假'
      case 'float':
        return typeof value === 'number' ? value.toFixed(2) : value.toString()
      case 'integer':
        return value.toString()
      case 'string':
        return value.toString()
      default:
        return value.toString()
    }
  }

  /**
   * 获取趋势图标
   */
  const getTrendIcon = (current: any, previous: any) => {
    if (current === null || previous === null || current === undefined || previous === undefined) {
      return Minus
    }

    const currentNum = parseFloat(current)
    const previousNum = parseFloat(previous)

    if (isNaN(currentNum) || isNaN(previousNum)) {
      return Minus
    }

    if (currentNum > previousNum) {
      return TrendingUp
    } else if (currentNum < previousNum) {
      return TrendingDown
    } else {
      return Minus
    }
  }

  const dataPoints = dataPointsData?.data || []
  const devices = devicesData?.data || []
  const groups = groupsData?.data || []

  // 统计信息
  const totalPoints = dataPoints.length
  const goodQualityPoints = dataPoints.filter((dp: DataPoint) => dp.quality === 'good').length
  const badQualityPoints = dataPoints.filter((dp: DataPoint) => dp.quality === 'bad').length
  const uncertainQualityPoints = dataPoints.filter((dp: DataPoint) => dp.quality === 'uncertain').length

  return (
    <div className="p-4 lg:p-6 space-y-6">
          {/* 页面标题 - Novara风格 */}
          <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl tracking-tight text-white">数据监控</h1>
                <p className="text-sm md:text-base text-white/70 font-medium mt-1">
                  实时监控 {totalPoints} 个数据点的值和状态
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className={`glass-surface-light rounded-2xl px-4 py-3 flex items-center gap-3 ${
                  autoRefresh ? 'ring-1 ring-emerald-500/30' : ''
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    autoRefresh ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-zinc-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    autoRefresh ? 'text-emerald-400' : 'text-zinc-400'
                  }`}>
                    {autoRefresh ? '实时监控' : '手动模式'}
                  </span>
                  <Signal className={`h-4 w-4 ${
                    autoRefresh ? 'text-emerald-500' : 'text-zinc-500'
                  }`} />
                </div>

                <Button
                  variant={autoRefresh ? "glass-primary" : "glass"}
                  size="default"
                  onClick={toggleAutoRefresh}
                  className="flex items-center gap-2"
                >
                  <Activity className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                  {autoRefresh ? '停止自动刷新' : '启动自动刷新'}
                </Button>

                <Button
                  variant="glass"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  立即刷新
                </Button>
              </div>
            </div>
          </div>

          {/* 统计卡片 - Novara风格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 animate-[fadeInUp_0.6s_ease-out_0.4s_both]">
            <div className="glass-card rounded-3xl p-6 group hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-white/60 mb-1">总数据点</h3>
                  <div className="text-3xl font-bold text-white">{totalPoints}</div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30 group-hover:ring-blue-500/50 transition-all">
                  <Database className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Target className="h-3 w-3" />
                当前监控的数据点总数
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 group hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-white/60 mb-1">良好质量</h3>
                  <div className="text-3xl font-bold text-white">{goodQualityPoints}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 group-hover:ring-emerald-500/50 transition-all">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Wifi className="h-3 w-3" />
                质量状态良好的数据点
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 group hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-white/60 mb-1">错误质量</h3>
                  <div className="text-3xl font-bold text-white">{badQualityPoints}</div>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/20 backdrop-blur ring-1 ring-red-500/30 group-hover:ring-red-500/50 transition-all">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <WifiOff className="h-3 w-3" />
                质量状态错误的数据点
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 group hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-white/60 mb-1">不确定质量</h3>
                  <div className="text-3xl font-bold text-white">{uncertainQualityPoints}</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/20 backdrop-blur ring-1 ring-amber-500/30 group-hover:ring-amber-500/50 transition-all">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Zap className="h-3 w-3" />
                质量状态不确定的数据点
              </div>
            </div>
          </div>

          {/* 搜索和筛选 - Novara风格 */}
          <div className="glass-card rounded-3xl p-6 lg:p-8 animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-500/20 backdrop-blur ring-1 ring-indigo-500/30">
                <Filter className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">搜索和筛选</h3>
                <p className="text-white/60 text-sm mt-1 flex items-center gap-2">
                  <Search className="h-4 w-4 text-indigo-400" />
                  根据数据点名称、设备或分组筛选数据
                </p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4 group-focus-within:text-indigo-400 transition-colors" />
                  <Input
                    placeholder="搜索数据点名称或地址..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-12 glass-surface-light border-0 focus:ring-1 focus:ring-indigo-500/50 text-white placeholder-white/60"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Select value={groupFilter} onValueChange={handleGroupFilter}>
                  <SelectTrigger className="w-[180px] glass-surface-light border-0 focus:ring-1 focus:ring-indigo-500/50 text-white">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-indigo-400" />
                      <SelectValue placeholder="选择分组" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="glass-surface border-0">
                    <SelectItem value="all">所有分组</SelectItem>
                    <SelectItem value="0">未分组</SelectItem>
                    {groups.map((group: Group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={deviceFilter} onValueChange={handleDeviceFilter}>
                  <SelectTrigger className="w-[180px] glass-surface-light border-0 focus:ring-1 focus:ring-emerald-500/50 text-white">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-emerald-400" />
                      <SelectValue placeholder="选择设备" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="glass-surface border-0">
                    <SelectItem value="all">所有设备</SelectItem>
                    {devices.map((device: Device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 数据点列表 - Novara风格 */}
          <div className="glass-card rounded-3xl p-6 lg:p-8 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                <Database className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
                  <span>数据点列表</span>
                  <span className="text-sm font-normal text-white/60">
                    ({dataPoints.length} 个数据点)
                  </span>
                  {autoRefresh && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-surface-light text-sm text-emerald-400">
                      <Activity className="h-3 w-3 animate-pulse" />
                      每 {refreshInterval / 1000}s 刷新
                    </div>
                  )}
                </h3>
                <p className="text-white/60 text-sm mt-1 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  实时监控设备数据点的当前值和质量状态
                </p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden">
              {error ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 backdrop-blur ring-1 ring-red-500/30 mb-6">
                    <AlertTriangle className="h-10 w-10 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">加载数据点失败</h3>
                  <p className="text-white/60 mb-6">请检查网络连接或稍后重试</p>
                  <Button
                    variant="glass-primary"
                    onClick={() => refetch()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    重试
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">数据点名称</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">设备</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">分组</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">地址</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">数据类型</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">当前值</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">质量</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">趋势</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/80">更新时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={9} className="text-center py-16">
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 rounded-full bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 flex items-center justify-center mb-4">
                                <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
                              </div>
                              <p className="text-white font-medium">正在加载数据点...</p>
                              <p className="text-sm text-white/60 mt-1">请稍候</p>
                            </div>
                          </td>
                        </tr>
                      ) : dataPoints.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-16">
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 rounded-full bg-zinc-500/20 backdrop-blur ring-1 ring-zinc-500/30 flex items-center justify-center mb-4">
                                <Database className="h-8 w-8 text-zinc-400" />
                              </div>
                              <p className="text-white font-medium">暂无数据点</p>
                              <p className="text-sm text-white/60 mt-2">
                                {searchTerm || deviceFilter !== 'all' || groupFilter !== 'all'
                                  ? '没有找到匹配的数据点，请检查筛选条件'
                                  : '请添加数据点以开始监控'
                                }
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        dataPoints.map((dataPoint: DataPoint, index: number) => {
                          const dataTypeInfo = getDataTypeInfo(dataPoint.data_type)
                          const qualityInfo = getQualityInfo(dataPoint.quality)
                          const TrendIcon = getTrendIcon(dataPoint.current_value, dataPoint.previous_value)
                          const device = devices.find((d: Device) => d.id === dataPoint.device_id)

                          return (
                            <tr key={dataPoint.id} className={`border-b border-white/5 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'} hover:bg-white/[0.05]`}>
                              <td className="px-6 py-4 font-medium text-white">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30"></div>
                                  <span>{dataPoint.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-white/80">
                                <div className="flex items-center space-x-2">
                                  <Database className="h-4 w-4 text-emerald-400" />
                                  <span>{getDeviceName(dataPoint.device_id)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-white/80">
                                <div className="flex items-center space-x-2">
                                  <Target className="h-4 w-4 text-indigo-400" />
                                  <span>{getGroupName(device?.group_id || null)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm glass-surface-light px-3 py-1 rounded-xl text-white/80">
                                  {dataPoint.address}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${dataTypeInfo.color.replace(/text-\w+-800/, 'text-white').replace(/bg-\w+-100/, 'bg-white/20 backdrop-blur ring-1 ring-white/30')}`}>
                                  {dataTypeInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold text-white">
                                {formatValue(dataPoint.current_value, dataPoint.data_type)}
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium glass-surface-light ${
                                  qualityInfo.variant === 'destructive' ? 'text-red-400 ring-1 ring-red-500/30' :
                                  qualityInfo.variant === 'default' ? 'text-emerald-400 ring-1 ring-emerald-500/30' :
                                  'text-amber-400 ring-1 ring-amber-500/30'
                                }`}>
                                  <qualityInfo.icon className="h-3 w-3" />
                                  <span>{qualityInfo.label}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center">
                                  <TrendIcon className="h-4 w-4 text-white/60" />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-1 text-sm text-white/60">
                                  <Clock className="h-3 w-3" />
                                  <span>{dataPoint.updated_at ? formatDateTime(dataPoint.updated_at) : '-'}</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
  )
}