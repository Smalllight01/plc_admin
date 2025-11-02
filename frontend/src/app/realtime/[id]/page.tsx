'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
import { apiService } from '@/services/api'
import { Device } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { RealtimeChart } from '@/components/charts/realtime-chart'
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  MapPin,
  Cpu,
  Network,
  Database,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Eye,
  EyeOff,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Settings,
} from 'lucide-react'

/**
 * 数据值显示组件
 */
function DataValueDisplay({ value, type }: { value: any; type?: string }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>
  }

  // 根据数据类型格式化显示
  switch (type) {
    case 'bool':
    case 'boolean':
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '是' : '否'}
        </Badge>
      )
    case 'float':
    case 'double':
      return <span className="font-mono">{Number(value).toFixed(2)}</span>
    case 'int':
    case 'integer':
      return <span className="font-mono">{value}</span>
    default:
      return <span className="font-mono">{String(value)}</span>
  }
}

/**
 * 数据趋势图标组件
 */
function DataTrendIcon({ current, previous }: { current: any; previous?: any }) {
  if (previous === undefined || current === previous) {
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  if (Number(current) > Number(previous)) {
    return <TrendingUp className="h-4 w-4 text-green-600" />
  } else {
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }
}

/**
 * 设备状态徽章组件
 */
function DeviceStatusBadge({ status, isConnected }: { status: string; isConnected: boolean }) {
  if (!isConnected) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        离线
      </Badge>
    )
  }

  switch (status) {
    case 'online':
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <Wifi className="h-3 w-3" />
          在线
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          错误
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          未知
        </Badge>
      )
  }
}

/**
 * 设备详情页面组件
 */
