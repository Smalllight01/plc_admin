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
        <div className="container mx-auto p-6 space-y-6">
          {/* 页面标题 - 优化版本 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <Button variant="outline" size="sm" onClick={handleBack} className="bg-white hover:bg-gray-50">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    返回
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
                      <p className="text-blue-600 mt-1 font-medium">
                        设备详情和实时数据监控
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={dataLoading}
                  className="bg-white hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white hover:bg-gray-50'}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {autoRefresh ? '自动刷新中' : '手动模式'}
                </Button>
              </div>
            </div>
          </div>

          {/* 设备基本信息 - 优化版本 */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Cpu className="h-5 w-5 text-blue-500" />
                设备信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">设备名称</label>
                  <p className="font-medium text-sm">{device.name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">状态</label>
                  <div className="mt-1">
                    <DeviceStatusBadge status={device.status || 'unknown'} isConnected={device.is_connected} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">PLC型号</label>
                  <p className="font-medium text-sm">{device.plc_type}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">协议</label>
                  <p className="font-medium text-sm">{device.protocol}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">IP地址</label>
                  <p className="font-mono text-sm">{device.ip_address}:{device.port}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">分组</label>
                  <p className="font-medium text-sm">{device.group?.name || '未分组'}</p>
                </div>
              </div>
              
              {/* 采集统计 - 内联显示 */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">采集统计:</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>总点数: <span className="font-bold text-blue-600">{processedAddresses.length}</span></span>
                      <span>活跃: <span className="font-bold text-green-600">{processedAddresses.filter((addr: any) => addr.name).length}</span></span>
                      <span>有数据: <span className="font-bold text-orange-600">{Object.keys(currentData).length}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>更新: {device.last_collect_time ? formatDateTime(device.last_collect_time) : '从未'}</span>
                  </div>
                </div>
              </div>
              
              {device.description && (
                <div className="border-t pt-2">
                  <label className="text-xs text-muted-foreground">描述</label>
                  <p className="text-sm text-muted-foreground">{device.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 数据控制工具栏 - 优化版本 */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <span className="text-gray-900">实时数据</span>
                  {dataLoading && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                      variant={showChart ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowChart(!showChart)}
                      disabled={selectedAddresses.size === 0}
                      className={showChart ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-200 hover:bg-gray-50'}
                    >
                      {showChart ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                      {showChart ? '隐藏图表' : '显示图表'}
                    </Button>
                  <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-32 border-gray-200 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">表格视图</SelectItem>
                      <SelectItem value="grid">网格视图</SelectItem>
                      <SelectItem value="compact">紧凑视图</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 搜索和筛选工具 */}
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索地址、名称或类型..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-32 h-11 border-gray-200 focus:border-blue-500">
                        <SelectValue placeholder="数据类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有类型</SelectItem>
                        {availableTypes.map((type: string) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-32 h-11 border-gray-200 focus:border-blue-500">
                        <SelectValue placeholder="数据状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="hasData">有数据</SelectItem>
                        <SelectItem value="noData">无数据</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-32 h-11 border-gray-200 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address">地址</SelectItem>
                        <SelectItem value="name">名称</SelectItem>
                        <SelectItem value="value">数值</SelectItem>
                        <SelectItem value="type">类型</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="h-11 px-3 border-gray-200 hover:bg-gray-50"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger className="w-24 h-11 border-gray-200 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedAddresses.size === filteredAndSortedAddresses.length && filteredAndSortedAddresses.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      全选当前页 ({selectedAddresses.size}/{filteredAndSortedAddresses.length})
                    </label>
                  </div>
                  {selectedAddresses.size > 0 && (
                    <Badge variant="secondary">
                      已选择 {selectedAddresses.size} 个地址用于图表显示
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>显示 {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedAddresses.length)}-{Math.min(currentPage * pageSize, filteredAndSortedAddresses.length)} 条，共 {filteredAndSortedAddresses.length} 条</span>
                  {processedAddresses.length !== filteredAndSortedAddresses.length && (
                    <span className="text-blue-600">（已筛选，总共 {processedAddresses.length} 条）</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 数据显示区域 */}
          {dataError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">获取实时数据失败</p>
                  <Button variant="outline" onClick={handleRefresh}>
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredAndSortedAddresses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Database className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {processedAddresses.length === 0 ? '该设备没有配置采集地址' : '没有找到匹配的地址'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 数据表格/网格 - 优化版本 */}
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  {viewMode === 'table' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedAddresses.size === paginatedAddresses.length && paginatedAddresses.length > 0}
                              onCheckedChange={() => {
                                if (selectedAddresses.size === paginatedAddresses.length) {
                                  // 取消选择当前页所有项
                                  const newSelected = new Set(selectedAddresses)
                                  paginatedAddresses.forEach((addr: any) => newSelected.delete(addr.address))
                                  setSelectedAddresses(newSelected)
                                } else {
                                  // 选择当前页所有项
                                  const newSelected = new Set(selectedAddresses)
                                  paginatedAddresses.forEach((addr: any) => newSelected.add(addr.address))
                                  setSelectedAddresses(newSelected)
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>地址</TableHead>
                          {device?.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp') && <TableHead>站号</TableHead>}
                          <TableHead>名称</TableHead>
                          <TableHead>当前值</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>单位</TableHead>
                          <TableHead>趋势</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAddresses.map((addr: any) => (
                          <TableRow key={addr.address}>
                            <TableCell>
                              <Checkbox
                                checked={selectedAddresses.has(addr.address)}
                                onCheckedChange={(checked) => handleAddressSelection(addr.address, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{addr.originalAddress || addr.address}</TableCell>
                            {device?.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp') && (
                              <TableCell className="text-sm">{addr.stationId || 1}</TableCell>
                            )}
                            <TableCell className="font-medium">{addr.name || '-'}</TableCell>
                            <TableCell>
                              <DataValueDisplay value={addr.currentValue} type={addr.type} />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {addr.type || 'unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {addr.unit || '-'}
                            </TableCell>
                            <TableCell>
                              <DataTrendIcon current={addr.currentValue} previous={addr.previousValue} />
                            </TableCell>
                            <TableCell>
                              <Badge variant={addr.hasData ? 'default' : 'secondary'} className="text-xs">
                                {addr.hasData ? '有数据' : '无数据'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                      {paginatedAddresses.map((addr: any) => (
                        <Card key={addr.address} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedAddresses.has(addr.address)}
                                  onCheckedChange={(checked) => handleAddressSelection(addr.address, checked as boolean)}
                                />
                                <Badge variant={addr.hasData ? 'default' : 'secondary'} className="text-xs">
                                  {addr.hasData ? '有数据' : '无数据'}
                                </Badge>
                              </div>
                              <DataTrendIcon current={addr.currentValue} previous={addr.previousValue} />
                            </div>
                            <CardTitle className="text-sm font-mono">{addr.originalAddress || addr.address}</CardTitle>
                            {addr.name && (
                              <CardDescription className="text-sm font-medium">{addr.name}</CardDescription>
                            )}
                            {device?.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp') && (
                              <CardDescription className="text-xs">
                                站号: {addr.stationId || 1}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">当前值</span>
                              <DataValueDisplay value={addr.currentValue} type={addr.type} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">类型</span>
                              <Badge variant="outline" className="text-xs">
                                {addr.type || 'unknown'}
                              </Badge>
                            </div>
                            {addr.unit && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">单位</span>
                                <span className="text-sm">{addr.unit}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    /* 紧凑视图 - 最大化空间利用率 */
                    <div className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                        {paginatedAddresses.map((addr: any) => (
                          <div key={addr.address} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <Checkbox
                                checked={selectedAddresses.has(addr.address)}
                                onCheckedChange={(checked) => handleAddressSelection(addr.address, checked as boolean)}
                                className="h-4 w-4"
                              />
                              <div className="flex items-center gap-1">
                                <DataTrendIcon current={addr.currentValue} previous={addr.previousValue} />
                                <Badge variant={addr.hasData ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                                  {addr.hasData ? '✓' : '✗'}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="font-mono text-xs text-muted-foreground truncate" title={addr.address}>
                                {addr.address}
                              </div>
                              {addr.name && (
                                <div className="font-medium text-sm truncate" title={addr.name}>
                                  {addr.name}
                                </div>
                              )}
                              {device?.plc_type === 'modbus_rtu_over_tcp' && (
                                <div className="text-xs text-muted-foreground">
                                  站号: {addr.stationId || 1}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <DataValueDisplay value={addr.currentValue} type={addr.type} />
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {addr.type || '?'}
                                </Badge>
                              </div>
                              {addr.unit && (
                                <div className="text-xs text-muted-foreground truncate">
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

              {/* 分页控件 - 优化版本 */}
              {totalPages > 1 && (
                <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="border-gray-200 hover:bg-gray-50"
                        >
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
                                className={`w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
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
                          className="border-gray-200 hover:bg-gray-50"
                        >
                          下一页
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
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