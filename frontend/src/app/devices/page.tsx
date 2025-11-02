'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
import { apiService } from '@/services/api'
import { Device, Group, CreateDeviceRequest, UpdateDeviceRequest } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { DeviceForm } from '@/components/device/device-form'

import {
  Plus,
  Edit,
  Trash2,
  Monitor,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  Server,
  Network,
  Database,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react'

/**
 * 设备管理页面组件
 * 提供设备的增删改查功能
 */
export default function DevicesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 获取设备列表
  const {
    data: devicesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['devices', { search: searchTerm, status: statusFilter, group: groupFilter }],
    queryFn: () => apiService.getDevices({
      page: 1,
      page_size: 100,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      group_id: groupFilter !== 'all' ? parseInt(groupFilter) : undefined,
    }),
  })

  // 获取分组列表
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiService.getGroups({ page: 1, page_size: 100 }),
  })

  const devices = useMemo(() => devicesData?.data || [], [devicesData])
  const groups = useMemo(() => groupsData?.data || [], [groupsData])
  const isLoading_ = isLoading

  /**
   * 获取分组名称
   */
  const getGroupName = (groupId: number) => {
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : '未知分组'
  }

  /**
   * 创建设备
   */
  const createDeviceMutation = useMutation({
    mutationFn: (data: CreateDeviceRequest) => {
      console.log('createDevice mutation 被调用，数据:', data)
      return apiService.createDevice(data)
    },
    onSuccess: (result) => {
      console.log('设备创建成功，结果:', result)
      toast({
        title: '成功',
        description: '设备创建成功',
      })
      setShowCreateDialog(false)
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
    onError: (error: any) => {
      console.error('设备创建失败，错误:', error)
      toast({
        title: '错误',
        description: error.response?.data?.detail || '创建设备失败',
        variant: 'destructive',
      })
    },
  })

  /**
   * 更新设备
   */
  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDeviceRequest }) =>
      apiService.updateDevice(id, data),
    onSuccess: () => {
      toast({
        title: '成功',
        description: '设备更新成功',
      })
      setShowEditDialog(false)
      setEditingDevice(null)
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
    onError: (error: any) => {
      toast({
        title: '错误',
        description: error.response?.data?.detail || '更新设备失败',
        variant: 'destructive',
      })
    },
  })

  /**
   * 删除设备
   */
  const deleteDeviceMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteDevice(id),
    onSuccess: () => {
      toast({
        title: '成功',
        description: '设备删除成功',
      })
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
    onError: (error: any) => {
      toast({
        title: '错误',
        description: error.response?.data?.detail || '删除设备失败',
        variant: 'destructive',
      })
    },
  })

  /**
   * 判断是否为Modbus设备
   */
  const isModbusDevice = (plcType: string) => {
    return plcType.toLowerCase().includes('modbus')
  }

  /**
   * 处理编辑设备
   */
  const handleEditDevice = (device: Device) => {
    setEditingDevice(device)
    setShowEditDialog(true)
  }

  /**
   * 处理删除设备
   */
  const handleDeleteDevice = (device: Device) => {
    if (window.confirm(`确定要删除设备 "${device.name}" 吗？`)) {
      deleteDeviceMutation.mutate(device.id)
    }
  }

  
  /**
   * 获取设备状态显示
   */
  const getStatusDisplay = (device: Device) => {
    if (!device.is_active) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          已禁用
        </Badge>
      )
    }
    
    switch (device.status) {
      case 'online':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            在线
          </Badge>
        )
      case 'offline':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            离线
          </Badge>
        )
      case 'connecting':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Loader className="h-3 w-3 animate-spin" />
            连接中
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
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            未知
          </Badge>
        )
    }
  }

  /**
   * 过滤设备列表
   */
  const filteredDevices = useMemo(() => {
    return devices.filter((device: any) => {
      const matchesSearch = !searchTerm || 
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ip_address.includes(searchTerm)
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && device.is_active) ||
        (statusFilter === 'inactive' && !device.is_active) ||
        device.status === statusFilter
      
      const matchesGroup = groupFilter === 'all' || 
        (device.group_id !== null && device.group_id.toString() === groupFilter)
      
      return matchesSearch && matchesStatus && matchesGroup
    })
  }, [devices, searchTerm, statusFilter, groupFilter])

  return (
    <AuthGuard requireAdmin>
      <MainLayout>
        <div className="w-full max-w-none p-6 space-y-8">
          {/* 页面标题 - 扁平拟物风格 */}
          <div className="neumorphic-card p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-neumorphic-lg">
                  <Activity className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-h1 gradient-text mb-2">设备管理</h1>
                  <p className="text-body text-muted-foreground">管理和监控PLC设备</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowCreateDialog(true)
                }}
                variant="default"
                size="lg"
                className="shadow-neumorphic hover:shadow-neumorphic-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                添加设备
              </Button>
            </div>
          </div>

          {/* 统计信息 - 扁平拟物风格 */}
          <div className="dashboard-grid">
            <div className="stat-card group">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-2">
                  <h3 className="text-h4 text-foreground">总设备数</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium bg-muted/50 px-3 py-1 rounded-full border border-border/50 shadow-neumorphic-sm">
                      +{Math.round(devices.length * 0.1)}%
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                  <Server className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="stat-card-number">{devices.length}</div>
            </div>

            <div className="stat-card group">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-2">
                  <h3 className="text-h4 text-foreground">在线设备</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 shadow-neumorphic-sm">
                      正常
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                  <Wifi className="h-6 w-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="stat-card-number text-emerald-600">
                {devices.filter(d => d.status === 'online').length}
              </div>
            </div>

            <div className="stat-card group">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-2">
                  <h3 className="text-h4 text-foreground">离线设备</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200 shadow-neumorphic-sm">
                      异常
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                  <WifiOff className="h-6 w-6 text-red-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="stat-card-number text-red-600">
                {devices.filter(d => d.status === 'offline').length}
              </div>
            </div>

            <div className="stat-card group">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-2">
                  <h3 className="text-h4 text-foreground">活跃设备</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200 shadow-neumorphic-sm">
                      已启用
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                  <Activity className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="stat-card-number text-blue-600">
                {devices.filter(d => d.is_active).length}
              </div>
            </div>
          </div>

          {/* 搜索和筛选 - 扁平拟物风格 */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="搜索设备名称或IP地址..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 text-body"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-12 min-w-36 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                      <SelectValue placeholder="状态筛选" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="online">在线</SelectItem>
                      <SelectItem value="offline">离线</SelectItem>
                      <SelectItem value="active">已启用</SelectItem>
                      <SelectItem value="inactive">已禁用</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="h-12 min-w-36 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                      <SelectValue placeholder="分组筛选" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                      <SelectItem value="all">全部分组</SelectItem>
                      {groups.map((group: any) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => refetch()}
                  disabled={isLoading_}
                  className="h-12 px-6 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 w-full sm:w-auto"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isLoading_ ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </div>
          </div>

          {/* 设备列表 - 扁平拟物风格 */}
          <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <span className="text-h2 gradient-text">设备列表</span>
                  <Badge variant="secondary" className="ml-3 text-body-sm">
                    {filteredDevices.length} 台设备
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading_ ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm mb-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                  <span className="text-body text-muted-foreground">加载设备数据中...</span>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm inline-block mb-6">
                    <Monitor className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-h3 text-foreground mb-3">暂无设备数据</h3>
                  <p className="text-body text-muted-foreground mb-6">
                    当前没有找到符合条件的设备，请尝试调整筛选条件或创建新设备
                  </p>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => {
                      setShowCreateDialog(true)
                    }}
                    className="shadow-neumorphic hover:shadow-neumorphic-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    创建第一个设备
                  </Button>
                </div>
              ) : (
                <>
                  {/* 桌面端表格视图 */}
                  <div className="hidden lg:block rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[220px] text-h4 font-semibold">设备信息</TableHead>
                          <TableHead className="text-h4 font-semibold">连接配置</TableHead>
                          <TableHead className="text-h4 font-semibold">状态</TableHead>
                          <TableHead className="text-h4 font-semibold">分组</TableHead>
                          <TableHead className="text-h4 font-semibold">地址数量</TableHead>
                          <TableHead className="text-h4 font-semibold">更新时间</TableHead>
                          <TableHead className="text-right text-h4 font-semibold">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDevices.map((device) => (
                          <TableRow key={device.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm group-hover:scale-110 transition-all duration-300">
                                  <Monitor className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-body group-hover:text-primary transition-colors duration-300">
                                    {device.name}
                                  </div>
                                  <div className="text-body-sm text-muted-foreground">
                                    {device.plc_type}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-neumorphic-sm">
                                  <Network className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <div className="font-mono text-body-sm font-medium">
                                    {device.ip_address}:{device.port}
                                  </div>
                                  <div className="text-caption text-muted-foreground">
                                    {device.protocol}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusDisplay(device)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="shadow-neumorphic-sm">
                                {device.group_id ? getGroupName(device.group_id) : '未知分组'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 shadow-neumorphic-sm">
                                  <Zap className="h-4 w-4 text-yellow-600" />
                                </div>
                                <span className="font-semibold text-body">{device.addresses?.length || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                                <div className="p-1.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                                {formatDateTime(device.updated_at)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDevice(device)}
                                  className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDevice(device)}
                                  className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 移动端卡片视图 */}
                  <div className="lg:hidden p-6 space-y-4">
                    {filteredDevices.map((device) => (
                      <Card key={device.id} className="border-0 shadow-neumorphic-sm hover:shadow-neumorphic hover:-translate-y-1 transition-all duration-300">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                                <Monitor className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-body font-semibold">{device.name}</CardTitle>
                                <CardDescription className="text-body-sm">{device.plc_type}</CardDescription>
                              </div>
                            </div>
                            {getStatusDisplay(device)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-body-sm text-muted-foreground font-medium">连接配置</label>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-neumorphic-sm">
                                  <Network className="h-3.5 w-3.5 text-green-600" />
                                </div>
                                <span className="font-mono text-body-sm">{device.ip_address}:{device.port}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-body-sm text-muted-foreground font-medium">分组</label>
                              <Badge variant="outline" className="shadow-neumorphic-sm">
                                {device.group_id ? getGroupName(device.group_id) : '未知分组'}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <label className="text-body-sm text-muted-foreground font-medium">地址数量</label>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 shadow-neumorphic-sm">
                                  <Zap className="h-3.5 w-3.5 text-yellow-600" />
                                </div>
                                <span className="font-semibold text-body">{device.addresses?.length || 0}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-body-sm text-muted-foreground font-medium">更新时间</label>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-body-sm">{formatDateTime(device.updated_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDevice(device)}
                              className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDevice(device)}
                              className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 创建/编辑设备对话框 */}
          <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false)
              setShowEditDialog(false)
              setEditingDevice(null)
            }
          }}>
            <DeviceForm
              device={editingDevice || undefined}
              groups={groups}
              onSubmit={(data) => {
                console.log('设备页面 onSubmit 被调用，数据:', data)
                if (editingDevice) {
                  console.log('更新设备模式，设备ID:', editingDevice.id)
                  const updateData: UpdateDeviceRequest = {
                    name: data.name || '',
                    plc_type: data.plc_type || 'modbus_tcp',
                    protocol: data.protocol || 'tcp',
                    ip_address: data.ip_address || '',
                    port: data.port || 502,
                    addresses: JSON.stringify(data.addresses),
                    group_id: data.group_id || 1,
                    is_active: data.is_active ?? true,
                    description: data.description || '',
                  }
                  console.log('调用更新设备API，数据:', updateData)
                  updateDeviceMutation.mutate({
                    id: editingDevice.id,
                    data: updateData,
                  })
                } else {
                  console.log('创建设备模式')
                  const createData: CreateDeviceRequest = {
                    name: data.name || '',
                    plc_type: data.plc_type || 'modbus_tcp',
                    protocol: data.protocol || 'tcp',
                    ip_address: data.ip_address || '',
                    port: data.port || 502,
                    addresses: JSON.stringify(data.addresses),
                    group_id: data.group_id || 1,
                    is_active: data.is_active ?? true,
                    description: data.description || '',
                  }
                  console.log('调用创建设备API，数据:', createData)
                  createDeviceMutation.mutate(createData)
                }
              }}
              onCancel={() => {
                setShowCreateDialog(false)
                setShowEditDialog(false)
                setEditingDevice(null)
              }}
              loading={createDeviceMutation.isPending || updateDeviceMutation.isPending}
            />
          </Dialog>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}