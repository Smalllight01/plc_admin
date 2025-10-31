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
} from 'lucide-react'

/**
 * 地址配置项接口
 */
export interface AddressConfig {
  id: string
  name: string
  address: string
  type?: string
  unit?: string
  description?: string
  stationId?: number        // Modbus站号（仅用于ModbusRTUOverTCP）
}

/**
 * 地址配置组件属性
 */
interface AddressConfigProps {
  value: AddressConfig[]
  onChange: (addresses: AddressConfig[]) => void
  disabled?: boolean
  plcType?: string
}

/**
 * 数据类型选项
 */
const DATA_TYPES = [
  { value: 'bool', label: 'Boolean (布尔值)' },
  { value: 'int16', label: 'Int16 (16位整数)' },
  { value: 'uint16', label: 'UInt16 (16位无符号整数)' },
  { value: 'int32', label: 'Int32 (32位整数)' },
  { value: 'uint32', label: 'UInt32 (32位无符号整数)' },
  { value: 'float', label: 'Float (32位浮点数)' },
  { value: 'string', label: 'String (字符串)' },
]

/**
 * 常用单位选项
 */
const COMMON_UNITS = [
  '°C', '°F', 'K', // 温度
  'Pa', 'kPa', 'MPa', 'bar', 'psi', // 压力
  'V', 'mV', 'A', 'mA', 'W', 'kW', 'MW', // 电气
  'Hz', 'rpm', 'rad/s', // 频率/转速
  'm', 'cm', 'mm', 'km', // 长度
  'kg', 'g', 't', // 重量
  'L', 'mL', 'm³', // 体积
  '%', 'ppm', 'ppb', // 百分比/浓度
  's', 'min', 'h', // 时间
]

/**
 * 根据PLC类型获取地址示例
 */
const getAddressExamples = (plcType: string) => {
  switch (plcType) {
    case 'ModbusTCP':
    case 'ModbusRTU':
      return {
        coil: '0x0001 (线圈)',
        discrete: '1x0001 (离散输入)',
        input: '3x0001 (输入寄存器)',
        holding: '4x0001 (保持寄存器)',
      }
    case 'SiemensS7':
      return {
        db: 'DB1.DBW0 (数据块)',
        input: 'IW0 (输入字)',
        output: 'QW0 (输出字)',
        memory: 'MW0 (内存字)',
      }
    case 'OmronFins':
      return {
        dm: 'D100 (数据内存)',
        cio: 'CIO100 (CIO区)',
        work: 'W100 (工作区)',
        holding: 'H100 (保持区)',
      }
    case 'MitsubishiMC':
      return {
        d: 'D100 (数据寄存器)',
        x: 'X0 (输入)',
        y: 'Y0 (输出)',
        m: 'M100 (内部继电器)',
      }
    default:
      return {
        example1: '40001',
        example2: '40002',
        example3: '40003',
        example4: '40004',
      }
  }
}

/**
 * 地址配置组件
 * 提供友好的界面来配置PLC采集地址
 */
