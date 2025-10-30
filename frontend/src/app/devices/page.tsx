'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
import {
  Plus,
  Edit,
  Trash2,
  Monitor,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  Activity,
  AlertTriangle,
  Server,
  Network,
  Eye,
  Filter,
  Target,
  Database,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react'
import { AddressConfig, type AddressConfig as AddressConfigType } from '@/components/device/address-config'
import { ModbusAddressConfig, type ModbusAddressConfig as ModbusAddressConfigType } from '@/components/device/modbus-address-config'

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
  const [formData, setFormData] = useState({
    name: '',
    plc_type: 'ModbusTCP',
    protocol: 'TCP',
    ip_address: '',
    port: 502,
    addresses: [] as AddressConfigType[] | ModbusAddressConfigType[],
    group_id: 1,
    is_active: true,
    description: '',
  })
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
    mutationFn: (data: CreateDeviceRequest) => apiService.createDevice(data),
    onSuccess: () => {
      toast({
        title: '成功',
        description: '设备创建成功',
      })
      setShowCreateDialog(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
    onError: (error: any) => {
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
      resetForm()
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
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      name: '',
      plc_type: 'ModbusTCP',
      protocol: 'TCP',
      ip_address: '',
      port: 502,
      addresses: [],
      group_id: 1,
      is_active: true,
      description: '',
    })
  }

  /**
   * 处理编辑设备
   */
  const handleEditDevice = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      name: device.name,
      plc_type: device.plc_type,
      protocol: device.protocol,
      ip_address: device.ip_address,
      port: device.port,
      addresses: (() => {
        if (!device.addresses) return []
        if (Array.isArray(device.addresses)) return device.addresses
        if (typeof device.addresses === 'string') {
          try {
            return JSON.parse(device.addresses)
          } catch (error) {
            console.error('Failed to parse device addresses:', error)
            return []
          }
        }
        return []
      })(),
      group_id: device.group_id !== null ? device.group_id : 1,
      is_active: device.is_active,
      description: device.description || '',
    })
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
   * 处理表单提交
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDevice) {
      updateDeviceMutation.mutate({
        id: editingDevice.id,
        data: {
          ...formData,
          addresses: JSON.stringify(formData.addresses),
        },
      })
    } else {
      createDeviceMutation.mutate({
        ...formData,
        addresses: JSON.stringify(formData.addresses),
      })
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
        <div className="w-full max-w-none p-6 space-y-6">
          {/* 页面标题 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">设备管理</h1>
                    <p className="text-blue-600 mt-1 font-medium">管理和监控PLC设备</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  resetForm()
                  setShowCreateDialog(true)
                }}
                variant="outline"
                className="bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加设备
              </Button>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">总设备数</p>
                    <p className="text-2xl font-bold">{devices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Wifi className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">在线设备</p>
                    <p className="text-2xl font-bold text-green-600">
                      {devices.filter(d => d.status === 'online').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">离线设备</p>
                    <p className="text-2xl font-bold text-red-600">
                      {devices.filter(d => d.status === 'offline').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">活跃设备</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {devices.filter(d => d.is_active).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索设备名称或IP地址..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-0 bg-muted/50"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="online">在线</SelectItem>
                  <SelectItem value="offline">离线</SelectItem>
                  <SelectItem value="active">已启用</SelectItem>
                  <SelectItem value="inactive">已禁用</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="分组筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分组</SelectItem>
                  {groups.map((group: any) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading_}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading_ ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>

          {/* 设备列表 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                设备列表
                <Badge variant="secondary" className="ml-2">
                  {filteredDevices.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading_ ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2 text-blue-600" />
                  <span className="text-muted-foreground">加载中...</span>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">暂无设备数据</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm()
                      setShowCreateDialog(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    创建第一个设备
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">设备信息</TableHead>
                        <TableHead>连接配置</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>分组</TableHead>
                        <TableHead>地址数量</TableHead>
                        <TableHead>更新时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{device.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {device.plc_type}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Network className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-mono text-sm">
                                  {device.ip_address}:{device.port}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {device.protocol}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusDisplay(device)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {device.group_id ? getGroupName(device.group_id) : '未知分组'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Zap className="h-4 w-4 text-muted-foreground" />
                              <span>{device.addresses?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(device.updated_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditDevice(device)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDevice(device)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
              )}
            </CardContent>
          </Card>

          {/* 创建/编辑设备对话框 */}
          <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false)
              setShowEditDialog(false)
              setEditingDevice(null)
              resetForm()
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-lg font-semibold">
                  {editingDevice ? '编辑设备' : '添加设备'}
                </DialogTitle>
                <DialogDescription>
                  {editingDevice ? '修改设备配置信息' : '创建新的PLC设备配置'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">设备名称 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="输入设备名称"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="plc_type">PLC类型 *</Label>
                    <Select
                      value={formData.plc_type}
                      onValueChange={(value) => setFormData({ ...formData, plc_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ModbusTCP">Modbus TCP</SelectItem>
                        <SelectItem value="ModbusRTU">Modbus RTU</SelectItem>
                        <SelectItem value="ModbusRTU_Over_TCP">Modbus RTU over TCP</SelectItem>
                        <SelectItem value="Siemens">Siemens S7</SelectItem>
                        <SelectItem value="Omron">Omron Fins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="protocol">通信协议 *</Label>
                    <Select
                      value={formData.protocol}
                      onValueChange={(value) => setFormData({ ...formData, protocol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TCP">TCP</SelectItem>
                        <SelectItem value="UDP">UDP</SelectItem>
                        <SelectItem value="Serial">Serial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ip_address">IP地址 *</Label>
                    <Input
                      id="ip_address"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                      placeholder="192.168.1.100"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="port">端口号 *</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 502 })}
                      placeholder="502"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="group_id">设备分组 *</Label>
                    <Select
                      value={formData.group_id.toString()}
                      onValueChange={(value) => setFormData({ ...formData, group_id: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group: any) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">设备描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入设备描述信息"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    启用设备
                  </Label>
                </div>
                
                {/* 地址配置 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <Label className="text-base font-medium">
                      地址配置
                      {isModbusDevice(formData.plc_type) && (
                        <Badge variant="secondary" className="ml-2">
                          Modbus增强
                        </Badge>
                      )}
                    </Label>
                  </div>
                  {isModbusDevice(formData.plc_type) ? (
                    <ModbusAddressConfig
                      value={formData.addresses as ModbusAddressConfigType[]}
                      onChange={(addresses) => setFormData({ ...formData, addresses })}
                      plcType={formData.plc_type}
                    />
                  ) : (
                    <AddressConfig
                      value={formData.addresses}
                      onChange={(addresses) => setFormData({ ...formData, addresses })}
                      plcType={formData.plc_type}
                    />
                  )}
                </div>
                
                <DialogFooter className="pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setShowEditDialog(false)
                      setEditingDevice(null)
                      resetForm()
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}
                  >
                    {(createDeviceMutation.isPending || updateDeviceMutation.isPending) && (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    )}
                    {editingDevice ? '更新设备' : '创建设备'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}