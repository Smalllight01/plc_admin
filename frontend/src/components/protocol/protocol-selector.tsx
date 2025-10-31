'use client'

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface ProtocolConfig {
  type: string
  name: string
  description: string
  defaultPort: number
  fields: ProtocolField[]
}

export interface ProtocolField {
  name: string
  label: string
  type: 'text' | 'number' | 'select'
  defaultValue?: string | number
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
}

// 协议配置
export const PROTOCOL_CONFIGS: Record<string, ProtocolConfig> = {
  modbus_tcp: {
    type: 'modbus_tcp',
    name: 'ModbusTCP',
    description: '基于TCP/IP的Modbus协议 - 一个IP对应一个站号，支持多个地址',
    defaultPort: 502,
    fields: [
      {
        name: 'station',
        label: '站号',
        type: 'number',
        defaultValue: 1,
        required: true,
        placeholder: '1-247'
      },
      {
        name: 'data_format',
        label: '数据格式',
        type: 'select',
        defaultValue: 'CDAB',
        options: [
          { value: 'ABCD', label: 'ABCD' },
          { value: 'BADC', label: 'BADC' },
          { value: 'CDAB', label: 'CDAB (推荐)' },
          { value: 'DCBA', label: 'DCBA' }
        ],
        required: true
      }
    ]
  },
  modbus_rtu_over_tcp: {
    type: 'modbus_rtu_over_tcp',
    name: 'ModbusRTUOverTCP',
    description: '串口转网口的Modbus协议 - 一个IP对应多个站号，每个站号支持多个地址',
    defaultPort: 502,
    fields: [
      {
        name: 'station',
        label: '站号',
        type: 'number',
        defaultValue: 1,
        required: true,
        placeholder: '1-247'
      }
    ]
  },
  omron_fins: {
    type: 'omron_fins',
    name: '欧姆龙FINS',
    description: '欧姆龙PLC的FINS协议',
    defaultPort: 9600,
    fields: [
      {
        name: 'plc_series',
        label: 'PLC系列',
        type: 'select',
        defaultValue: 'CS_CJ',
        options: [
          { value: 'CS_CJ', label: 'CS/CJ系列' },
          { value: 'CV', label: 'CV系列' },
          { value: 'C_H', label: 'C/H系列' },
          { value: 'CJ', label: 'CJ系列' },
          { value: 'CP', label: 'CP系列' },
          { value: 'NJ', label: 'NJ系列' },
          { value: 'NX', label: 'NX系列' },
          { value: 'NY', label: 'NY系列' },
          { value: 'SYSMAC', label: 'Sysmac系列' }
        ],
        required: true
      },
      {
        name: 'da2',
        label: '目标网络节点号',
        type: 'number',
        defaultValue: 0,
        placeholder: '0-254'
      },
      {
        name: 'sa1',
        label: '源网络节点号',
        type: 'number',
        defaultValue: 0,
        placeholder: '0-254'
      }
    ]
  },
  siemens_s7: {
    type: 'siemens_s7',
    name: '西门子S7',
    description: '西门子S7系列PLC协议',
    defaultPort: 102,
    fields: [
      {
        name: 'plc_series',
        label: 'PLC系列',
        type: 'select',
        defaultValue: 'S1200',
        options: [
          { value: 'S200', label: 'S7-200' },
          { value: 'S200_SMART', label: 'S7-200 SMART' },
          { value: 'S300', label: 'S7-300' },
          { value: 'S400', label: 'S7-400' },
          { value: 'S1200', label: 'S7-1200 (推荐)' },
          { value: 'S1500', label: 'S7-1500' },
          { value: 'S2000', label: 'S7-2000' }
        ],
        required: true
      },
      {
        name: 'rack',
        label: '机架号',
        type: 'number',
        defaultValue: 0,
        placeholder: '0-15'
      },
      {
        name: 'slot',
        label: '插槽号',
        type: 'number',
        defaultValue: 1,
        placeholder: '0-30'
      }
    ]
  }
}

interface ProtocolSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  configValues?: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
  disabled?: boolean
}

