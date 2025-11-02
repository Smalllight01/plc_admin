'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddressConfig, type AddressConfig as AddressConfigType } from '@/components/device/address-config'
import { Device, Group, CreateDeviceRequest, UpdateDeviceRequest } from '@/lib/api'
import { Server, Settings, Database, AlertCircle, Plus, Zap, Plug, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

// 协议配置模板
const PROTOCOL_TEMPLATES = {
  modbus_tcp: {
    name: 'Modbus TCP',
    description: '标准Modbus TCP协议',
    defaultPort: 502,
    addressExample: '40001 (保持寄存器)',
    icon: '📡',
    color: 'blue'
  },
  modbus_rtu_over_tcp: {
    name: 'Modbus RTU over TCP',
    description: 'RTU协议通过TCP传输，支持多站号',
    defaultPort: 502,
    addressExample: '40001 (站号1-247)',
    icon: '🔌',
    color: 'green'
  },
  omron_fins: {
    name: 'Omron FINS',
    description: '欧姆龙FINS协议',
    defaultPort: 9600,
    addressExample: 'D100 (数据区)',
    icon: '⚙️',
    color: 'orange'
  },
  siemens_s7: {
    name: 'Siemens S7',
    description: '西门子S7协议',
    defaultPort: 102,
    addressExample: 'DB1.X0.0 (DB块)',
    icon: '🏭',
    color: 'purple'
  }
}

// 常用地址模板
const ADDRESS_TEMPLATES = {
  modbus_tcp: [
    { name: '温度', address: '40001', type: 'int16', unit: '°C', scale: 0.1 },
    { name: '湿度', address: '40002', type: 'int16', unit: '%RH', scale: 0.1 },
    { name: '压力', address: '40003', type: 'int16', unit: 'bar', scale: 0.01 },
    { name: '开关状态', address: '1', type: 'bool', unit: '', scale: 1 }
  ],
  modbus_rtu_over_tcp: [
    { name: '温度', address: '40001', type: 'int16', unit: '°C', scale: 0.1 },
    { name: '湿度', address: '40002', type: 'int16', unit: '%RH', scale: 0.1 },
    { name: '压力', address: '40003', type: 'int16', unit: 'bar', scale: 0.01 },
    { name: '开关状态', address: '1', type: 'bool', unit: '', scale: 1 }
  ]
}

interface DeviceFormProps {
  device?: Device
  groups: Group[]
  onSubmit: (data: CreateDeviceRequest | UpdateDeviceRequest) => void
  onCancel: () => void
  loading?: boolean
}

export function DeviceForm({ device, groups, onSubmit, onCancel, loading }: DeviceFormProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [connectionTest, setConnectionTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({
    name: '',
    plc_type: 'modbus_tcp',
    protocol: 'tcp',
    ip_address: '',
    port: 502,
    addresses: [] as AddressConfigType[],
    group_id: 1,
    is_active: true,
    description: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (device) {
      let parsedAddresses = []
      if (device.addresses) {
        try {
          if (typeof device.addresses === 'string') {
            parsedAddresses = JSON.parse(device.addresses)
          } else {
            parsedAddresses = device.addresses
          }
        } catch (error) {
          console.error('解析设备地址失败:', error)
          parsedAddresses = []
        }
      }

      setFormData({
        name: device.name || '',
        plc_type: device.plc_type || 'modbus_tcp',
        protocol: device.protocol || 'tcp',
        ip_address: device.ip_address || '',
        port: device.port || 502,
        addresses: parsedAddresses,
        group_id: device.group_id || 1,
        is_active: device.is_active ?? true,
        description: device.description || '',
      })
    } else {
      // 如果没有设备数据（新建模式），重置为默认值
      setFormData({
        name: '',
        plc_type: 'modbus_tcp',
        protocol: 'tcp',
        ip_address: '',
        port: 502,
        addresses: [],
        group_id: 1,
        is_active: true,
        description: '',
      })
    }
    // 重置错误状态
    setErrors({})
    // 重置活动标签
    setActiveTab('basic')
    // 重置连接测试状态
    setConnectionTest('idle')
  }, [device])

  // 重置表单数据的函数
  const resetForm = () => {
    setFormData({
      name: '',
      plc_type: 'modbus_tcp',
      protocol: 'tcp',
      ip_address: '',
      port: 502,
      addresses: [],
      group_id: 1,
      is_active: true,
      description: '',
    })
    setErrors({})
    setActiveTab('basic')
    setConnectionTest('idle')
  }

  const getDefaultPort = (protocolType: string): number => {
    const defaultPorts: Record<string, number> = {
      'modbus_tcp': 502,
      'modbus_rtu_over_tcp': 502,
      'omron_fins': 9600,
      'siemens_s7': 102
    }
    return defaultPorts[protocolType] || 502
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '设备名称不能为空'
    }

    // 只有当protocol为tcp时才需要IP地址
    if (formData.protocol === 'tcp' && !formData.ip_address.trim()) {
      newErrors.ip_address = 'IP地址不能为空'
    }

    // 只有当protocol为tcp时才需要端口验证
    if (formData.protocol === 'tcp' && (!formData.port || formData.port < 1 || formData.port > 65535)) {
      newErrors.port = '端口号必须在1-65535之间'
    }

    // 注释掉地址验证，允许创建设备时不配置地址
    // if (!formData.addresses || formData.addresses.length === 0) {
    //   newErrors.addresses = '至少需要配置一个采集地址'
    // }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('=== 表单提交开始 ===')
    console.log('表单数据:', formData)
    console.log('onSubmit 函数类型:', typeof onSubmit)

    const isValid = validateForm()
    console.log('表单验证结果:', isValid)

    if (!isValid) {
      console.log('表单验证失败，错误信息:', errors)
      setActiveTab('basic')
      return
    }

    console.log('表单验证通过，准备调用 onSubmit 回调')

    // 确保onSubmit函数存在
    if (typeof onSubmit === 'function') {
      console.log('调用 onSubmit 回调，数据:', formData)
      onSubmit(formData)
    } else {
      console.error('错误: onSubmit 回调函数不存在!')
      console.error('onSubmit 值:', onSubmit)
    }
  }


  const handleAddressesChange = (addresses: AddressConfigType[]) => {
    setFormData(prev => ({ ...prev, addresses }))
    if (errors.addresses) {
      setErrors(prev => ({ ...prev, addresses: '' }))
    }
  }

  // 添加地址模板
  const addAddressTemplate = () => {
    const templates = ADDRESS_TEMPLATES[formData.plc_type as keyof typeof ADDRESS_TEMPLATES] || []
    const newAddresses = templates.map((template, index) => ({
      ...template,
      id: `${Date.now()}_${index}`,
      stationId: 1
    }))

    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, ...newAddresses]
    }))

    setActiveTab('addresses')
  }

  // 测试连接
  const testConnection = async () => {
    if (!formData.ip_address || !formData.port) {
      setErrors(prev => ({ ...prev, connection: '请先填写IP地址和端口' }))
      return
    }

    // 验证IP地址格式
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(formData.ip_address)) {
      setConnectionTest('error')
      setErrors(prev => ({ ...prev, connection: 'IP地址格式不正确' }))
      setTimeout(() => setConnectionTest('idle'), 3000)
      return
    }

    setConnectionTest('testing')
    setErrors(prev => ({ ...prev, connection: '' }))

    try {
      // 调用真实的连接测试API
      const response = await fetch(`/api/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: formData.ip_address,
          port: formData.port,
          protocol: formData.plc_type,
          timeout: 5000
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConnectionTest('success')
          setTimeout(() => setConnectionTest('idle'), 3000)
        } else {
          setConnectionTest('error')
          setErrors(prev => ({ ...prev, connection: result.message || '连接失败' }))
          setTimeout(() => setConnectionTest('idle'), 3000)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || '连接测试失败')
      }
    } catch (error) {
      setConnectionTest('error')
      const errorMessage = error instanceof Error ? error.message : '无法连接到设备，请检查网络和设备状态'
      setErrors(prev => ({ ...prev, connection: errorMessage }))
      setTimeout(() => setConnectionTest('idle'), 3000)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const isEditMode = !!device
  const currentProtocol = PROTOCOL_TEMPLATES[formData.plc_type as keyof typeof PROTOCOL_TEMPLATES]

  return (
    <form>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4 px-6 pt-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Server className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                {isEditMode ? '编辑设备' : '添加设备'}
                <Badge variant="outline" className="text-xs">
                  {isEditMode ? '编辑模式' : '新建模式'}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? '修改设备配置信息' : '配置新的工业设备连接'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 标签导航 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                基本配置
              </TabsTrigger>
              <TabsTrigger value="addresses" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                采集地址
                {formData.addresses.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {formData.addresses.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <TabsContent value="basic" className="space-y-6 mt-0">
            {/* 基本配置卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  设备基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      设备名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="例如：车间1号PLC"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">设备描述</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="设备用途、位置等描述信息"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active">启用设备</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_id">
                      设备分组 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.group_id.toString()}
                      onValueChange={(value) => handleInputChange('group_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择分组" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 协议配置卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plug className="h-4 w-4" />
                  通信协议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="plc_type">
                      通信协议 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.plc_type}
                      onValueChange={(value) => {
                        handleInputChange('plc_type', value)
                        const protocolMap: Record<string, string> = {
                          'modbus_tcp': 'tcp',
                          'modbus_rtu_over_tcp': 'tcp',
                          'omron_fins': 'tcp',
                          'siemens_s7': 'tcp'
                        }
                        handleInputChange('protocol', protocolMap[value] || 'tcp')
                        handleInputChange('port', getDefaultPort(value))
                      }}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="选择协议" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {Object.entries(PROTOCOL_TEMPLATES).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{template.icon}</span>
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-gray-500">{template.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ip_address">
                        IP地址 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="ip_address"
                        value={formData.ip_address}
                        onChange={(e) => handleInputChange('ip_address', e.target.value)}
                        placeholder="192.168.1.100"
                        className={errors.ip_address ? 'border-red-500' : ''}
                      />
                      {errors.ip_address && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.ip_address}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="port">
                        端口号 <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="port"
                          type="number"
                          min="1"
                          max="65535"
                          value={formData.port}
                          onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 502)}
                          className={errors.port ? 'border-red-500' : ''}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={testConnection}
                          disabled={connectionTest === 'testing' || !formData.ip_address || !formData.port}
                          className="whitespace-nowrap flex-shrink-0"
                        >
                          {connectionTest === 'testing' ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              测试中
                            </>
                          ) : connectionTest === 'success' ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                              成功
                            </>
                          ) : connectionTest === 'error' ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1 text-red-500" />
                              失败
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              测试连接
                            </>
                          )}
                        </Button>
                      </div>
                      {errors.port && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.port}
                        </p>
                      )}
                      {errors.connection && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.connection}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 协议说明 */}
                {currentProtocol && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      {currentProtocol.icon} {currentProtocol.name}
                    </h4>
                    <p className="text-sm text-blue-700 mb-2">{currentProtocol.description}</p>
                    <div className="text-xs text-blue-600">
                      地址示例: {currentProtocol.addressExample} | 默认端口: {currentProtocol.defaultPort}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 快速操作卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">快速操作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAddressTemplate}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    添加常用地址
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses" className="mt-0">
            <Card>
              <CardContent className="p-6">
                <AddressConfig
                  value={formData.addresses}
                  onChange={handleAddressesChange}
                  disabled={loading}
                  plcType={formData.plc_type}
                />
              </CardContent>
            </Card>
          </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t p-6 flex-shrink-0">
          <div className="flex justify-end">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm()
                  onCancel()
                }}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? '保存中...' : (isEditMode ? '更新设备' : '创建设备')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </form>
  )
}