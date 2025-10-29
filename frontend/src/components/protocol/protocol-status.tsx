'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Settings,
  Info
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface DeviceStatus {
  id: number
  name: string
  is_connected: boolean
  status: string
  last_error?: string
  protocol?: string
  protocol_type?: string
  host?: string
  port?: number
  station?: number
  plc_series?: string
  last_collect_time?: string
}

interface ProtocolStatusProps {
  devices: DeviceStatus[]
  onRefresh?: () => void
  loading?: boolean
}

const getProtocolIcon = (protocol?: string) => {
  switch (protocol?.toLowerCase()) {
    case 'modbus_tcp':
    case 'modbus_rtu':
    case 'modbus_rtu_over_tcp':
      return '🔌'
    case 'omron_fins':
      return '🏭'
    case 'siemens_s7':
      return '⚡'
    default:
      return '🔧'
  }
}

const getProtocolColor = (protocol?: string) => {
  switch (protocol?.toLowerCase()) {
    case 'modbus_tcp':
      return 'bg-blue-500'
    case 'modbus_rtu':
      return 'bg-green-500'
    case 'modbus_rtu_over_tcp':
      return 'bg-teal-500'
    case 'omron_fins':
      return 'bg-orange-500'
    case 'siemens_s7':
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}

const getStatusIcon = (status: string, isConnected: boolean) => {
  if (isConnected) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />
  } else {
    return <XCircle className="h-4 w-4 text-red-500" />
  }
}

const getStatusBadge = (status: string, isConnected: boolean) => {
  if (isConnected) {
    return <Badge variant="default" className="bg-green-100 text-green-800">在线</Badge>
  } else {
    return <Badge variant="destructive">离线</Badge>
  }
}

export function ProtocolStatus({ devices, onRefresh, loading }: ProtocolStatusProps) {
  const onlineCount = devices.filter(d => d.is_connected).length
  const totalCount = devices.length

  // 按协议分组统计
  const protocolStats = devices.reduce((acc, device) => {
    const protocol = device.protocol_type || 'unknown'
    if (!acc[protocol]) {
      acc[protocol] = { total: 0, online: 0, devices: [] }
    }
    acc[protocol].total += 1
    if (device.is_connected) {
      acc[protocol].online += 1
    }
    acc[protocol].devices.push(device)
    return acc
  }, {} as Record<string, { total: number; online: number; devices: DeviceStatus[] }>)

  return (
    <div className="space-y-6">
      {/* 总体状态 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">设备连接状态</CardTitle>
            <CardDescription>
              当前共有 {totalCount} 个设备，{onlineCount} 个在线
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600 font-medium">
              {onlineCount} 设备在线
            </span>
            <WifiOff className="h-5 w-5 text-red-500 ml-4" />
            <span className="text-sm text-red-600 font-medium">
              {totalCount - onlineCount} 设备离线
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 按协议分组显示 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(protocolStats).map(([protocol, stats]) => (
          <Card key={protocol}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  <span className="text-lg">{getProtocolIcon(protocol)}</span>
                  <span>{protocol.replace('_', ' ').toUpperCase()}</span>
                </CardTitle>
                <Badge variant="outline">
                  {stats.online}/{stats.total}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(device.status, device.is_connected)}
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {device.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusBadge(device.status, device.is_connected)}

                      {/* 设备详情提示 */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Info className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-1">
                              <p><strong>协议:</strong> {protocol}</p>
                              {device.host && <p><strong>地址:</strong> {device.host}:{device.port}</p>}
                              {device.station && <p><strong>站号:</strong> {device.station}</p>}
                              {device.plc_series && <p><strong>系列:</strong> {device.plc_series}</p>}
                              {device.last_error && (
                                <p className="text-red-600"><strong>错误:</strong> {device.last_error}</p>
                              )}
                              {device.last_collect_time && (
                                <p><strong>最后采集:</strong> {new Date(device.last_collect_time).toLocaleString()}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>

              {/* 协议连接率 */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>连接率</span>
                  <span>{Math.round((stats.online / stats.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(stats.online / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 离线设备详情 */}
      {totalCount - onlineCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>离线设备详情</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {devices
                .filter(d => !d.is_connected)
                .map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-gray-600">
                          {device.protocol_type?.replace('_', ' ').toUpperCase()}
                          {device.host && ` - ${device.host}:${device.port}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {device.last_error && (
                        <p className="text-sm text-red-600 max-w-[200px] truncate">
                          {device.last_error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 协议库状态组件
export function ProtocolLibraryStatus({
  protocolInfo
}: {
  protocolInfo: {
    modbus_available: boolean
    omron_available: boolean
    siemens_available: boolean
    supported_protocols: string[]
    total_protocols: number
  }
}) {
  const libraries = [
    { name: 'Modbus', available: protocolInfo.modbus_available, icon: '🔌' },
    { name: '欧姆龙FINS', available: protocolInfo.omron_available, icon: '🏭' },
    { name: '西门子S7', available: protocolInfo.siemens_available, icon: '⚡' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>协议库状态</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {libraries.map((lib) => (
            <div key={lib.name} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{lib.icon}</span>
                <span className="font-medium">{lib.name}</span>
              </div>
              {lib.available ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  可用
                </Badge>
              ) : (
                <Badge variant="destructive">
                  不可用
                </Badge>
              )}
            </div>
          ))}

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span>支持协议总数</span>
              <Badge variant="outline">{protocolInfo.total_protocols}</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {protocolInfo.supported_protocols.map((protocol) => (
                <Badge key={protocol} variant="secondary" className="text-xs">
                  {protocol.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}