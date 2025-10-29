'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AddressConfig, type AddressConfig as AddressConfigType } from '@/components/device/address-config'
import { ProtocolSelector, AddressFormatHelp } from '@/components/protocol/protocol-selector'
import { Device, Group, CreateDeviceRequest, UpdateDeviceRequest } from '@/lib/api'

interface DeviceFormProps {
  device?: Device
  groups: Group[]
  onSubmit: (data: CreateDeviceRequest | UpdateDeviceRequest) => void
  onCancel: () => void
  loading?: boolean
}

export function DeviceForm({ device, groups, onSubmit, onCancel, loading }: DeviceFormProps) {
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

  const [protocolConfig, setProtocolConfig] = useState<Record<string, any>>({})

  // 初始化表单数据
  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name || '',
        plc_type: device.plc_type || 'modbus_tcp',
        protocol: device.protocol || 'tcp',
        ip_address: device.ip_address || '',
        port: device.port || 502,
        addresses: device.addresses || [],
        group_id: device.group_id || 1,
        is_active: device.is_active ?? true,
        description: device.description || '',
      })
    }
  }, [device])

  // 协议类型变化时的处理
  const handleProtocolChange = (protocolType: string) => {
    const protocolTypeToProtocol: Record<string, string> = {
      'modbus_tcp': 'tcp',
      'modbus_rtu': 'rtu',
      'modbus_rtu_over_tcp': 'tcp',
      'omron_fins': 'tcp',
      'siemens_s7': 'tcp'
    }

    const newProtocol = protocolTypeToProtocol[protocolType] || 'tcp'

    setFormData(prev => ({
      ...prev,
      plc_type: protocolType,
      protocol: newProtocol,
      // 根据协议类型设置默认端口
      port: getDefaultPort(protocolType)
    }))

    // 重置协议配置
    setProtocolConfig({})
  }

  // 获取协议默认端口
  const getDefaultPort = (protocolType: string): number => {
    const defaultPorts: Record<string, number> = {
      'modbus_tcp': 502,
      'modbus_rtu_over_tcp': 502,
      'omron_fins': 9600,
      'siemens_s7': 102,
      'modbus_rtu': 0 // 串口协议不需要端口
    }
    return defaultPorts[protocolType] || 502
  }

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 验证必填字段
    if (!formData.name.trim()) {
      return
    }

    // 根据协议类型验证必要字段
    if (formData.protocol === 'tcp' && !formData.ip_address.trim()) {
      return
    }

    // 构建提交数据
    const submitData = {
      ...formData,
      // 将协议配置添加到提交数据中
      ...protocolConfig
    }

    onSubmit(submitData)
  }

  // 更新地址配置
  const handleAddressesChange = (addresses: AddressConfigType[]) => {
    setFormData(prev => ({
      ...prev,
      addresses
    }))
  }

  const isRTUProtocol = formData.plc_type === 'modbus_rtu'
  const isEditMode = !!device

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '编辑设备' : '添加设备'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? '修改设备配置信息' : '配置新的工业设备连接'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* 基本信息 */}
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">基本信息</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">设备名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入设备名称"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="group">设备分组</Label>
                <select
                  id="group"
                  value={formData.group_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, group_id: parseInt(e.target.value) }))}
                  className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md"
                  disabled={loading}
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">设备描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入设备描述信息"
                rows={2}
                disabled={loading}
              />
            </div>
          </div>

          {/* 协议配置 */}
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">协议配置</h3>

            <ProtocolSelector
              value={formData.plc_type}
              onValueChange={handleProtocolChange}
              configValues={protocolConfig}
              onConfigChange={setProtocolConfig}
              disabled={loading}
            />

            {/* TCP/网络配置 */}
            {formData.protocol === 'tcp' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ip_address">IP地址 *</Label>
                  <Input
                    id="ip_address"
                    value={formData.ip_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
                    placeholder="192.168.1.100"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="port">端口</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 0 }))}
                    placeholder="502"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* 地址格式帮助 */}
            <AddressFormatHelp protocolType={formData.plc_type} />
          </div>

          {/* 地址配置 */}
          <div className="grid gap-4">
            <h3 className="text-lg font-medium">采集地址</h3>
            <AddressConfig
              addresses={formData.addresses}
              onChange={handleAddressesChange}
              disabled={loading}
            />
          </div>

          {/* 其他选项 */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              disabled={loading}
            />
            <Label htmlFor="is_active">启用设备</Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? '保存中...' : (isEditMode ? '更新' : '添加')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </form>
  )
}