export function AddressConfig({ value, onChange, disabled = false, plcType = 'ModbusTCP' }: AddressConfigProps) {
  const [addresses, setAddresses] = useState<AddressConfig[]>(value || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newAddress, setNewAddress] = useState<Partial<AddressConfig>>({
    name: '',
    address: '',
    type: 'float',
    unit: '',
    description: '',
    stationId: 1,
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const { toast } = useToast()

  // 同步外部值变化
  useEffect(() => {
    setAddresses(value || [])
  }, [value])

  // 通知外部值变化
  const handleChange = (newAddresses: AddressConfig[]) => {
    setAddresses(newAddresses)
    onChange(newAddresses)
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

    if (!newAddress.address?.trim()) {
      toast({
        title: '验证失败',
        description: '请输入地址',
        variant: 'destructive',
      })
      return
    }

    // 检查地址是否重复
    if (addresses.some(addr => addr.address === newAddress.address)) {
      toast({
        title: '验证失败',
        description: '地址已存在',
        variant: 'destructive',
      })
      return
    }

    const address: AddressConfig = {
      id: Date.now().toString(),
      name: newAddress.name.trim(),
      address: newAddress.address.trim(),
      type: newAddress.type || 'float',
      unit: newAddress.unit?.trim() === 'none' ? undefined : (newAddress.unit?.trim() || undefined),
      description: newAddress.description?.trim() || undefined,
      stationId: newAddress.stationId || 1,
    }

    const newAddresses = [...addresses, address]
    // 只更新本地状态，不立即通知外部
    setAddresses(newAddresses)
    // 延迟通知外部，避免立即触发表单提交
    setTimeout(() => {
      onChange(newAddresses)
    }, 0)

    // 重置表单
    setNewAddress({
      name: '',
      address: '',
      type: 'float',
      unit: '',
      description: '',
      stationId: 1,
    })
    setShowAddForm(false)

    toast({
      title: '添加成功',
      description: `地址 ${address.name} 已添加`,
    })
  }

  /**
   * 删除地址
   */
  const handleDelete = (id: string) => {
    const newAddresses = addresses.filter(addr => addr.id !== id)
    // 只更新本地状态，不立即通知外部
    setAddresses(newAddresses)
    // 延迟通知外部，避免立即触发表单提交
    setTimeout(() => {
      onChange(newAddresses)
    }, 0)
    
    toast({
      title: '删除成功',
      description: '地址已删除',
    })
  }

  /**
   * 开始编辑
   */
  const handleEdit = (address: AddressConfig) => {
    setEditingId(address.id)
  }

  /**
   * 保存编辑
   */
  const handleSave = (id: string, updatedAddress: Partial<AddressConfig>) => {
    if (!updatedAddress.name?.trim() || !updatedAddress.address?.trim()) {
      toast({
        title: '验证失败',
        description: '名称和地址不能为空',
        variant: 'destructive',
      })
      return
    }

    // 检查地址是否与其他地址重复
    if (addresses.some(addr => addr.id !== id && addr.address === updatedAddress.address)) {
      toast({
        title: '验证失败',
        description: '地址已存在',
        variant: 'destructive',
      })
      return
    }

    const processedAddress = {
      ...updatedAddress,
      unit: updatedAddress.unit === 'none' ? undefined : updatedAddress.unit
    }
    
    const newAddresses = addresses.map(addr => 
      addr.id === id ? { ...addr, ...processedAddress } : addr
    )
    // 只更新本地状态，不立即通知外部
    setAddresses(newAddresses)
    // 延迟通知外部，避免立即触发表单提交
    setTimeout(() => {
      onChange(newAddresses)
    }, 0)
    setEditingId(null)

    toast({
      title: '更新成功',
      description: '地址已更新',
    })
  }

  /**
   * 取消编辑
   */
  const handleCancel = () => {
    setEditingId(null)
  }

  /**
   * 复制地址
   */
  const handleCopy = (address: AddressConfig) => {
    const newAddress: AddressConfig = {
      ...address,
      id: Date.now().toString(),
      name: `${address.name} (副本)`,
    }
    const newAddresses = [...addresses, newAddress]
    // 只更新本地状态，不立即通知外部
    setAddresses(newAddresses)
    // 延迟通知外部，避免立即触发表单提交
    setTimeout(() => {
      onChange(newAddresses)
    }, 0)

    toast({
      title: '复制成功',
      description: `地址 ${newAddress.name} 已复制`,
    })
  }

  /**
   * 批量导入地址
   */
  const handleImport = () => {
    // 创建文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (Array.isArray(data)) {
            const importedAddresses: AddressConfig[] = data.map((item, index) => ({
              id: `imported_${Date.now()}_${index}`,
              name: item.name || `导入地址${index + 1}`,
              address: item.address || '',
              type: item.type || 'int16',
              unit: item.unit === 'none' ? undefined : (item.unit || undefined),
              description: item.description || undefined,
            }))
            
            const newAddresses = [...addresses, ...importedAddresses]
            // 只更新本地状态，不立即通知外部
            setAddresses(newAddresses)
            // 延迟通知外部，避免立即触发表单提交
            setTimeout(() => {
              onChange(newAddresses)
            }, 0)
            
            toast({
              title: '导入成功',
              description: `已导入 ${importedAddresses.length} 个地址`,
            })
          } else {
            throw new Error('文件格式不正确')
          }
        } catch (error) {
          toast({
            title: '导入失败',
            description: '文件格式不正确，请检查JSON格式',
            variant: 'destructive',
          })
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  /**
   * 导出地址配置
   */
  const handleExport = () => {
    const data = JSON.stringify(addresses, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `addresses_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: '导出成功',
      description: '地址配置已导出',
    })
  }

  const addressExamples = getAddressExamples(plcType)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">采集地址配置</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImport}
              disabled={disabled}
            >
              <Upload className="h-4 w-4 mr-1" />
              导入
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={addresses.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              导出
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
        {/* 地址示例提示 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {plcType} 地址格式示例：
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
            {Object.entries(addressExamples).map(([key, value]) => (
              <div key={key} className="font-mono">{value}</div>
            ))}
          </div>
        </div>

        {/* 添加地址表单 */}
        {showAddForm && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">添加新地址</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>地址名称 *</Label>
                  <Input
                    value={newAddress.name || ''}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：温度传感器"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>地址 *</Label>
                  <Input
                    value={newAddress.address || ''}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="例如：D100"
                    className="font-mono"
                  />
                </div>
                {plcType === 'modbus_rtu_over_tcp' && (
                  <div className="grid gap-2">
                    <Label>站号</Label>
                    <Input
                      type="number"
                      min="1"
                      max="247"
                      value={newAddress.stationId || 1}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, stationId: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>数据类型</Label>
                  <Select
                    value={newAddress.type || 'float'}
                    onValueChange={(value) => setNewAddress(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>单位</Label>
                  <Select
                    value={newAddress.unit || ''}
                    onValueChange={(value) => setNewAddress(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择或输入单位" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无单位</SelectItem>
                      {COMMON_UNITS.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label>描述</Label>
                  <Input
                    value={newAddress.description || ''}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="地址描述信息（可选）"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewAddress({
                      name: '',
                      address: '',
                      type: 'float',
                      unit: '',
                      description: '',
                      stationId: 1,
                    })
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
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">暂无采集地址</div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加第一个地址
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>地址</TableHead>
                {plcType === 'modbus_rtu_over_tcp' && <TableHead>站号</TableHead>}
                <TableHead>类型</TableHead>
                <TableHead>单位</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addresses.map((address) => (
                <AddressRow
                  key={address.id}
                  address={address}
                  isEditing={editingId === address.id}
                  onEdit={() => handleEdit(address)}
                  onSave={(updatedAddress) => handleSave(address.id, updatedAddress)}
                  onCancel={handleCancel}
                  onDelete={() => handleDelete(address.id)}
                  onCopy={() => handleCopy(address)}
                  disabled={disabled}
                  plcType={plcType}
                />
              ))}
            </TableBody>
          </Table>
        )}

        {/* 统计信息 */}
        {addresses.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            共 {addresses.length} 个采集地址
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 地址行组件属性
 */
interface AddressRowProps {
  address: AddressConfig
  isEditing: boolean
  onEdit: () => void
  onSave: (address: Partial<AddressConfig>) => void
  onCancel: () => void
  onDelete: () => void
  onCopy: () => void
  disabled: boolean
  plcType?: string
}

/**
 * 地址行组件
 */
function AddressRow({
  address,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onCopy,
  disabled,
  plcType,
}: AddressRowProps) {
  const [editData, setEditData] = useState<Partial<AddressConfig>>(address)

  useEffect(() => {
    if (isEditing) {
      setEditData({
        ...address,
        unit: address.unit || 'none'
      })
    }
  }, [isEditing, address])

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Input
            value={editData.name || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <Input
            value={editData.address || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
            className="h-8 font-mono"
          />
        </TableCell>
        {plcType === 'modbus_rtu_over_tcp' && (
          <TableCell>
            <Input
              type="number"
              min="1"
              max="247"
              value={editData.stationId || 1}
              onChange={(e) => setEditData(prev => ({ ...prev, stationId: parseInt(e.target.value) || 1 }))}
              className="h-8"
            />
          </TableCell>
        )}
        <TableCell>
          <Select
            value={editData.type || 'float'}
            onValueChange={(value) => setEditData(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={DATA_TYPES.find(t => t.value === (editData.type || 'float'))?.label || '选择数据类型'} />
            </SelectTrigger>
            <SelectContent>
              {DATA_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select
            value={editData.unit || 'none'}
            onValueChange={(value) => setEditData(prev => ({ ...prev, unit: value }))}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={editData.unit === 'none' ? '无单位' : (editData.unit || '选择单位')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无单位</SelectItem>
              {COMMON_UNITS.map(unit => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Input
            value={editData.description || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            className="h-8"
            placeholder="描述"
          />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onSave(editData)}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{address.name}</TableCell>
      <TableCell className="font-mono">{address.address}</TableCell>
      {plcType === 'modbus_rtu_over_tcp' && (
        <TableCell>
          <Badge variant="outline">
            站号{address.stationId || 1}
          </Badge>
        </TableCell>
      )}
      <TableCell>
        <Badge variant="outline">
          {DATA_TYPES.find(t => t.value === address.type)?.label.split(' ')[0] || address.type}
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
            onClick={onEdit}
            disabled={disabled}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCopy}
            disabled={disabled}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={onDelete}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}