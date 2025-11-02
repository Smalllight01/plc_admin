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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-surface-light">
          <XCircle className="h-3.5 w-3.5 text-white/60" />
          <span className="text-xs font-semibold text-white/60">已禁用</span>
        </div>
      )
    }

    switch (device.status) {
      case 'online':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/20 backdrop-blur ring-1 ring-accent/30">
            <CheckCircle className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-accent">在线</span>
          </div>
        )
      case 'offline':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 backdrop-blur ring-1 ring-red-500/30">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-400">离线</span>
          </div>
        )
      case 'connecting':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 backdrop-blur ring-1 ring-amber-500/30">
            <Loader className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            <span className="text-xs font-semibold text-amber-400">连接中</span>
          </div>
        )
      case 'error':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 backdrop-blur ring-1 ring-red-500/30">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-400">错误</span>
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-surface-light">
            <AlertTriangle className="h-3.5 w-3.5 text-white/60" />
            <span className="text-xs font-semibold text-white/60">未知</span>
          </div>
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
    <div className="w-full max-w-none p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* 页面标题 - Novara风格 */}
          <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl tracking-tight text-white">设备管理</h1>
                <p className="text-sm md:text-base text-white/70 font-medium mt-1">管理和监控PLC设备连接状态</p>
              </div>
              <Button
                onClick={() => {
                  setShowCreateDialog(true)
                }}
                //size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
              >
                <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                <span className="hidden sm:inline">添加设备</span>
                <span className="sm:hidden">添加</span>
              </Button>
            </div>
          </div>

          {/* 统计信息 - Novara风格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">总设备数</div>
                <div className="p-2 rounded-xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                  <Server className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl md:text-3xl tracking-tight text-white">
                  {devices.length}
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="text-sm font-semibold">+10%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">在线设备</div>
                <div className="p-2 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl md:text-3xl tracking-tight text-emerald-400">
                  {devices.filter(d => d.status === 'online').length}
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="text-sm font-semibold">正常</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_0.8s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">离线设备</div>
                <div className="p-2 rounded-xl bg-red-500/20 backdrop-blur ring-1 ring-red-500/30">
                  <WifiOff className="w-4 h-4 text-red-400" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl md:text-3xl tracking-tight text-red-400">
                  {devices.filter(d => d.status === 'offline').length}
                </div>
                <div className="flex items-center gap-1 text-red-400">
                  <span className="text-sm font-semibold">异常</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300 animate-[fadeInUp_0.6s_ease-out_0.9s_both]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 font-medium">活跃设备</div>
                <div className="p-2 rounded-xl bg-purple-500/20 backdrop-blur ring-1 ring-purple-500/30">
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl md:text-3xl tracking-tight text-purple-400">
                  {devices.filter(d => d.is_active).length}
                </div>
                <div className="flex items-center gap-1 text-purple-400">
                  <span className="text-sm font-semibold">已启用</span>
                </div>
              </div>
            </div>
          </div>

          {/* 搜索和筛选 - Novara风格 */}
          <div className="rounded-2xl glass-card p-4 animate-[fadeInUp_0.6s_ease-out_1s_both]">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                  <Input
                    placeholder="搜索设备名称或IP地址..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-12 min-w-36 bg-white/10 backdrop-blur border border-white/20 text-white focus:bg-white/20 focus:border-white/30">
                      <SelectValue placeholder="状态筛选" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface backdrop-blur border border-white/10">
                      <SelectItem value="all" className="text-white">全部状态</SelectItem>
                      <SelectItem value="online" className="text-white">在线</SelectItem>
                      <SelectItem value="offline" className="text-white">离线</SelectItem>
                      <SelectItem value="active" className="text-white">已启用</SelectItem>
                      <SelectItem value="inactive" className="text-white">已禁用</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="h-12 min-w-36 bg-white/10 backdrop-blur border border-white/20 text-white focus:bg-white/20 focus:border-white/30">
                      <SelectValue placeholder="分组筛选" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface backdrop-blur border border-white/10">
                      <SelectItem value="all" className="text-white">全部分组</SelectItem>
                      {groups.map((group: any) => (
                        <SelectItem key={group.id} value={group.id.toString()} className="text-white">
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="h-12 px-6 bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200 w-full sm:w-auto"
                  onClick={() => refetch()}
                  disabled={isLoading_}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading_ ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </div>
          </div>

          {/* 设备列表 - Novara风格 */}
          <div className="rounded-2xl glass-card p-4 md:p-6 animate-[fadeInUp_0.6s_ease-out_1.1s_both]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                  <Database className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">设备列表</h2>
                  <p className="text-sm text-white/70 mt-1">
                    共 {filteredDevices.length} 台设备
                  </p>
                </div>
              </div>
            </div>
            <div className="p-0">
              {isLoading_ ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-2xl glass-surface-light mb-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-accent" />
                  </div>
                  <span className="text-white/70">加载设备数据中...</span>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl glass-surface-light inline-block mb-6">
                    <Monitor className="h-16 w-16 text-white/60" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">暂无设备数据</h3>
                  <p className="text-white/60 mb-6 max-w-md mx-auto">
                    当前没有找到符合条件的设备，请尝试调整筛选条件或创建新设备
                  </p>
                  <Button
                    className="glass-btn-primary"
                    onClick={() => {
                      setShowCreateDialog(true)
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    创建第一个设备
                  </Button>
                </div>
              ) : (
                <>
                  {/* 桌面端表格视图 */}
                  <div className="hidden lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">设备信息</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">连接配置</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">状态</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">分组</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">地址数量</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">更新时间</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-white/70">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredDevices.map((device) => (
                            <tr key={device.id} className="hover:bg-white/5 transition-colors duration-200">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-2.5 rounded-2xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30 group-hover:scale-110 transition-all duration-300">
                                    <Monitor className="h-5 w-5 text-blue-400" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-white text-sm group-hover:text-accent transition-colors duration-300">
                                      {device.name}
                                    </div>
                                    <div className="text-xs text-white/60">
                                      {device.plc_type}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-2xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                                    <Network className="h-4 w-4 text-emerald-400" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-sm font-medium text-white">
                                      {device.ip_address}:{device.port}
                                    </div>
                                    <div className="text-xs text-white/60">
                                      {device.protocol}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {getStatusDisplay(device)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="inline-flex items-center px-3 py-1 rounded-full glass-surface-light border border-white/10">
                                  <span className="text-xs text-white/80">
                                    {device.group_id ? getGroupName(device.group_id) : '未知分组'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-2xl bg-amber-500/20 backdrop-blur ring-1 ring-amber-500/30">
                                    <Zap className="h-4 w-4 text-amber-400" />
                                  </div>
                                  <span className="font-semibold text-white text-sm">{device.addresses?.length || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm text-white/60">
                                  <div className="p-1.5 rounded-xl glass-surface-light">
                                    <Clock className="h-3.5 w-3.5" />
                                  </div>
                                  {formatDateTime(device.updated_at)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    className="glass-btn h-8 w-8 p-0"
                                    size="sm"
                                    onClick={() => handleEditDevice(device)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    className="glass-btn h-8 w-8 p-0 hover:bg-red-500/20 hover:border-red-500/30"
                                    size="sm"
                                    onClick={() => handleDeleteDevice(device)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 移动端卡片视图 - Novara风格 */}
                  <div className="lg:hidden space-y-4">
                    {filteredDevices.map((device) => (
                      <div key={device.id} className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                              <Monitor className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">{device.name}</h3>
                              <p className="text-xs text-white/60">{device.plc_type}</p>
                            </div>
                          </div>
                          {getStatusDisplay(device)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <label className="text-xs text-white/60 font-medium">连接配置</label>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                                <Network className="h-3.5 w-3.5 text-emerald-400" />
                              </div>
                              <span className="font-mono text-xs text-white">{device.ip_address}:{device.port}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-white/60 font-medium">分组</label>
                            <div className="inline-flex items-center px-2 py-1 rounded-full glass-surface-light border border-white/10">
                              <span className="text-xs text-white/80">
                                {device.group_id ? getGroupName(device.group_id) : '未知分组'}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-white/60 font-medium">地址数量</label>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-xl bg-amber-500/20 backdrop-blur ring-1 ring-amber-500/30">
                                <Zap className="h-3.5 w-3.5 text-amber-400" />
                              </div>
                              <span className="font-semibold text-xs text-white">{device.addresses?.length || 0}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-white/60 font-medium">更新时间</label>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-xl glass-surface-light">
                                <Clock className="h-3.5 w-3.5 text-white/60" />
                              </div>
                              <span className="text-xs text-white/60">{formatDateTime(device.updated_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
                          <Button
                            className="glass-btn h-8 w-8 p-0"
                            size="sm"
                            onClick={() => handleEditDevice(device)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            className="glass-btn h-8 w-8 p-0 hover:bg-red-500/20 hover:border-red-500/30"
                            size="sm"
                            onClick={() => handleDeleteDevice(device)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

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
  )
}