export function ProtocolSelector({
  value,
  onValueChange,
  configValues = {},
  onConfigChange,
  disabled = false
}: ProtocolSelectorProps) {
  const selectedConfig = value ? PROTOCOL_CONFIGS[value] : null

  const handleConfigFieldChange = (fieldName: string, fieldValue: any) => {
    const newConfig = { ...configValues, [fieldName]: fieldValue }
    onConfigChange(newConfig)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="protocol-type">协议类型</Label>
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="选择协议类型" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROTOCOL_CONFIGS).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center space-x-2">
                  <span>{config.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {config.defaultPort > 0 ? `Port ${config.defaultPort}` : 'Serial'}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedConfig.name}</CardTitle>
            <CardDescription>{selectedConfig.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedConfig.fields.map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {field.type === 'select' ? (
                    <Select
                      value={configValues[field.name]?.toString() || field.defaultValue?.toString() || ''}
                      onValueChange={(value) => {
                        const numValue = field.options?.find(opt => opt.value === value)?.value
                        handleConfigFieldChange(field.name, isNaN(Number(numValue)) ? numValue : Number(numValue))
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={configValues[field.name]?.toString() || field.defaultValue?.toString() || ''}
                      onChange={(e) => {
                        const value = field.type === 'number'
                          ? parseInt(e.target.value) || 0
                          : e.target.value
                        handleConfigFieldChange(field.name, value)
                      }}
                      placeholder={field.placeholder}
                      disabled={disabled}
                      min={field.type === 'number' ? 0 : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 地址格式帮助组件
export function AddressFormatHelp({ protocolType }: { protocolType?: string }) {
  if (!protocolType) return null

  const getAddressHelp = () => {
    switch (protocolType) {
      case 'modbus_tcp':
        return {
          title: 'ModbusTCP地址格式 - 一个IP对应一个站号',
          formats: [
            { format: '100', description: '保持寄存器地址100' },
            { format: '40001', description: '保持寄存器地址1' },
            { format: 'x=1;200', description: '读取线圈地址200' },
            { format: 'x=2;300', description: '读取输入线圈地址300' },
            { format: 'x=3;400', description: '读取保持寄存器地址400' },
            { format: 'x=4;500', description: '读取输入寄存器地址500' }
          ]
        }
      case 'modbus_rtu_over_tcp':
        return {
          title: 'ModbusRTUOverTCP地址格式 - 一个IP对应多个站号',
          formats: [
            { format: 's=1;100', description: '站号1的保持寄存器地址100' },
            { format: 's=2;101', description: '站号2的保持寄存器地址101' },
            { format: 's=1;x=3;400', description: '站号1，保持寄存器地址400' },
            { format: 's=2;x=4;500', description: '站号2，输入寄存器地址500' },
            { format: 's=3;x=1;200', description: '站号3，线圈地址200' },
            { format: 's=4;x=2;300', description: '站号4，输入线圈地址300' }
          ]
        }
      case 'omron_fins':
        return {
          title: '欧姆龙地址格式',
          formats: [
            { format: 'D100', description: '数据寄存器D100' },
            { format: 'CIO100', description: 'CIO区100' },
            { format: 'W100', description: '工作区W100' },
            { format: 'H100', description: '保持区H100' },
            { format: 'A100', description: '辅助区A100' },
            { format: 'T100', description: '定时器T100' },
            { format: 'C100', description: '计数器C100' }
          ]
        }
      case 'siemens_s7':
        return {
          title: '西门子S7地址格式',
          formats: [
            { format: 'M100.0', description: '位地址M100.0' },
            { format: 'MW100', description: '字地址MW100' },
            { format: 'MD100', description: '双字地址MD100' },
            { format: 'DB1.DBW0', description: '数据块字地址' },
            { format: 'DB1.DBD0', description: '数据块双字地址' },
            { format: 'DB1.DBX0.0', description: '数据块位地址' },
            { format: 'I0.0', description: '输入位' },
            { format: 'Q0.0', description: '输出位' }
          ]
        }
      default:
        return null
    }
  }

  const help = getAddressHelp()
  if (!help) return null

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">{help.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {help.formats.map((item, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm">
              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                {item.format}
              </code>
              <span className="text-gray-600">{item.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}