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
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
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
                    <h1 className="text-2xl font-bold text-gray-900">数据监控</h1>
                    <p className="text-blue-600 mt-1 font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      实时监控 {totalPoints} 个数据点的值和状态
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  autoRefresh 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    autoRefresh ? 'text-emerald-700' : 'text-gray-600'
                  }`}>
                    {autoRefresh ? '实时监控' : '手动模式'}
                  </span>
                  <Signal className={`h-4 w-4 ${
                    autoRefresh ? 'text-emerald-600' : 'text-gray-500'
                  }`} />
                </div>
                
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleAutoRefresh}
                  className={autoRefresh 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : 'bg-white hover:bg-gray-50 text-emerald-600 border-emerald-200'
                  }
                >
                  <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                  {autoRefresh ? '停止自动刷新' : '启动自动刷新'}
                </Button>
                
                <Button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  size="sm"
                  className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 hover:border-blue-300"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  立即刷新
                </Button>
              </div>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:shadow-lg transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">总数据点</CardTitle>
                <div className="p-2 bg-blue-500 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-200">
                  <Database className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">{totalPoints}</div>
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <Target className="h-3 w-3 mr-1" />
                  当前监控的数据点总数
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-lg transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-900">良好质量</CardTitle>
                <div className="p-2 bg-green-500 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-200">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">{goodQualityPoints}</div>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <Wifi className="h-3 w-3 mr-1" />
                  质量状态良好的数据点
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-100 border-red-200 hover:shadow-lg transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-900">错误质量</CardTitle>
                <div className="p-2 bg-red-500 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-200">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">{badQualityPoints}</div>
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <WifiOff className="h-3 w-3 mr-1" />
                  质量状态错误的数据点
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 hover:shadow-lg transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-900">不确定质量</CardTitle>
                <div className="p-2 bg-yellow-500 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-200">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-700">{uncertainQualityPoints}</div>
                <p className="text-xs text-yellow-600 mt-1 flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  质量状态不确定的数据点
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 搜索和筛选 */}
          <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-blue-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">搜索和筛选</CardTitle>
                  <CardDescription className="text-gray-600 flex items-center space-x-2 mt-1">
                    <Search className="h-4 w-4 text-blue-500" />
                    <span>根据数据点名称、设备或分组筛选数据</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="搜索数据点名称或地址..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="relative">
                    <Select value={groupFilter} onValueChange={handleGroupFilter}>
                      <SelectTrigger className="w-[180px] border-gray-300 focus:border-blue-500 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          <SelectValue placeholder="选择分组" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有分组</SelectItem>
                        <SelectItem value="0">未分组</SelectItem>
                        {groups.map((group: Group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="relative">
                    <Select value={deviceFilter} onValueChange={handleDeviceFilter}>
                      <SelectTrigger className="w-[180px] border-gray-300 focus:border-blue-500 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-green-500" />
                          <SelectValue placeholder="选择设备" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
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
            </CardContent>
          </Card>

          {/* 数据点列表 */}
          <Card className="bg-white border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <span>数据点列表</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({dataPoints.length} 个数据点)
                    </span>
                    {autoRefresh && (
                      <Badge variant="outline" className="ml-auto">
                        <Activity className="h-3 w-3 mr-1 animate-pulse" />
                        每 {refreshInterval / 1000}s 刷新
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-600 flex items-center space-x-2 mt-1">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span>实时监控设备数据点的当前值和质量状态</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium">加载数据点失败</p>
                  <p className="text-sm text-gray-500 mt-1">请检查网络连接或稍后重试</p>
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重试
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">数据点名称</TableHead>
                        <TableHead className="font-semibold text-gray-900">设备</TableHead>
                        <TableHead className="font-semibold text-gray-900">分组</TableHead>
                        <TableHead className="font-semibold text-gray-900">地址</TableHead>
                        <TableHead className="font-semibold text-gray-900">数据类型</TableHead>
                        <TableHead className="font-semibold text-gray-900">当前值</TableHead>
                        <TableHead className="font-semibold text-gray-900">质量</TableHead>
                        <TableHead className="font-semibold text-gray-900">趋势</TableHead>
                        <TableHead className="font-semibold text-gray-900">更新时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                              </div>
                              <p className="text-gray-600 font-medium">正在加载数据点...</p>
                              <p className="text-sm text-gray-500 mt-1">请稍候</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : dataPoints.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                              <Database className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-medium">暂无数据点</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {searchTerm || deviceFilter !== 'all' || groupFilter !== 'all' 
                                ? '没有找到匹配的数据点，请检查筛选条件' 
                                : '请添加数据点以开始监控'
                              }
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        dataPoints.map((dataPoint: DataPoint, index: number) => {
                          const dataTypeInfo = getDataTypeInfo(dataPoint.data_type)
                          const qualityInfo = getQualityInfo(dataPoint.quality)
                          const TrendIcon = getTrendIcon(dataPoint.current_value, dataPoint.previous_value)
                          const device = devices.find((d: Device) => d.id === dataPoint.device_id)
                          
                          return (
                            <TableRow key={dataPoint.id} className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <TableCell className="font-medium text-gray-900">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span>{dataPoint.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-700">
                                <div className="flex items-center space-x-2">
                                  <Database className="h-4 w-4 text-green-500" />
                                  <span>{getDeviceName(dataPoint.device_id)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-700">
                                <div className="flex items-center space-x-2">
                                  <Target className="h-4 w-4 text-blue-500" />
                                  <span>{getGroupName(device?.group_id || null)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm bg-gray-100 rounded px-2 py-1">
                                {dataPoint.address}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${dataTypeInfo.color}`}>
                                  {dataTypeInfo.label}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono font-semibold text-gray-900">
                                {formatValue(dataPoint.current_value, dataPoint.data_type)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={qualityInfo.variant} className="flex items-center space-x-1 w-fit shadow-sm">
                                  <qualityInfo.icon className="h-3 w-3" />
                                  <span>{qualityInfo.label}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center">
                                  <TrendIcon className="h-4 w-4 text-gray-500" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1 text-sm text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{dataPoint.updated_at ? formatDateTime(dataPoint.updated_at) : '-'}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}