export default function DeviceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const deviceId = params.id as string
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [currentData, setCurrentData] = useState<Record<string, any>>({})
  const [previousData, setPreviousData] = useState<Record<string, any>>({})
  const [chartData, setChartData] = useState<Array<{timestamp: string, data: Record<string, any>}>>([])  
  const [showChart, setShowChart] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'address' | 'name' | 'value' | 'type'>('address')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'compact'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 获取设备信息
  const {
    data: device,
    isLoading: deviceLoading,
    error: deviceError,
  } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => apiService.getDevice(parseInt(deviceId)),
    enabled: !!deviceId,
  })

  // 获取设备实时数据
  const {
    data: realtimeData,
    isLoading: dataLoading,
    error: dataError,
    refetch: refetchData,
  } = useQuery({
    queryKey: ['realtime-data', deviceId],
    queryFn: () => apiService.getRealtimeData({ device_id: parseInt(deviceId) }),
    enabled: !!deviceId && device?.is_active && device?.is_connected && device?.status === 'online',
    refetchInterval: autoRefresh ? 2000 : false, // 2秒刷新一次
  })

  // 处理实时数据
  useEffect(() => {
    if (realtimeData?.realtime_data) {
      const deviceData = realtimeData.realtime_data.find(
        (item: any) => item.device_id === parseInt(deviceId)
      )
      if (deviceData && deviceData.data) {
        setPreviousData(currentData)
        
        // 简化数据处理，后端直接返回正确格式
        const dataMap: Record<string, any> = {}
        if (Array.isArray(deviceData.data)) {
          deviceData.data.forEach((item: any) => {
            if (item.address) {
              // 使用唯一的地址标识符（后端已经按配置顺序返回）
              const stationId = item.station_id || 1
              const uniqueKey = `${item.address}_s${stationId}`
              const displayAddress = stationId > 1 ? `${item.address}(站${stationId})` : item.address

              dataMap[uniqueKey] = {
                value: item.value,
                displayAddress: displayAddress,
                originalAddress: item.address, // 添加原始地址字段
                address: uniqueKey, // 使用唯一key作为address
                stationId: stationId,
                name: item.name || '',
                type: item.type || 'int16',
                unit: item.unit || ''
              }
            }
          })
        } else {
          Object.assign(dataMap, deviceData.data)
        }
        
        setCurrentData(dataMap)
        
        // 更新图表数据
        const newDataPoint = {
          timestamp: new Date().toISOString(),
          data: dataMap
        }
        
        setChartData(prev => {
          const updated = [...prev, newDataPoint]
          // 保持最多100个数据点
          return updated.length > 100 ? updated.slice(-100) : updated
        })
      }
    }
  }, [realtimeData, deviceId])

  // 简化的地址处理逻辑 - 直接使用设备配置和后端数据
  const processedAddresses = useMemo(() => {
    if (!device?.addresses) return []

    // 解析设备地址配置
    let addresses: any[] = []
    if (Array.isArray(device.addresses)) {
      addresses = device.addresses
    } else if (typeof device.addresses === 'string') {
      try {
        addresses = JSON.parse(device.addresses)
      } catch (error) {
        console.error('Failed to parse device addresses:', error)
        addresses = []
      }
    }

    // 直接映射地址配置和实时数据，不再自动扩展
    return addresses.map((addr: any) => {
      const baseAddress = typeof addr === 'string' ? addr : addr.address
      const stationId = typeof addr === 'string' ? 1 : (addr.stationId || 1)
      const storageKey = `${baseAddress}_s${stationId}`

      // 从后端返回的数据中获取值
      const currentDataItem = currentData[storageKey]
      const previousDataItem = previousData[storageKey]

      return {
        address: storageKey,
        baseAddress: baseAddress,
        originalAddress: baseAddress, // 添加原始地址字段
        stationId: stationId,
        name: typeof addr === 'string' ? '' : (addr.name || ''),
        type: typeof addr === 'string' ? 'int16' : (addr.type || 'int16'),
        unit: typeof addr === 'string' ? '' : (addr.unit || ''),
        currentValue: currentDataItem?.value,
        previousValue: previousDataItem?.value,
        hasData: currentDataItem !== undefined,
        displayAddress: currentDataItem?.displayAddress || (stationId > 1 ? `${baseAddress}(站${stationId})` : baseAddress)
      }
    })
  }, [device?.addresses, currentData, previousData])

  // 获取所有唯一的数据类型
  const availableTypes = useMemo(() => {
    const types = new Set(processedAddresses.map((addr: any) => addr.type).filter(Boolean))
    return Array.from(types).sort() as string[]
  }, [processedAddresses])

  // 搜索和排序后的地址数据
  const filteredAndSortedAddresses = useMemo(() => {
    let filtered = processedAddresses.filter((addr: any) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        addr.address.toLowerCase().includes(searchLower) ||
        (addr.name && addr.name.toLowerCase().includes(searchLower)) ||
        (addr.type && addr.type.toLowerCase().includes(searchLower))
      )
    })

    // 类型筛选
    if (filterType !== 'all') {
      filtered = filtered.filter((addr: any) => addr.type === filterType)
    }

    // 状态筛选
    if (filterStatus !== 'all') {
      if (filterStatus === 'hasData') {
        filtered = filtered.filter((addr: any) => addr.hasData)
      } else if (filterStatus === 'noData') {
        filtered = filtered.filter((addr: any) => !addr.hasData)
      }
    }

    // 排序
    filtered.sort((a: any, b: any) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'address':
          aValue = a.address
          bValue = b.address
          break
        case 'name':
          aValue = a.name || a.address
          bValue = b.name || b.address
          break
        case 'value':
          aValue = a.currentValue ?? ''
          bValue = b.currentValue ?? ''
          break
        case 'type':
          aValue = a.type || ''
          bValue = b.type || ''
          break
        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortOrder === 'asc' ? comparison : -comparison
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [processedAddresses, searchTerm, sortBy, sortOrder, filterType, filterStatus])

  // 分页数据
  const paginatedAddresses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredAndSortedAddresses.slice(startIndex, endIndex)
  }, [filteredAndSortedAddresses, currentPage, pageSize])

  // 总页数
  const totalPages = Math.ceil(filteredAndSortedAddresses.length / pageSize)

  // 重置页码当筛选条件改变时
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterStatus, sortBy, sortOrder])

  // 处理地址选择
  const handleAddressSelection = (address: string, checked: boolean) => {
    setSelectedAddresses(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(address)
      } else {
        newSet.delete(address)
      }
      return newSet
    })
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAddresses(new Set(filteredAndSortedAddresses.map((addr: any) => addr.address)))
    } else {
      setSelectedAddresses(new Set())
    }
  }

  /**
   * 处理返回
   */
  const handleBack = () => {
    router.back()
  }

  /**
   * 处理刷新
   */
  const handleRefresh = () => {
    refetchData()
  }

  if (deviceLoading) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="container mx-auto p-6">
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">加载设备信息中...</p>
            </div>
          </div>
        </MainLayout>
      </AuthGuard>
    )
  }

  if (deviceError || !device) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="container mx-auto p-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">设备不存在或加载失败</p>
                <Button variant="outline" onClick={handleBack}>
                  返回
                </Button>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      </AuthGuard>
    )
  }

  // 处理当前设备的实时数据
  const currentDeviceData = realtimeData?.realtime_data?.find(
    (item: any) => item.device_id === parseInt(deviceId)
  )

  return (
    <AuthGuard>
      <MainLayout>
        <div className="w-full max-w-none p-6 space-y-8">
          {/* 页面标题 - 扁平拟物风格 */}
          <div className="neumorphic-card p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <Button variant="outline" size="lg" onClick={handleBack} className="shadow-neumorphic-sm hover:shadow-neumorphic">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  返回
                </Button>
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-neumorphic-lg">
                    <Activity className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-h1 gradient-text mb-2">{device.name}</h1>
                    <p className="text-body text-muted-foreground">设备详情和实时数据监控</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRefresh}
                  disabled={dataLoading}
                  className="shadow-neumorphic-sm hover:shadow-neumorphic"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? 'shadow-neumorphic hover:shadow-neumorphic-lg' : 'shadow-neumorphic-sm hover:shadow-neumorphic'}
                >
                  <Activity className="h-5 w-5 mr-2" />
                  {autoRefresh ? '自动刷新中' : '手动模式'}
                </Button>
              </div>
            </div>
          </div>

          {/* 设备基本信息 - 扁平拟物风格 */}
          <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                  <Cpu className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-h2 gradient-text">设备信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <label className="text-body-sm text-muted-foreground font-medium">设备名称</label>
                  <p className="text-body font-semibold text-foreground">{device.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-body-sm text-muted-foreground font-medium">状态</label>
                  <div>
                    <DeviceStatusBadge status={device.status || 'unknown'} isConnected={device.is_connected} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-body-sm text-muted-foreground font-medium">PLC型号</label>
                  <p className="text-body font-semibold text-foreground">{device.plc_type}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-body-sm text-muted-foreground font-medium">协议</label>
                  <p className="text-body font-semibold text-foreground">{device.protocol}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-body-sm text-muted-foreground font-medium">IP地址</label>
                  <p className="font-mono text-body font-semibold text-foreground">{device.ip_address}:{device.port}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-body-sm text-muted-foreground font-medium">分组</label>
                  <p className="text-body font-semibold text-foreground">{device.group?.name || '未分组'}</p>
                </div>
              </div>

              {/* 采集统计 - 扁平拟物风格 */}
              <div className="border-t border-border/30 pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                        <Database className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-body font-semibold text-foreground">采集统计</span>
                    </div>
                    <div className="flex items-center gap-6 text-body">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">总点数:</span>
                        <span className="font-bold text-blue-600">{processedAddresses.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">活跃:</span>
                        <span className="font-bold text-green-600">{processedAddresses.filter((addr: any) => addr.name).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">有数据:</span>
                        <span className="font-bold text-orange-600">{Object.keys(currentData).length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                    <div className="p-1.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span>更新: {device.last_collect_time ? formatDateTime(device.last_collect_time) : '从未'}</span>
                  </div>
                </div>
              </div>

              {device.description && (
                <div className="border-t border-border/30 pt-4">
                  <label className="text-body-sm text-muted-foreground font-medium">描述</label>
                  <p className="text-body text-muted-foreground mt-2">{device.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 数据控制工具栏 - 扁平拟物风格 */}
          <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
            <CardHeader className="pb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-h2 gradient-text">实时数据</span>
                    {dataLoading && (
                      <div className="flex items-center gap-2 mt-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-body-sm text-muted-foreground">数据更新中...</span>
                      </div>
                    )}
                  </div>
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button
                    variant={showChart ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setShowChart(!showChart)}
                    disabled={selectedAddresses.size === 0}
                    className={`w-full sm:w-auto ${showChart ? 'shadow-neumorphic hover:shadow-neumorphic-lg' : 'shadow-neumorphic-sm hover:shadow-neumorphic'}`}
                  >
                    {showChart ? <EyeOff className="h-5 w-5 mr-2" /> : <Eye className="h-5 w-5 mr-2" />}
                    {showChart ? '隐藏图表' : '显示图表'}
                  </Button>
                  <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                    <SelectTrigger className="w-full sm:w-36 h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                      <SelectItem value="table">表格视图</SelectItem>
                      <SelectItem value="grid">网格视图</SelectItem>
                      <SelectItem value="compact">紧凑视图</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 搜索和筛选工具 */}
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="搜索地址、名称或类型..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 text-body"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full sm:w-32 h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                        <SelectValue placeholder="数据类型" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                        <SelectItem value="all">所有类型</SelectItem>
                        {availableTypes.map((type: string) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-32 h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                        <SelectValue placeholder="数据状态" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="hasData">有数据</SelectItem>
                        <SelectItem value="noData">无数据</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-full sm:w-32 h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                        <SelectItem value="address">地址</SelectItem>
                        <SelectItem value="name">名称</SelectItem>
                        <SelectItem value="value">数值</SelectItem>
                        <SelectItem value="type">类型</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="h-12 px-4 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
                    </Button>
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger className="w-full sm:w-28 h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                        <SelectItem value="10">10条</SelectItem>
                        <SelectItem value="20">20条</SelectItem>
                        <SelectItem value="50">50条</SelectItem>
                        <SelectItem value="100">100条</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 批量操作和统计信息 */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="select-all"
                      checked={selectedAddresses.size === filteredAndSortedAddresses.length && filteredAndSortedAddresses.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-body font-medium">
                      全选当前页 ({selectedAddresses.size}/{filteredAndSortedAddresses.length})
                    </label>
                  </div>
                  {selectedAddresses.size > 0 && (
                    <Badge variant="secondary" className="shadow-neumorphic-sm w-fit">
                      已选择 {selectedAddresses.size} 个地址
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-body text-muted-foreground">
                  <span>显示 {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedAddresses.length)}-{Math.min(currentPage * pageSize, filteredAndSortedAddresses.length)} 条</span>
                  <span>共 {filteredAndSortedAddresses.length} 条</span>
                  {processedAddresses.length !== filteredAndSortedAddresses.length && (
                    <span className="text-blue-600">（已筛选，总共 {processedAddresses.length} 条）</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 数据显示区域 */}
          {dataError ? (
            <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 shadow-neumorphic-sm inline-block mb-6">
                    <AlertTriangle className="h-16 w-16 text-red-600" />
                  </div>
                  <h3 className="text-h3 text-foreground mb-3">获取实时数据失败</h3>
                  <p className="text-body text-muted-foreground mb-6">
                    无法连接到设备或获取数据，请检查设备状态和网络连接
                  </p>
                  <Button variant="default" size="lg" onClick={handleRefresh} className="shadow-neumorphic hover:shadow-neumorphic-lg">
                    <RefreshCw className="h-5 w-5 mr-2" />
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredAndSortedAddresses.length === 0 ? (
            <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm inline-block mb-6">
                    <Database className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-h3 text-foreground mb-3">
                    {processedAddresses.length === 0 ? '该设备没有配置采集地址' : '没有找到匹配的地址'}
                  </h3>
                  <p className="text-body text-muted-foreground">
                    {processedAddresses.length === 0
                      ? '请在设备配置中添加采集地址以开始监控数据'
                      : '请尝试调整搜索条件或筛选器以显示更多结果'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 数据表格/网格 - 扁平拟物风格 */}
              <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
                <CardContent className="p-0">
                  {viewMode === 'table' ? (
                    <>
                      {/* 桌面端表格视图 */}
                      <div className="hidden lg:block rounded-2xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-14 text-h4 font-semibold">选择</TableHead>
                              <TableHead className="text-h4 font-semibold">地址</TableHead>
                              {device?.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp') && <TableHead className="text-h4 font-semibold">站号</TableHead>}
                              <TableHead className="text-h4 font-semibold">名称</TableHead>
                              <TableHead className="text-h4 font-semibold">当前值</TableHead>
                              <TableHead className="text-h4 font-semibold">类型</TableHead>
                              <TableHead className="text-h4 font-semibold">单位</TableHead>
                              <TableHead className="text-h4 font-semibold">趋势</TableHead>
                              <TableHead className="text-h4 font-semibold">状态</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedAddresses.map((addr: any) => (
                              <TableRow key={addr.address} className="group hover:bg-muted/30 transition-all duration-300">
                                <TableCell>
                                  <Checkbox
                                    checked={selectedAddresses.has(addr.address)}
                                    onCheckedChange={(checked) => handleAddressSelection(addr.address, checked as boolean)}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-body">{addr.originalAddress || addr.address}</TableCell>
                                {device?.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp') && (
                                  <TableCell className="text-body">{addr.stationId || 1}</TableCell>
                                )}
                                <TableCell className="font-semibold text-body">{addr.name || '-'}</TableCell>
                                <TableCell>
                                  <DataValueDisplay value={addr.currentValue} type={addr.type} />
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-body-sm shadow-neumorphic-sm">
                                    {addr.type || 'unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-body text-muted-foreground">
                                  {addr.unit || '-'}
                                </TableCell>
                                <TableCell>
                                  <DataTrendIcon current={addr.currentValue} previous={addr.previousValue} />
                                </TableCell>
                                <TableCell>
                                  <Badge variant={addr.hasData ? 'default' : 'secondary'} className="text-body-sm shadow-neumorphic-sm">
                                    {addr.hasData ? '有数据' : '无数据'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 移动端卡片视图 */}
                      <div className="lg:hidden p-6 space-y-4">
                        {paginatedAddresses.map((addr: any) => (
                          <Card key={addr.address} className="border-0 shadow-neumorphic-sm hover:shadow-neumorphic hover:-translate-y-1 transition-all duration-300">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={selectedAddresses.has(addr.address)}
                                    onCheckedChange={(checked) => handleAddressSelection(addr.address, checked as boolean)}
                                  />
                                  <Badge variant={addr.hasData ? 'default' : 'secondary'} className="text-body-sm shadow-neumorphic-sm">
                                    {addr.hasData ? '有数据' : '无数据'}
                                  </Badge>
                                </div>
                                <DataTrendIcon current={addr.currentValue} previous={addr.previousValue} />
                              </div>
                              <CardTitle className="text-body font-mono">{addr.originalAddress || addr.address}</CardTitle>
                              {addr.name && (
                                <CardDescription className="text-body font-semibold text-foreground">{addr.name}</CardDescription>
                              )}
                              {device?.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp') && (
                                <CardDescription className="text-body-sm">
                                  站号: {addr.stationId || 1}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-body-sm text-muted-foreground">当前值</span>
                                <DataValueDisplay value={addr.currentValue} type={addr.type} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-body-sm text-muted-foreground">类型</span>
                                <Badge variant="outline" className="text-body-sm shadow-neumorphic-sm">
                                  {addr.type || 'unknown'}
                                </Badge>
                              </div>
                              {addr.unit && (
                                <div className="flex items-center justify-between">
                                  <span className="text-body-sm text-muted-foreground">单位</span>
                                  <span className="text-body-sm">{addr.unit}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                      {paginatedAddresses.map((addr: any) => (
                        <Card key={addr.address} className="border-0 shadow-neumorphic-sm hover:shadow-neumorphic hover:-translate-y-1 transition-all duration-300">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedAddresses.has(addr.address)}
                                  onCheckedChange={(checked) => handleAddressSelection(addr.address, checked as boolean)}
                                />
                                <Badge variant={addr.hasData ? 'default' : 'secondary'} className="text-body-sm shadow-neumorphic-sm">
                                  {addr.hasData ? '有数据' : '无数据'}
                                </Badge>
                              </div>
                              <DataTrendIcon current={addr.currentValue} previous={addr.previousValue} />
                            </div>
                            <CardTitle className="text-body font-mono">{addr.originalAddress || addr.address}</CardTitle>
                            {addr.name && (
                              <CardDescription className="text-body font-semibold text-foreground">{addr.name}</CardDescription>
                            )}
                            {device?.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp') && (
                              <CardDescription className="text-body-sm">
                                站号: {addr.stationId || 1}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-body-sm text-muted-foreground">当前值</span>
                              <DataValueDisplay value={addr.currentValue} type={addr.type} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-body-sm text-muted-foreground">类型</span>
                              <Badge variant="outline" className="text-body-sm shadow-neumorphic-sm">
                                {addr.type || 'unknown'}
                              </Badge>
                            </div>
                            {addr.unit && (
                              <div className="flex items-center justify-between">
                                <span className="text-body-sm text-muted-foreground">单位</span>
                                <span className="text-body-sm">{addr.unit}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    /* 紧凑视图 - 扁平拟物风格 */
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {paginatedAddresses.map((addr: any) => (
                          <div key={addr.address} className="border-0 rounded-2xl p-4 bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <Checkbox
                                checked={selectedAddresses.has(addr.address)}
                                onCheckedChange={(checked) => handleAddressSelection(addr.address, checked as boolean)}
                                className="h-5 w-5"
                              />
                              <div className="flex items-center gap-2">
                                <DataTrendIcon current={addr.currentValue} previous={addr.previousValue} />
                                <Badge variant={addr.hasData ? 'default' : 'secondary'} className="text-body-sm px-2 py-0 shadow-neumorphic-sm">
                                  {addr.hasData ? '✓' : '✗'}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="font-mono text-body-sm text-muted-foreground truncate" title={addr.address}>
                                {addr.address}
                              </div>
                              {addr.name && (
                                <div className="font-semibold text-body truncate" title={addr.name}>
                                  {addr.name}
                                </div>
                              )}
                              {device?.plc_type === 'modbus_rtu_over_tcp' && (
                                <div className="text-body-sm text-muted-foreground">
                                  站号: {addr.stationId || 1}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <DataValueDisplay value={addr.currentValue} type={addr.type} />
                                <Badge variant="outline" className="text-body-sm px-2 py-0 shadow-neumorphic-sm">
                                  {addr.type || '?'}
                                </Badge>
                              </div>
                              {addr.unit && (
                                <div className="text-body-sm text-muted-foreground truncate">
                                  {addr.unit}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 分页控件 - 扁平拟物风格 */}
              {totalPages > 1 && (
                <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
                  <CardContent className="py-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="h-12 px-4 sm:px-6 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
                          >
                            上一页
                          </Button>
                          <div className="flex items-center gap-1 sm:gap-2">
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
                                  size="lg"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-10 h-10 sm:w-12 sm:h-12 p-0 ${currentPage === pageNum ? 'shadow-neumorphic hover:shadow-neumorphic-lg' : 'bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300'}`}
                                >
                                  {pageNum}
                                </Button>
                              )
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="h-12 px-4 sm:px-6 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                      <div className="text-body text-muted-foreground text-center sm:text-left">
                        第 {currentPage} 页，共 {totalPages} 页
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 可选图表显示 */}
              {showChart && selectedAddresses.size > 0 && (
                <RealtimeChart
                  realtimeData={chartData}
                  addresses={filteredAndSortedAddresses.filter((addr: any) => selectedAddresses.has(addr.address))}
                  deviceName={device.name}
                  maxDataPoints={100}
                />
              )}
            </>
          )}
        </div>
      </MainLayout>
    </AuthGuard>
  )
}