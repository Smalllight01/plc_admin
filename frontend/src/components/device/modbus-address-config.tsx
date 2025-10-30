'use client'

import React, { useState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Copy,
  Download,
  Upload,
  Settings,
  Zap,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { AddressConfig, type AddressConfig as AddressConfigType } from './address-config'

/**
 * Modbus地址配置接口
 */
export interface ModbusAddressConfig extends AddressConfig {
  stationId?: number        // 站号
  byteOrder?: string        // 字节顺序
  wordSwap?: boolean        // 字交换
  scanRate?: number         // 扫描频率(ms)
  deadBand?: number         // 死区值
  scaling?: {               // 缩放配置
    enabled: boolean
    inputMin: number
    inputMax: number
    outputMin: number
    outputMax: number
  }
}

/**
 * Modbus地址配置组件属性
 */
interface ModbusAddressConfigProps {
  value: ModbusAddressConfig[]
  onChange: (addresses: ModbusAddressConfig[]) => void
  disabled?: boolean
  plcType?: string
}


/**
 * 预设单位分类
 */
const UNIT_CATEGORIES = {
  '温度': ['°C', '°F', 'K', '°R'],
  '压力': ['Pa', 'kPa', 'MPa', 'bar', 'psi', 'mmHg', 'inHg'],
  '流量': ['L/min', 'L/h', 'm³/h', 'm³/min', 'GPM', 'CFM'],
  '液位': ['mm', 'cm', 'm', 'inch', 'ft', '%'],
  '转速': ['rpm', 'rps', 'rad/s', 'deg/s'],
  '电压': ['V', 'mV', 'kV', 'μV'],
  '电流': ['A', 'mA', 'μA', 'kA'],
  '功率': ['W', 'kW', 'MW', 'hp', 'VA'],
  '频率': ['Hz', 'kHz', 'MHz', 'rpm'],
  '时间': ['s', 'ms', 'min', 'h'],
  '重量': ['g', 'kg', 't', 'lb', 'oz'],
  '百分比': ['%'],
  '无单位': ['无', 'none', '-']
}

/**
 * Modbus字节顺序选项
 */
const BYTE_ORDER_OPTIONS = [
  { value: 'ABCD', label: 'ABCD (标准)' },
  { value: 'BADC', label: 'BADC' },
  { value: 'CDAB', label: 'CDAB (常用)' },
  { value: 'DCBA', label: 'DCBA' },
]

/**
 * Modbus地址格式示例
 */
const MODBUS_ADDRESS_EXAMPLES = {
  '标准地址格式': [
    { example: '1', description: '线圈地址1' },
    { example: '100', description: '线圈地址100' },
    { example: '40001', description: '保持寄存器地址1' },
    { example: '40010', description: '保持寄存器地址10' },
    { example: '30001', description: '输入寄存器地址1' },
    { example: '10001', description: '输入线圈地址1' }
  ],
  '地址范围说明': [
    { example: '1-9999', description: '线圈地址 (ReadBool)' },
    { example: '10001-19999', description: '输入线圈 (ReadBool)' },
    { example: '30001-39999', description: '输入寄存器 (ReadInt16)' },
    { example: '40001-49999', description: '保持寄存器 (ReadInt16)' }
  ]
}

/**
 * Modbus地址配置组件
 */
export function ModbusAddressConfig({
  value,
  onChange,
  disabled = false,
  plcType = 'ModbusTCP'
}: ModbusAddressConfigProps) {
  const [addresses, setAddresses] = useState<ModbusAddressConfig[]>(value || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { toast } = useToast()

  // 新地址表单数据
  const [newAddress, setNewAddress] = useState<Partial<ModbusAddressConfig>>({
    name: '',
    address: '',
    type: 'int16',
    unit: 'none',
    description: '',
    stationId: 1,
    byteOrder: 'CDAB',
    wordSwap: false,
    scanRate: 1000,
    scaling: {
      enabled: false,
      inputMin: 0,
      inputMax: 100,
      outputMin: 0,
      outputMax: 10
    }
  })

  // 批量添加表单数据
  const [batchConfig, setBatchConfig] = useState({
    stationId: 1,
    startAddress: 1,
    count: 10,
    addressInterval: 1,
    namePrefix: '地址',
    type: 'int16' as const,
    unit: 'none'
  })

  // 同步外部值变化
  useEffect(() => {
    setAddresses(value || [])
  }, [value])

  // 通知外部值变化
  const handleChange = (newAddresses: ModbusAddressConfig[]) => {
    setAddresses(newAddresses)
    onChange(newAddresses)
  }

  /**
   * 简化的Modbus地址解析
   */
  const parseModbusAddress = (address: string) => {
    let stationId = 1
    let actualAddress = address

    // 提取站号
    if (address.includes('s=')) {
      const stationMatch = address.match(/s=(\d+);?/)
      if (stationMatch) {
        stationId = parseInt(stationMatch[1])
        actualAddress = address.replace(/s=\d+;?/, '')
      }
    }

    return {
      stationId,
      actualAddress
    }
  }

  /**
   * 生成Modbus地址字符串
   */
  const generateModbusAddress = (config: Partial<ModbusAddressConfig>) => {
    const { stationId = 1, actualAddress } = config
    let address = ''

    if (stationId !== 1) {
      address += `s=${stationId};`
    }

    address += actualAddress || '0'

    return address
  }

  /**
   * 添加新地址
   */
  const handleAdd = () => {
    if (!newAddress.name?.trim()) {
      toast({
        title: '验证失败',
        description: '请输入地址名称',
        variant: 'destructive',
      })
      return
    }

    const address: ModbusAddressConfig = {
      id: Date.now().toString(),
      name: newAddress.name.trim(),
      address: newAddress.address || '',
      type: newAddress.type || 'int16',
      unit: newAddress.unit === 'none' ? undefined : (newAddress.unit?.trim() || undefined),
      description: newAddress.description?.trim() || undefined,
      stationId: newAddress.stationId || 1,
      byteOrder: newAddress.byteOrder || 'CDAB',
      wordSwap: newAddress.wordSwap || false,
      scanRate: newAddress.scanRate || 1000,
      scaling: newAddress.scaling || {
        enabled: false,
        inputMin: 0,
        inputMax: 100,
        outputMin: 0,
        outputMax: 10
      }
    }

    const newAddresses = [...addresses, address]
    handleChange(newAddresses)
    resetNewAddressForm()
    setShowAddForm(false)

    toast({
      title: '添加成功',
      description: `地址 ${address.name} 已添加`,
    })
  }

  /**
   * 批量添加地址
   */
  const handleBatchAdd = () => {
    const newAddresses: ModbusAddressConfig[] = []

    for (let i = 0; i < batchConfig.count; i++) {
      const addressNum = batchConfig.startAddress + (i * batchConfig.addressInterval)

      const address: ModbusAddressConfig = {
        id: `batch_${Date.now()}_${i}`,
        name: `${batchConfig.namePrefix}${i + 1}`,
        address: batchConfig.stationId !== 1 ? `s=${batchConfig.stationId};${addressNum}` : addressNum.toString(),
        type: batchConfig.type,
        unit: batchConfig.unit === 'none' ? undefined : (batchConfig.unit?.trim() || undefined),
        stationId: batchConfig.stationId,
        byteOrder: 'CDAB',
        wordSwap: false,
        scanRate: 1000,
        scaling: {
          enabled: false,
          inputMin: 0,
          inputMax: 100,
          outputMin: 0,
          outputMax: 10
        }
      }
      newAddresses.push(address)
    }

    const allAddresses = [...addresses, ...newAddresses]
    handleChange(allAddresses)
    resetBatchForm()
    setShowBatchForm(false)

    toast({
      title: '批量添加成功',
      description: `已添加 ${batchConfig.count} 个地址`,
    })
  }

  /**
   * 删除地址
   */
  const handleDelete = (id: string) => {
    const newAddresses = addresses.filter(addr => addr.id !== id)
    handleChange(newAddresses)

    toast({
      title: '删除成功',
      description: '地址已删除',
    })
  }

  /**
   * 重置新地址表单
   */
  const resetNewAddressForm = () => {
    setNewAddress({
      name: '',
      address: '',
      type: 'int16',
      unit: 'none',
      description: '',
      stationId: 1,
      byteOrder: 'CDAB',
      wordSwap: false,
      scanRate: 1000,
      scaling: {
        enabled: false,
        inputMin: 0,
        inputMax: 100,
        outputMin: 0,
        outputMax: 10
      }
    })
  }

  /**
   * 重置批量表单
   */
  const resetBatchForm = () => {
    setBatchConfig({
      stationId: 1,
      startAddress: 1,
      count: 10,
      addressInterval: 1,
      namePrefix: '地址',
      type: 'int16',
      unit: 'none'
    })
  }

  return (
    <div className="space-y-4">
      {/* 地址格式说明 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Modbus地址配置
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4 mr-1" />
                高级选项
                {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowBatchForm(true)}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                批量添加
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddForm(true)}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                添加地址
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 地址格式示例 */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              支持的Modbus地址格式：
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(MODBUS_ADDRESS_EXAMPLES).map(([category, examples]) => (
                <div key={category}>
                  <h5 className="text-xs font-semibold text-blue-800 mb-2">{category}</h5>
                  <div className="space-y-1">
                    {examples.map((example, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="font-mono text-xs bg-white px-2 py-1 rounded border border-blue-200">
                          {example.example}
                        </div>
                        <div className="text-xs text-blue-700 flex-1">
                          {example.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 批量添加表单 */}
          {showBatchForm && (
            <Card className="mb-4 border-2 border-dashed border-gray-300">
              <CardHeader>
                <CardTitle className="text-base">批量添加地址</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>站号</Label>
                    <Input
                      type="number"
                      min="1"
                      max="247"
                      value={batchConfig.stationId}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, stationId: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                    <div className="space-y-2">
                    <Label>起始地址</Label>
                    <Input
                      type="number"
                      value={batchConfig.startAddress}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, startAddress: parseInt(e.target.value) || 40001 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>数量</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={batchConfig.count}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>地址间隔</Label>
                    <Input
                      type="number"
                      min="1"
                      value={batchConfig.addressInterval}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, addressInterval: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>名称前缀</Label>
                    <Input
                      value={batchConfig.namePrefix}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, namePrefix: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>数据类型</Label>
                    <Select
                      value={batchConfig.type}
                      onValueChange={(value: any) => setBatchConfig(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="int16">Int16</SelectItem>
                        <SelectItem value="uint16">UInt16</SelectItem>
                        <SelectItem value="int32">Int32</SelectItem>
                        <SelectItem value="float">Float</SelectItem>
                        <SelectItem value="bool">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>单位</Label>
                    <Select
                      value={batchConfig.unit || 'none'}
                      onValueChange={(value: string) => setBatchConfig(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择单位" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(UNIT_CATEGORIES).map(([category, units]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100">
                              {category}
                            </div>
                            {units.map(unit => (
                              <SelectItem key={unit} value={unit === '无' ? 'none' : unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetBatchForm()
                      setShowBatchForm(false)
                    }}
                  >
                    取消
                  </Button>
                  <Button type="button" onClick={handleBatchAdd}>
                    <Zap className="h-4 w-4 mr-1" />
                    批量添加
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 单个地址添加表单 */}
          {showAddForm && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">添加新地址</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>地址名称 *</Label>
                    <Input
                      value={newAddress.name || ''}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="例如：温度传感器"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>地址 *</Label>
                    <Input
                      value={newAddress.address || ''}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="例如：40001 或 s=1;x=3;100"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>站号</Label>
                    <Input
                      type="number"
                      min="1"
                      max="247"
                      value={newAddress.stationId || 1}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, stationId: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                    <div className="space-y-2">
                    <Label>数据类型</Label>
                    <Select
                      value={newAddress.type || 'int16'}
                      onValueChange={(value: any) => setNewAddress(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="int16">Int16</SelectItem>
                        <SelectItem value="uint16">UInt16</SelectItem>
                        <SelectItem value="int32">Int32</SelectItem>
                        <SelectItem value="float">Float</SelectItem>
                        <SelectItem value="bool">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>单位</Label>
                    <Select
                      value={newAddress.unit || 'none'}
                      onValueChange={(value: string) => setNewAddress(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择或输入单位" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(UNIT_CATEGORIES).map(([category, units]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100">
                              {category}
                            </div>
                            {units.map(unit => (
                              <SelectItem key={unit} value={unit === '无' ? 'none' : unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 高级选项 */}
                {showAdvanced && (
                  <div className="border-t pt-4 mb-4">
                    <h4 className="text-sm font-medium mb-3">高级选项</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>字节顺序</Label>
                        <Select
                          value={newAddress.byteOrder || 'CDAB'}
                          onValueChange={(value: any) => setNewAddress(prev => ({ ...prev, byteOrder: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BYTE_ORDER_OPTIONS.map(order => (
                              <SelectItem key={order.value} value={order.value}>
                                {order.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>字交换</Label>
                        <div className="flex items-center space-x-2 h-10">
                          <Switch
                            checked={newAddress.wordSwap || false}
                            onCheckedChange={(checked) => setNewAddress(prev => ({ ...prev, wordSwap: checked }))}
                          />
                          <span className="text-sm text-gray-500">
                            {newAddress.wordSwap ? '启用' : '禁用'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>扫描频率(ms)</Label>
                        <Input
                          type="number"
                          min="100"
                          value={newAddress.scanRate || 1000}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, scanRate: parseInt(e.target.value) || 1000 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>描述</Label>
                        <Input
                          value={newAddress.description || ''}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="地址描述"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetNewAddressForm()
                      setShowAddForm(false)
                    }}
                  >
                    取消
                  </Button>
                  <Button type="button" onClick={handleAdd}>
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 地址列表 */}
          {addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="mb-2">暂无采集地址</div>
              <div className="flex justify-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加单个地址
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBatchForm(true)}
                  disabled={disabled}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  批量添加
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>地址</TableHead>
                    <TableHead>站号</TableHead>
                    <TableHead>数据类型</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addresses.map((address) => (
                    <TableRow key={address.id}>
                      <TableCell className="font-medium">{address.name}</TableCell>
                      <TableCell className="font-mono text-sm">{address.address}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          站号{address.stationId || 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {address.type?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{address.unit || '-'}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={address.description}>
                          {address.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(address.id)}
                            disabled={disabled}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 统计信息 */}
          {addresses.length > 0 && (
            <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded">
              <div className="flex items-center justify-between">
                <span>共 {addresses.length} 个采集地址</span>
                <div className="flex items-center gap-4">
                  <span>站号数: {new Set(addresses.map(a => a.stationId || 1)).size}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}