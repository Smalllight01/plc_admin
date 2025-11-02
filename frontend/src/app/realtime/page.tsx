'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { apiService } from '@/services/api'
import { Device, Group } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import {
  Search,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
  Settings,
  Eye,
  Clock,
  MapPin,
  Cpu,
  Network,
  Grid3X3,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Filter,
  SortAsc,
  SortDesc,
  Zap,
  Signal,
  AlertTriangle,
} from 'lucide-react'

/**
 * 设备状态徽章组件 - 优化版本
 */
function DeviceStatusBadge({ status, isConnected }: { status: string; isConnected: boolean }) {
  if (!isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-btn border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium animate-pulse">
        <WifiOff className="h-3 w-3" />
        离线
      </div>
    )
  }

  switch (status) {
    case 'online':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-btn border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
          <Signal className="h-3 w-3" />
          在线
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-btn border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium animate-pulse">
          <AlertTriangle className="h-3 w-3" />
          错误
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-btn border-white/20 bg-white/10 text-white/60 text-xs font-medium">
          <Clock className="h-3 w-3" />
          未知
        </div>
      )
  }
}

/**
 * 紧凑型设备卡片组件 - 优化版本
 */
function CompactDeviceCard({ device, onClick }: { device: Device; onClick: () => void }) {
  const [realtimeData, setRealtimeData] = useState<any>(null)

  // 获取设备实时数据
  const { data: deviceData } = useQuery({
    queryKey: ['realtime-data', device.id],
    queryFn: () => apiService.getRealtimeData({ device_id: device.id }),
    refetchInterval: 3000,
    enabled: device.is_active && device.is_connected && device.status === 'online',
  })

  useEffect(() => {
    if (deviceData?.realtime_data) {
      const currentDeviceData = deviceData.realtime_data.find(
        (item: any) => item.device_id === device.id
      )
      setRealtimeData(currentDeviceData)
    }
  }, [deviceData, device.id])

  const addresses = (() => {
    if (!device.addresses) return []
    if (Array.isArray(device.addresses)) return device.addresses
    try {
      return JSON.parse(device.addresses)
    } catch (error) {
      console.error('Failed to parse device addresses:', error)
      return []
    }
  })()
  const activeAddresses = addresses.filter((addr: any) => addr.name).length
  const dataCount = realtimeData?.data?.length || 0
  const isOnline = device.is_connected && device.status === 'online'
  const latestValue = realtimeData?.data?.[0]?.value

  return (
    <div className={`glass-card rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-[fadeInUp_0.6s_ease-out_both] border-l-4 ${
      isOnline ? 'border-l-emerald-500' : 'border-l-red-500'
    }`} onClick={onClick}>
      <div className="space-y-3">
        {/* 标题行 */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
              {device.name}
            </h3>
            <p className="text-xs text-white/60 font-mono mt-1">{device.ip_address}</p>
          </div>
          <DeviceStatusBadge status={device.status || 'unknown'} isConnected={device.is_connected} />
        </div>

        {/* 数据指标 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-white/60">
              <MapPin className="h-3 w-3" />
              {activeAddresses}/{addresses.length}
            </span>
            {dataCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Zap className="h-3 w-3" />
                {dataCount}
              </span>
            )}
          </div>
          {latestValue !== undefined && (
            <span className="text-xs font-mono glass-btn border-blue-500/30 bg-blue-500/10 text-blue-400 px-2 py-1 rounded">
              {String(latestValue)}
            </span>
          )}
        </div>

        {/* PLC类型 */}
        <div className="text-xs text-white/60 glass-btn border-white/10 bg-white/5 px-2 py-1 rounded truncate">
          {device.plc_type}
        </div>
      </div>
    </div>
  )
}

/**
 * 列表视图设备行组件
 */
function DeviceListRow({ device, onClick }: { device: Device; onClick: () => void }) {
  const [realtimeData, setRealtimeData] = useState<any>(null)

  // 获取设备实时数据
  const { data: deviceData } = useQuery({
    queryKey: ['realtime-data', device.id],
    queryFn: () => apiService.getRealtimeData({ device_id: device.id }),
    refetchInterval: 3000,
    enabled: device.is_active && device.is_connected && device.status === 'online',
  })

  useEffect(() => {
    if (deviceData?.realtime_data) {
      const currentDeviceData = deviceData.realtime_data.find(
        (item: any) => item.device_id === device.id
      )
      setRealtimeData(currentDeviceData)
    }
  }, [deviceData, device.id])

  const addresses = (() => {
    if (!device.addresses) return []
    if (Array.isArray(device.addresses)) return device.addresses
    try {
      return JSON.parse(device.addresses)
    } catch (error) {
      console.error('Failed to parse device addresses:', error)
      return []
    }
  })()
  const activeAddresses = addresses.filter((addr: any) => addr.name).length
  const dataCount = realtimeData?.data?.length || 0
  const latestValue = realtimeData?.data?.[0]?.value

  return (
    <div
      className="flex items-center justify-between p-4 border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <DeviceStatusBadge status={device.status || 'unknown'} isConnected={device.is_connected} />
          <span className="font-medium text-white">{device.name}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/60">
          <span className="font-mono text-white/80">{device.ip_address}:{device.port}</span>
          <span className="text-white/70">{device.plc_type}</span>
          <span className="text-white/70">{activeAddresses}/{addresses.length} 点</span>
          {dataCount > 0 && (
            <span className="text-emerald-400 font-medium">{dataCount} 数据</span>
          )}
          {latestValue !== undefined && (
            <span className="font-mono text-blue-400 glass-btn border-blue-500/30 bg-blue-500/10 px-2 py-1 rounded">
              {String(latestValue)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/50">
        <Clock className="h-3 w-3" />
        {device.last_collect_time ? formatDateTime(device.last_collect_time) : '从未'}
      </div>
    </div>
  )
}

/**
 * 设备卡片组件
 */
function DeviceCard({ device, onClick }: { device: Device; onClick: () => void }) {
  const [realtimeData, setRealtimeData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 获取设备实时数据
  const { data: deviceData } = useQuery({
    queryKey: ['realtime-data', device.id],
    queryFn: () => apiService.getRealtimeData({ device_id: device.id }),
    refetchInterval: 3000, // 3秒刷新一次
    enabled: device.is_active && device.is_connected && device.status === 'online',
  })

  useEffect(() => {
    if (deviceData?.realtime_data) {
      // 查找当前设备的数据
      const currentDeviceData = deviceData.realtime_data.find(
        (item: any) => item.device_id === device.id
      )
      setRealtimeData(currentDeviceData)
    }
  }, [deviceData, device.id])

  // 获取地址配置
  const addresses = (() => {
    if (!device.addresses) return []
    if (Array.isArray(device.addresses)) return device.addresses
    try {
      return JSON.parse(device.addresses)
    } catch (error) {
      console.error('Failed to parse device addresses:', error)
      return []
    }
  })()
  const addressCount = addresses.length
  const activeAddresses = addresses.filter((addr: any) => addr.name).length

  return (
    <div className="glass-card rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-[fadeInUp_0.6s_ease-out_both]" onClick={onClick}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{device.name}</h3>
        <DeviceStatusBadge status={device.status || 'unknown'} isConnected={device.is_connected} />
      </div>

      <div className="flex items-center gap-2 text-sm text-white/60 mb-6">
        <Cpu className="h-4 w-4" />
        {device.plc_type} • {device.protocol}
      </div>

      <div className="space-y-4">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-white/50" />
            <span className="text-white/50">地址:</span>
            <span className="font-mono text-white/80">{device.ip_address}:{device.port}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-white/50" />
            <span className="text-white/50">采集点:</span>
            <span className="text-white/80">{activeAddresses}/{addressCount}</span>
          </div>
        </div>

        {/* 实时数据预览 */}
        {realtimeData?.data && Array.isArray(realtimeData.data) && realtimeData.data.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <div className="text-sm text-white/70 mb-3">实时数据</div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {realtimeData.data.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="text-white/60 truncate">{item.address || `地址${index + 1}`}:</span>
                  <span className="font-mono text-emerald-400">{item.value !== undefined ? String(item.value) : 'N/A'}</span>
                </div>
              ))}
              {realtimeData.data.length > 3 && (
                <div className="text-center text-white/50 mt-2">
                  +{realtimeData.data.length - 3} 更多...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 无数据时显示 */}
        {realtimeData && (!realtimeData.data || !Array.isArray(realtimeData.data) || realtimeData.data.length === 0) && (
          <div className="border-t border-white/10 pt-4">
            <div className="text-sm text-white/70 mb-3">实时数据</div>
            <div className="text-xs text-white/50 text-center py-3 glass-btn border-white/10 bg-white/5 rounded-lg">
              暂无数据
            </div>
          </div>
        )}

        {/* 最后更新时间 */}
        <div className="flex items-center gap-2 text-xs text-white/50 border-t border-white/10 pt-4">
          <Clock className="h-3 w-3" />
          最后更新: {device.last_collect_time ? formatDateTime(device.last_collect_time) : '从未'}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            查看详情
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * 实时数据页面组件
 */
export default function RealtimePage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'compact' | 'list'>('compact')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'last_collect_time'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // 获取设备列表
  const {
    data: devicesData,
    isLoading: devicesLoading,
    error: devicesError,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['devices', { search: searchTerm, group: groupFilter }],
    queryFn: () => apiService.getDevices({ 
      page: 1, 
      page_size: 100,
      group_id: groupFilter !== 'all' ? parseInt(groupFilter) : undefined,
    }),
    refetchInterval: autoRefresh ? 10000 : false, // 10秒刷新设备列表
  })

  // 获取分组列表
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiService.getGroups({ page: 1, page_size: 100 }),
  })

  const devices = devicesData?.data || []
  const groups = groupsData?.data || []

  // 过滤和排序设备
  const filteredAndSortedDevices = devices
    .filter((device: Device) => {
      const matchesSearch = !searchTerm || 
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ip_address.includes(searchTerm)
      return matchesSearch
    })
    .sort((a: Device, b: Device) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'status':
          const statusOrder = { 'online': 3, 'error': 2, 'offline': 1 }
          const aStatus = a.is_connected ? 'online' : 'offline'
          const bStatus = b.is_connected ? 'online' : 'offline'
          comparison = (statusOrder[aStatus as keyof typeof statusOrder] || 0) - (statusOrder[bStatus as keyof typeof statusOrder] || 0)
          break
        case 'last_collect_time':
          const aTime = a.last_collect_time ? new Date(a.last_collect_time).getTime() : 0
          const bTime = b.last_collect_time ? new Date(b.last_collect_time).getTime() : 0
          comparison = aTime - bTime
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // 分页
  const totalDevices = filteredAndSortedDevices.length
  const totalPages = Math.ceil(totalDevices / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedDevices = filteredAndSortedDevices.slice(startIndex, endIndex)

  // 按分组组织设备（用于分组显示）
  const devicesByGroup = paginatedDevices.reduce((acc: any, device: Device) => {
    const groupName = device.group?.name || '未分组'
    if (!acc[groupName]) {
      acc[groupName] = []
    }
    acc[groupName].push(device)
    return acc
  }, {})

  /**
   * 处理设备卡片点击
   */
  const handleDeviceClick = (device: Device) => {
    router.push(`/realtime/${device.id}`)
  }

  /**
   * 处理刷新
   */
  const handleRefresh = () => {
    refetchDevices()
  }

  return (
    <div className="w-full max-w-none p-6 space-y-6">
          {/* 页面标题 - Novara风格 */}
          <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl tracking-tight text-white">实时数据监控</h1>
                <p className="text-sm md:text-base text-white/70 font-medium mt-1">
                  实时监控 {filteredAndSortedDevices.length} 台设备的运行状态
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  //size="lg"
                  onClick={handleRefresh}
                  disabled={devicesLoading}
                  className="glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 lg:h-5 lg:w-5 mr-2 ${devicesLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">刷新数据</span>
                  <span className="sm:hidden">刷新</span>
                </Button>
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  //size="lg"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white'}
                >
                  <Zap className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                  <span className="hidden sm:inline">{autoRefresh ? '自动刷新中' : '手动模式'}</span>
                  <span className="sm:hidden">{autoRefresh ? '自动' : '手动'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* 工具栏 - Novara风格 */}
          <div className="rounded-2xl glass-card p-4 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* 搜索和筛选 */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      placeholder="搜索设备名称、IP地址..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-56">
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="h-12 bg-white/10 backdrop-blur border border-white/20 text-white focus:bg-white/20 focus:border-white/30">
                      <Filter className="h-4 w-4 mr-2 text-white/50" />
                      <SelectValue placeholder="选择分组" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface backdrop-blur border border-white/10">
                      <SelectItem value="all">📋 所有分组</SelectItem>
                      {groups.map((group: Group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          📁 {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 排序和视图控制 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-36 h-11 glass-btn border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-emerald-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-surface border-white/10">
                      <SelectItem value="name">📝 按名称</SelectItem>
                      <SelectItem value="status">🔄 按状态</SelectItem>
                      <SelectItem value="last_collect_time">⏰ 按更新时间</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="h-11 px-3 glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center bg-white/10 backdrop-blur rounded-lg p-1.5 gap-1">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setViewMode('card')}
                     className={`h-9 px-4 rounded-md transition-all ${viewMode === 'card' ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                   >
                     <LayoutGrid className="h-4 w-4" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setViewMode('compact')}
                     className={`h-9 px-4 rounded-md transition-all ${viewMode === 'compact' ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                   >
                     <Grid3X3 className="h-4 w-4" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setViewMode('list')}
                     className={`h-9 px-4 rounded-md transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                   >
                     <List className="h-4 w-4" />
                   </Button>
                 </div>
              </div>
            </div>
          </div>

          {/* 设备统计 - Novara风格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-3xl p-6 animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-400">总设备数</p>
                  <p className="text-3xl font-bold text-white mt-1">{filteredAndSortedDevices.length}</p>
                  <p className="text-xs text-blue-400/60 mt-1">当前显示 {paginatedDevices.length} 台</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                  <Settings className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-400">在线设备</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {filteredAndSortedDevices.filter((d: Device) => d.is_connected).length}
                  </p>
                  <p className="text-xs text-emerald-400/60 mt-1">
                    {filteredAndSortedDevices.length > 0 ?
                      ((filteredAndSortedDevices.filter((d: Device) => d.is_connected).length / filteredAndSortedDevices.length) * 100).toFixed(0) : 0}% 在线率
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                  <Signal className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-400">离线设备</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {filteredAndSortedDevices.filter((d: Device) => !d.is_connected).length}
                  </p>
                  <p className="text-xs text-red-400/60 mt-1">需要检查连接</p>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/20 backdrop-blur ring-1 ring-red-500/30">
                  <WifiOff className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 animate-[fadeInUp_0.6s_ease-out_0.8s_both]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-400">活跃设备</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {filteredAndSortedDevices.filter((d: Device) => d.is_active).length}
                  </p>
                  <p className="text-xs text-amber-400/60 mt-1">正在采集数据</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/20 backdrop-blur ring-1 ring-amber-500/30">
                  <Zap className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* 设备显示区域 */}
          {devicesLoading ? (
            <div className="glass-card rounded-3xl p-12 text-center animate-[fadeIn_0.6s_ease-out_0.5s_both]">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-emerald-400" />
              <p className="text-white/70 text-lg">加载设备数据中...</p>
            </div>
          ) : devicesError ? (
            <div className="glass-card rounded-3xl p-12 text-center animate-[fadeIn_0.6s_ease-out_0.5s_both]">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p className="text-red-400 text-lg mb-4">加载设备数据失败</p>
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white"
              >
                重试
              </Button>
            </div>
          ) : paginatedDevices.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center animate-[fadeIn_0.6s_ease-out_0.5s_both]">
              <Eye className="h-12 w-12 mx-auto mb-4 text-blue-400" />
              <p className="text-white/70 text-lg">没有找到匹配的设备</p>
            </div>
          ) : (
            <>
              {/* 列表视图 */}
              {viewMode === 'list' ? (
                <div className="glass-card rounded-3xl overflow-hidden animate-[fadeIn_0.6s_ease-out_0.6s_both]">
                  <div className="divide-y divide-white/10">
                    {paginatedDevices.map((device: Device) => (
                      <DeviceListRow
                        key={device.id}
                        device={device}
                        onClick={() => handleDeviceClick(device)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* 卡片视图和紧凑视图 */
                <div className="space-y-6">
                  {Object.entries(devicesByGroup).map(([groupName, groupDevices]: [string, any]) => (
                    <div key={groupName} className="animate-[fadeIn_0.6s_ease-out_0.6s_both]">
                      <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-xl font-bold text-white">{groupName}</h2>
                        <Badge variant="secondary" className="glass-btn border-white/20 bg-white/10 text-white/80">
                          {groupDevices.length} 台设备
                        </Badge>
                      </div>
                      <div className={`grid gap-4 ${
                  viewMode === 'card'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                }`}>
                        {groupDevices.map((device: Device) => (
                          viewMode === 'card' ? (
                            <DeviceCard
                              key={device.id}
                              device={device}
                              onClick={() => handleDeviceClick(device)}
                            />
                          ) : (
                            <CompactDeviceCard
                              key={device.id}
                              device={device}
                              onClick={() => handleDeviceClick(device)}
                            />
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="glass-card rounded-3xl p-6 animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span>每页显示:</span>
                      <Select value={pageSize.toString()} onValueChange={(value) => {
                        setPageSize(parseInt(value))
                        setCurrentPage(1)
                      }}>
                        <SelectTrigger className="w-20 glass-btn border-white/10 bg-white/5 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-surface border-white/10">
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                          <SelectItem value="48">48</SelectItem>
                          <SelectItem value="96">96</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>共 {totalDevices} 台设备</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        上一页
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white'}`}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="glass-btn border-white/10 hover:bg-white/10 text-white hover:text-white"
                      >
                        下一页
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
  )
}