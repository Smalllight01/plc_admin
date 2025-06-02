'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Download, RefreshCw, X, ChevronLeft, ChevronRight, Calendar, Filter, CheckSquare, Square, BarChart3, Monitor, MapPin, Clock, Sliders, TrendingUp } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
import { apiService } from '@/services/api'
import { Device, Group, HistoryData } from '@/lib/api'

/**
 * 历史数据查询参数接口
 */
interface HistoryQueryParams {
  device_id?: number
  group_id?: number
  address?: string
  start_time?: string
  end_time?: string
  limit?: number
}

/**
 * 图表数据点接口
 */
interface ChartDataPoint {
  time: string
  [key: string]: string | number
}

/**
 * 设备地址接口
 */
interface DeviceAddress {
  id?: string
  name?: string
  address: string
  type?: string
  unit?: string
  description?: string
}

/**
 * 地址映射接口
 */
interface AddressMapping {
  [key: string]: string
}

/**
 * 历史数据页面组件
 */
export default function HistoryPage() {
  // 基础状态
  const [groups, setGroups] = useState<Group[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [historyData, setHistoryData] = useState<HistoryData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // 筛选条件状态
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [deviceAddresses, setDeviceAddresses] = useState<DeviceAddress[]>([])
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([])
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  
  // 图表数据状态
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [dataKeys, setDataKeys] = useState<string[]>([])
  const [addressMapping, setAddressMapping] = useState<AddressMapping>({})
  
  // 滑动窗口状态
  const [windowSize, setWindowSize] = useState(1000) // 固定渲染的数据点数量
  const [windowStart, setWindowStart] = useState(0) // 当前窗口起始位置
  const [allHistoryData, setAllHistoryData] = useState<HistoryData[]>([]) // 存储所有历史数据

  /**
   * 初始化数据
   */
  const initializeData = async () => {
    if (isInitialized) return
    
    try {
      console.log('开始初始化数据...')
      const [groupsData, devicesData] = await Promise.all([
        apiService.getGroups(),
        apiService.getDevices()
      ])
      console.log('获取到的分组数据:', groupsData)
      console.log('获取到的设备数据:', devicesData)
      
      // 正确提取数据字段
      const groups = groupsData?.data || []
      const devices = devicesData?.items || []
      
      console.log('提取的分组数据:', groups)
      console.log('提取的设备数据:', devices)
      
      setGroups(Array.isArray(groups) ? groups : [])
      setDevices(Array.isArray(devices) ? devices : [])
      setIsInitialized(true)
      console.log('数据初始化完成')
    } catch (error) {
      console.error('初始化数据失败:', error)
      // 确保即使出错也设置为空数组
      setGroups([])
      setDevices([])
      setIsInitialized(true) // 即使失败也标记为已初始化，避免重复尝试
    }
  }

  /**
   * 根据选中的分组过滤设备
   */
  const getFilteredDevices = () => {
    if (selectedGroupId === 'all') return devices
    return devices.filter(device => device.group_id === parseInt(selectedGroupId))
  }

  /**
   * 处理历史数据转换为图表数据
   */
  const processChartData = (data: HistoryData[]) => {
    console.log('processChartData 开始处理数据:', data.length, '条记录')
    //console.log('原始数据样本:', data)
    
    if (data.length === 0) {
      console.log('数据为空，清空图表')
      setChartData([])
      setDataKeys([])
      setAddressMapping({})
      return
    }

    // 按时间分组数据
    const timeGroups: { [key: string]: { [key: string]: number } } = {}
    const addressSet = new Set<string>()
    const newAddressMapping: AddressMapping = {}

    data.forEach(item => {
      const timeKey = new Date(item.time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = {}
      }
      
      // 使用地址作为键，确保唯一性
      timeGroups[timeKey][item.address] = item.value
      addressSet.add(item.address)
      
      // 获取设备名称和地址名称，生成组合显示名称用于映射
      const deviceName = selectedDevice?.name || '未知设备'
      const addr = deviceAddresses.find(a => a.address === item.address)
      const addressName = addr?.name || item.address
      const displayName = `${deviceName} - ${addressName}`
      newAddressMapping[item.address] = displayName
      
      // // 调试日志：检查地址配置
      // if (!addr) {
      //   console.warn(`未找到地址配置: ${item.address}, 当前设备地址列表:`, deviceAddresses)
      // } else {
      //   console.log(`地址配置: ${item.address} -> name: ${addr.name}, 最终显示: ${displayName}`)
      // }
    })

    //console.log('时间分组结果:', Object.keys(timeGroups).length, '个时间点')
    //console.log('地址集合:', Array.from(addressSet))
    //console.log('地址映射:', newAddressMapping)
    //console.log('时间分组样本:', Object.entries(timeGroups))

    // 转换为图表数据格式，确保所有地址在每个时间点都有数据项
    const allAddresses = Array.from(addressSet)
    const chartPoints: ChartDataPoint[] = Object.entries(timeGroups).map(([time, values]) => {
      const point: any = { time }
      // 为每个地址添加数据点，如果没有数据则设为null
      allAddresses.forEach(address => {
        point[address] = values[address] !== undefined ? values[address] : null
      })
      return point
    })

    // 按时间排序
    chartPoints.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    //console.log('最终图表数据点数量:', chartPoints.length)
    //console.log('图表数据样本:', chartPoints.slice(0, 3))
    //console.log('数据键:', Array.from(addressSet))

    setChartData(chartPoints)
    // dataKeys 使用地址，但在图表显示时会通过 addressMapping 转换为显示名称
    setDataKeys(Array.from(addressSet))
    setAddressMapping(newAddressMapping)
  }

  /**
   * 处理查询
   */
  const handleQuery = async () => {
    await initializeData()
    
    if (!selectedDevice) {
      alert('请选择设备')
      return
    }

    if (selectedAddresses.length === 0) {
      alert('请选择至少一个地址')
      return
    }
    
    setIsLoading(true)
    try {
      // 重置状态
      setWindowStart(0)
      setAllHistoryData([])
      setHistoryData([])
      
      const allData: HistoryData[] = []
      
      for (const address of selectedAddresses) {
        const params: HistoryQueryParams = {
          device_id: selectedDevice.id,
          address: address,
          limit: 50000 // 获取大量数据，实际应该根据需要调整
        }

        if (startTime) {
          params.start_time = startTime
        }
        if (endTime) {
          params.end_time = endTime
        }

        //console.log('查询参数:', params)
        const deviceData = await apiService.getHistoryData(params)
        //console.log(`地址 ${address} 返回数据:`, deviceData.length, '条')
        //console.log(`地址 ${address} 数据样本:`, deviceData.slice(0, 3))
        allData.push(...deviceData)
      }
      
      // 按时间排序
      allData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      
      //console.log('合并后总数据量:', allData.length, '条')
      //console.log('合并数据样本:', allData.slice(0, 5))
      
      // 存储所有数据
      setAllHistoryData(allData)
      
      // 设置初始窗口数据
      const initialWindowData = allData.slice(0, windowSize)
      //console.log('初始窗口数据量:', initialWindowData.length, '条')
      //console.log('窗口数据样本:', initialWindowData.slice(0, 3))
      setHistoryData(initialWindowData)
      
      // 处理图表数据
      processChartData(initialWindowData)
      
    } catch (error) {
      console.error('查询历史数据失败:', error)
      setHistoryData([])
      setChartData([])
      setDataKeys([])
      setAllHistoryData([])
    } finally {
      setIsLoading(false)
    }
  }
  


  /**
   * 获取设备地址列表
   */
  const fetchDeviceAddresses = async (deviceId: number) => {
    try {
      const device = devices.find(d => d.id === deviceId)
      if (device && device.addresses) {
        // 解析addresses字段（JSON格式）
        const addresses = typeof device.addresses === 'string' 
          ? JSON.parse(device.addresses) 
          : device.addresses
        
        // 转换为DeviceAddress格式
        const deviceAddressList: DeviceAddress[] = addresses.map((addr: any) => {
          if (typeof addr === 'string') {
            return { address: addr }
          } else {
            return {
              id: addr.id,
              name: addr.name,
              address: addr.address,
              type: addr.type,
              unit: addr.unit,
              description: addr.description
            }
          }
        })
        
        setDeviceAddresses(deviceAddressList)
        
        // 更新地址映射 - 生成与processChartData一致的格式
        const mapping: AddressMapping = {}
        const deviceName = device.name || '未知设备'
        deviceAddressList.forEach(addr => {
          const addressName = addr.name || addr.address
          const displayName = `${deviceName} - ${addressName}`
          mapping[addr.address] = displayName
          console.log(`地址映射: ${addr.address} -> ${displayName}`)
        })
        setAddressMapping(mapping)
      }
    } catch (error) {
      console.error('解析设备地址失败:', error)
       console.error('获取设备地址失败')
       setDeviceAddresses([])
    }
  }

  /**
   * 重置筛选条件
   */
  const handleReset = () => {
    setSelectedGroupId('all')
    setSelectedDevice(null)
    setSelectedAddresses([])
    setDeviceAddresses([])
    setStartTime('')
    setEndTime('')
    setHistoryData([])
    setChartData([])
    setDataKeys([])
    setAddressMapping({})
    // 重置滑动窗口状态
    setWindowStart(0)
    setAllHistoryData([])
  }

  /**
   * 更新滑动窗口数据
   */
  const updateWindowData = (start: number) => {
    const windowData = allHistoryData.slice(start, start + windowSize)
    setHistoryData(windowData)
    processChartData(windowData)
  }

  /**
   * 处理滑动条变化
   */
  const handleSliderChange = (value: number[]) => {
    const newStart = value[0]
    setWindowStart(newStart)
    updateWindowData(newStart)
  }

  /**
   * 处理窗口大小变化
   */
  const handleWindowSizeChange = (newSize: string) => {
    const size = parseInt(newSize)
    setWindowSize(size)
    updateWindowData(windowStart)
  }

  /**
   * 向前移动窗口
   */
  const moveWindowForward = () => {
    const maxStart = Math.max(0, allHistoryData.length - windowSize)
    const newStart = Math.min(windowStart + Math.floor(windowSize / 2), maxStart)
    setWindowStart(newStart)
    updateWindowData(newStart)
  }

  /**
   * 向后移动窗口
   */
  const moveWindowBackward = () => {
    const newStart = Math.max(0, windowStart - Math.floor(windowSize / 2))
    setWindowStart(newStart)
    updateWindowData(newStart)
  }

  /**
   * 添加设备到选中列表
   */
  const handleAddDevice = (deviceId: string) => {
    if (deviceId === 'all') return
    
    const device = getFilteredDevices().find(d => d.id === parseInt(deviceId))
    if (device) {
      setSelectedDevice(device)
      setSelectedAddresses([])
      fetchDeviceAddresses(device.id)
    }
  }

  /**
   * 从选中列表移除设备
   */
  const handleRemoveDevice = (deviceId: number) => {
    setSelectedDevice(null)
    setSelectedAddresses([])
    setDeviceAddresses([])
  }

  /**
   * 批量添加分组内所有设备
   */
  const handleAddGroupDevices = () => {
    // 单设备模式下不需要此功能
    return
  }

  /**
   * 导出数据为CSV
   */
  const handleExport = () => {
    if (historyData.length === 0) {
      alert('没有数据可导出')
      return
    }

    const headers = ['时间', '设备ID', '地址', '数值']
    const csvContent = [
      headers.join(','),
      ...historyData.map(item => [
        new Date(item.time).toLocaleString(),
        item.device_id,
        item.address,
        item.value
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `历史数据_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * 生成图表颜色
   */
  const getLineColor = (index: number) => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ]
    return colors[index % colors.length]
  }

  /**
   * 自定义图例渲染
   */
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}-${entry.value}`} className="flex items-center gap-1 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">
              {addressMapping[entry.value] || entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // 初始化数据
  React.useEffect(() => {
    console.log('useEffect 触发，开始初始化数据')
    initializeData()
  }, [])

  // 监听状态变化
  React.useEffect(() => {
    console.log('分组状态更新:', groups)
  }, [groups])

  React.useEffect(() => {
    console.log('设备状态更新:', devices)
  }, [devices])

  const filteredDevices = getFilteredDevices()

  return (
    <AuthGuard>
      <MainLayout>
        <div className="w-full max-w-none p-6 space-y-6">
          {/* 页面标题 - 优化版本 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">历史数据</h1>
                    <p className="text-blue-600 mt-1 font-medium">查看和分析设备历史数据</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleQuery}
                  disabled={isLoading}
                  className="bg-white hover:bg-gray-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  查询数据
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={historyData.length === 0}
                  className="bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出CSV
                </Button>
              </div>
            </div>
          </div>

          {/* 筛选条件 - 优化版本 */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5 text-blue-500" />
                筛选条件
              </CardTitle>
            </CardHeader>
            <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 分组选择 */}
            <div className="space-y-2">
              <Label htmlFor="group-select">分组</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger id="group-select">
                  <SelectValue placeholder="选择分组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分组</SelectItem>
                  {Array.isArray(groups) && groups.map(group => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 设备选择 */}
            <div className="space-y-2">
              <Label htmlFor="device-select">选择设备</Label>
              <Select value={selectedDevice?.id.toString() || ''} onValueChange={(value) => {
                if (value) {
                  const device = getFilteredDevices().find(d => d.id === parseInt(value))
                  if (device) {
                    setSelectedDevice(device)
                    setSelectedAddresses([])
                    fetchDeviceAddresses(device.id)
                  }
                } else {
                  setSelectedDevice(null)
                  setSelectedAddresses([])
                  setDeviceAddresses([])
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择设备" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredDevices().map(device => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 地址选择 */}
            <div className="space-y-2">
              <Label htmlFor="address-select">选择地址</Label>
              
              {deviceAddresses.length > 0 ? (
                <>
                  {/* 地址选择下拉框 */}
                  <Select value="" onValueChange={(value) => {
                    if (value === 'select-all') {
                      setSelectedAddresses(deviceAddresses.map(addr => addr.address))
                    } else if (value === 'clear-all') {
                      setSelectedAddresses([])
                    } else if (value) {
                      const isSelected = selectedAddresses.includes(value)
                      if (isSelected) {
                        setSelectedAddresses(selectedAddresses.filter(a => a !== value))
                      } else {
                        setSelectedAddresses([...selectedAddresses, value])
                      }
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        selectedAddresses.length > 0 
                          ? `已选择 ${selectedAddresses.length} 个地址` 
                          : "选择地址"
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {/* 全选/清空选项 */}
                      <SelectItem value="select-all" className="font-medium text-blue-600">
                        ✓ 全选所有地址
                      </SelectItem>
                      <SelectItem value="clear-all" className="font-medium text-red-600">
                        ✗ 清空选择
                      </SelectItem>
                      <div className="border-t my-1"></div>
                      
                      {/* 地址列表 */}
                      {deviceAddresses.map(addr => {
                        const isSelected = selectedAddresses.includes(addr.address)
                        return (
                          <SelectItem 
                            key={addr.address} 
                            value={addr.address}
                            className={isSelected ? 'bg-blue-50 text-blue-700' : ''}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-sm border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                  {isSelected && <span className="block w-full h-full text-white text-xs leading-3 text-center">✓</span>}
                                </span>
                                <div>
                                  <div className="font-medium">{addr.name}</div>
                                  <div className="text-xs text-gray-500">{addr.address} • {addr.unit}</div>
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-600">
                    {selectedDevice ? '该设备暂无可用地址' : '请先选择设备'}
                  </div>
                </div>
              )}
            </div>

            {/* 开始时间 */}
            <div className="space-y-2">
              <Label htmlFor="start-time">开始时间</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* 结束时间 */}
            <div className="space-y-2">
              <Label htmlFor="end-time">结束时间</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            {/* 重置按钮 */}
            <div className="flex items-end">
              <Button variant="outline" onClick={handleReset} className="w-full">
                重置条件
              </Button>
            </div>
          </div>
          
          {/* 已选设备和地址 */}
          {selectedDevice && (
            <div className="mt-4 space-y-2">
              <div>
                <Label className="text-sm font-medium">已选设备</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span>{selectedDevice.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveDevice(selectedDevice.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                </div>
              </div>
              {selectedAddresses.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">已选地址 ({selectedAddresses.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAddresses.map(address => {
                      const addr = deviceAddresses.find(a => a.address === address)
                      return (
                        <Badge key={address} variant="outline" className="text-xs">
                          {addr?.name || address}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

          {/* 数据统计 - 优化版本 */}
          {historyData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{historyData.length}</div>
                      <div className="text-sm text-muted-foreground">
                        当前显示 / 总计: {allHistoryData.length}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Monitor className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedDevice ? 1 : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">选中设备</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {new Set(historyData.map(item => item.address)).size}
                      </div>
                      <div className="text-sm text-muted-foreground">涉及地址</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {historyData.length > 0 ? new Date(Math.max(...historyData.map(item => new Date(item.time).getTime()))).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                      <div className="text-sm text-muted-foreground">最新数据时间</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 滑动窗口控制 - 优化版本 */}
          {allHistoryData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sliders className="h-5 w-5 text-blue-500" />
                  数据窗口控制
                </CardTitle>
              </CardHeader>
              <CardContent>
            <div className="space-y-4">
              {/* 窗口大小选择 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">显示数据点:</span>
                  <Select value={windowSize.toString()} onValueChange={handleWindowSizeChange}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                      <SelectItem value="2000">2000</SelectItem>
                      <SelectItem value="5000">5000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  总数据: {allHistoryData.length} 条 | 当前显示: {windowStart + 1} - {Math.min(windowStart + windowSize, allHistoryData.length)} 条
                </div>
              </div>
              
              {/* 滑动控制 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={moveWindowBackward}
                    disabled={windowStart === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    向前
                  </Button>
                  <div className="flex-1 px-4">
                    <Slider
                      value={[windowStart]}
                      onValueChange={handleSliderChange}
                      max={Math.max(0, allHistoryData.length - windowSize)}
                      step={Math.floor(windowSize / 10)}
                      className="w-full"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={moveWindowForward}
                    disabled={windowStart >= allHistoryData.length - windowSize}
                  >
                    向后
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  拖动滑块或使用按钮来浏览数据
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

          {/* 图表展示 - 优化版本 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                数据趋势图
                {dataKeys.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({dataKeys.length} 条数据线)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-80">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">加载中...</span>
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[700px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#f0f0f0"
                    opacity={0.7}
                  />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: '#666' }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={Math.max(0, Math.floor(chartData.length / 10))}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickLine={{ stroke: '#e0e0e0' }}
                  />
                  <Tooltip 
                    labelStyle={{ color: '#333', fontWeight: 'bold' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => [
                      value,
                      name
                    ]}
                  />
                  <Legend content={renderLegend} />
                  {dataKeys.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={getLineColor(index)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: getLineColor(index), strokeWidth: 2 }}
                      connectNulls={false}
                      name={addressMapping[key] || key}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 text-muted-foreground">
              <div className="text-center">
                <div className="text-lg font-medium">暂无数据</div>
                <div className="text-sm mt-1">
                  {!selectedDevice 
                    ? '请先选择要查看的设备' 
                    : selectedAddresses.length === 0
                    ? '请选择要查看的地址'
                    : '请设置筛选条件并点击"查询数据"按钮'
                  }
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}