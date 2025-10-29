'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MainLayout } from '@/components/layout/main-layout'
import { AuthGuard } from '@/components/auth/auth-guard'
import { ProtocolStatus, ProtocolLibraryStatus } from '@/components/protocol/protocol-status'
import { apiService } from '@/services/api'
import {
  RefreshCw,
  Activity,
  Database,
  Wifi,
  WifiOff,
  AlertTriangle,
  Settings,
  Info
} from 'lucide-react'

export default function DeviceStatusPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  // 获取设备状态
  const {
    data: deviceStatus,
    isLoading: devicesLoading,
    refetch: refetchDevices
  } = useQuery({
    queryKey: ['device-status', refreshKey],
    queryFn: () => apiService.getAllDeviceStatus(),
    refetchInterval: 30000, // 每30秒自动刷新
  })

  // 获取协议库信息
  const {
    data: protocolInfo,
    isLoading: protocolLoading,
    refetch: refetchProtocolInfo
  } = useQuery({
    queryKey: ['protocol-info'],
    queryFn: () => apiService.getProtocolInfo(),
    refetchInterval: 60000, // 每分钟刷新
  })

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    refetchDevices()
    refetchProtocolInfo()
  }

  // 转换设备状态数据格式
  const devices = deviceStatus ? Object.entries(deviceStatus).map(([id, status]) => ({
    id: parseInt(id),
    name: status.device_name,
    is_connected: status.is_connected,
    status: status.status,
    last_error: status.last_error,
    protocol_type: status.protocol_type,
    protocol: status.protocol,
    host: status.host,
    port: status.port,
    station: status.station,
    plc_series: status.plc_series,
    last_collect_time: status.last_collect_time
  })) : []

  const allLoading = devicesLoading || protocolLoading

  return (
    <AuthGuard>
      <MainLayout>
        <div className="container mx-auto p-6 space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">设备状态监控</h1>
              <p className="text-muted-foreground">
                实时监控所有设备的连接状态和协议信息
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={allLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${allLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          <Tabs defaultValue="devices" className="space-y-4">
            <TabsList>
              <TabsTrigger value="devices">设备状态</TabsTrigger>
              <TabsTrigger value="protocols">协议信息</TabsTrigger>
            </TabsList>

            <TabsContent value="devices" className="space-y-4">
              <ProtocolStatus
                devices={devices}
                onRefresh={refetchDevices}
                loading={devicesLoading}
              />
            </TabsContent>

            <TabsContent value="protocols" className="space-y-4">
              {protocolInfo && (
                <div className="grid gap-6">
                  <ProtocolLibraryStatus protocolInfo={protocolInfo} />

                  {/* 系统信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>系统信息</span>
                      </CardTitle>
                      <CardDescription>
                        采集系统和协议库的运行状态
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center space-x-3">
                          <Database className="h-8 w-8 text-blue-500" />
                          <div>
                            <p className="font-medium">数据库状态</p>
                            <p className="text-sm text-muted-foreground">正常运行</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Activity className="h-8 w-8 text-green-500" />
                          <div>
                            <p className="font-medium">采集服务</p>
                            <p className="text-sm text-muted-foreground">
                              {devices.length > 0 ? '运行中' : '无设备'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Wifi className="h-8 w-8 text-green-500" />
                          <div>
                            <p className="font-medium">网络连接</p>
                            <p className="text-sm text-muted-foreground">
                              {devices.filter(d => d.is_connected).length}/{devices.length} 设备在线
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Settings className="h-8 w-8 text-purple-500" />
                          <div>
                            <p className="font-medium">协议架构</p>
                            <p className="text-sm text-muted-foreground">统一协议接口</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 协议支持详情 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>支持的协议</CardTitle>
                      <CardDescription>
                        系统支持的工业通信协议列表
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Modbus协议 */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Modbus协议</span>
                            {protocolInfo.modbus_available ? (
                              <Badge className="bg-green-100 text-green-800">可用</Badge>
                            ) : (
                              <Badge variant="destructive">不可用</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>• ModbusTCP</p>
                            <p>• ModbusRTU</p>
                            <p>• ModbusRtuOverTCP</p>
                          </div>
                        </div>

                        {/* 欧姆龙协议 */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">欧姆龙FINS</span>
                            {protocolInfo.omron_available ? (
                              <Badge className="bg-green-100 text-green-800">可用</Badge>
                            ) : (
                              <Badge variant="destructive">不可用</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>• CS/CJ系列</p>
                            <p>• CP/NJ/NX系列</p>
                            <p>• Sysmac系列</p>
                          </div>
                        </div>

                        {/* 西门子协议 */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">西门子S7</span>
                            {protocolInfo.siemens_available ? (
                              <Badge className="bg-green-100 text-green-800">可用</Badge>
                            ) : (
                              <Badge variant="destructive">不可用</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>• S7-200/300/400</p>
                            <p>• S7-1200/1500</p>
                            <p>• S7-2000</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}