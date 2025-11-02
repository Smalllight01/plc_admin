'use client'

import React, { useState, useCallback } from 'react'
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
  station_id?: number
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
  address: string // 存储格式地址（如 100_s1）
  originalAddress?: string // 原始地址（如 100）
  stationId?: number // 站号
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
      const devices = devicesData?.data || []
      
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
   * @param data 历史数据数组
   * @returns 包含chartData、dataKeys和addressMapping的对象
   */
  const processChartData = (data: HistoryData[]) => {
    console.log('processChartData 开始处理数据:', data.length, '条记录')
    //console.log('原始数据样本:', data)
    
    if (data.length === 0) {
      console.log('数据为空，清空图表')
      return {
        chartData: [],
        dataKeys: [],
        addressMapping: {}
      }
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
      
      // 使用原始存储格式地址作为键，确保唯一性
      const displayAddress = item.originalAddress || item.address
      timeGroups[timeKey][displayAddress] = item.value
      addressSet.add(displayAddress)

      // 获取设备名称和地址名称，生成组合显示名称用于映射
      const deviceName = selectedDevice?.name || '未知设备'

      // 使用原始存储格式地址查找配置（displayAddress是存储格式，如100_s1）
      const addr = deviceAddresses.find(a => a.address === displayAddress)
      let addressName: string
      let stationDisplay: string

      if (addr) {
        // 找到配置，使用配置中的名称
        addressName = addr.name || (addr.originalAddress || displayAddress)
        stationDisplay = addr.stationId && addr.stationId > 1 ? ` (站号${addr.stationId})` : ''
      } else {
        // 没找到配置，从存储格式中解析
        if (displayAddress.includes('_s')) {
          const parts = displayAddress.split('_s')
          if (parts.length === 2 && parts[1].match(/^\d+$/)) {
            addressName = parts[0]
            stationDisplay = ` (站号${parts[1]})`
          } else {
            addressName = displayAddress
            stationDisplay = ''
          }
        } else {
          addressName = displayAddress
          stationDisplay = ''
        }
      }

      const displayName = `${deviceName} - ${addressName}${stationDisplay}`
      newAddressMapping[displayAddress] = displayName
      
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

    // 返回处理结果对象
    return {
      chartData: chartPoints,
      dataKeys: Array.from(addressSet),
      addressMapping: newAddressMapping
    }
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

      // 添加调试信息
      console.log('=== 历史数据查询调试信息 ===')
      console.log('选中设备:', selectedDevice)
      console.log('设备地址配置:', deviceAddresses)
      console.log('选中地址列表:', selectedAddresses)

      const allData: HistoryData[] = []

      for (const address of selectedAddresses) {
        // 解析存储格式地址，分离address和station_id
        let queryAddress = address
        let stationId: number | undefined

        // 检查是否是多站号存储格式 (如 100_s1)
        const stationMatch = address.match(/^(.+)_s(\d+)$/)
        if (stationMatch) {
          queryAddress = stationMatch[1] // 提取原始地址
          stationId = parseInt(stationMatch[2]) // 提取站号
        }

        // 构建查询参数，使用分离的address和station_id
        const params: HistoryQueryParams = {
          device_id: selectedDevice.id,
          address: queryAddress,
          station_id: stationId,
          limit: 50000
        }

        if (startTime) {
          params.start_time = startTime
        }
        if (endTime) {
          params.end_time = endTime
        }

        console.log(`查询地址: ${address} -> 分离后 address=${queryAddress}, station_id=${stationId}`)
        console.log(`查询参数:`, params)

        const deviceData = await apiService.getHistoryData(params)
        console.log(`地址 ${address} 返回数据:`, deviceData.length, '条')

        if (deviceData.length > 0) {
          console.log(`地址 ${address} 数据样本:`, deviceData.slice(0, 3))
          // 为返回的数据添加原始存储格式地址标识
          const processedData = deviceData.map(item => ({
            ...item,
            originalAddress: address
          }))
          allData.push(...processedData)
        } else {
          console.log(`地址 ${address} 无数据`)
        }
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
      const processed = processChartData(initialWindowData)
      setChartData(processed.chartData)
      setDataKeys(processed.dataKeys)
      setAddressMapping(processed.addressMapping)
      
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
        
        // 转换为DeviceAddress格式，并生成存储格式的地址列表
        const deviceAddressList: DeviceAddress[] = []
        const storageAddresses: string[] = []

        addresses.forEach((addr: any) => {
          if (typeof addr === 'string') {
            // 简单字符串地址，需要检查设备类型
            if (device.plc_type && device.plc_type.toLowerCase().includes('rtu') && device.plc_type.toLowerCase().includes('tcp')) {
              // RTU over TCP设备，自动生成多站号存储格式
              console.log(`检测到RTU over TCP设备 ${device.name}，为地址 ${addr} 自动生成多站号存储格式`)

              // 生成常见的站号配置：1-4
              const commonStationIds = [1, 2, 3, 4]

              commonStationIds.forEach(stationId => {
                const storageAddress = `${addr}_s${stationId}`
                deviceAddressList.push({
                  address: storageAddress,
                  originalAddress: addr,
                  stationId: stationId,
                  name: `${addr} (站号${stationId})`
                })
                storageAddresses.push(storageAddress)
              })
            } else {
              // 非RTU over TCP设备，直接使用原始地址
              deviceAddressList.push({ address: addr })
              storageAddresses.push(addr)
            }
          } else {
            // 复杂地址对象，检查是否有站号配置
            const { stationId, ...rest } = addr
            const station = stationId || 1

            // 生成存储格式的地址
            const storageAddress = station > 1 ? `${addr.address}_s${station}` : addr.address

            deviceAddressList.push({
              ...rest,
              address: storageAddress, // 使用存储格式
              originalAddress: addr.address, // 保留原始地址
              stationId: station
            })

            storageAddresses.push(storageAddress)
          }
        })

        console.log('设备地址列表（存储格式）:', storageAddresses)
        
        setDeviceAddresses(deviceAddressList)
        
        // 更新地址映射 - 直接使用存储格式
        const mapping: AddressMapping = {}
        const deviceName = device.name || '未知设备'

        deviceAddressList.forEach(addr => {
          const addressName = addr.name || (addr.originalAddress || addr.address)
          const displayName = `${deviceName} - ${addressName}`

          // 如果有站号信息，显示站号
          if (addr.stationId && addr.stationId > 1) {
            const stationDisplay = `${displayName} (站号${addr.stationId})`
            mapping[addr.address] = stationDisplay  // addr.address 已经是存储格式
            console.log(`地址映射: ${addr.address} -> ${stationDisplay}`)
          } else {
            mapping[addr.address] = displayName
            console.log(`地址映射: ${addr.address} -> ${displayName}`)
          }
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
  const updateWindowData = useCallback(() => {
    if (allHistoryData.length === 0) return
    
    const endIndex = Math.min(windowStart + windowSize, allHistoryData.length)
    const windowData = allHistoryData.slice(windowStart, endIndex)
    
    setHistoryData(windowData)
    
    // 重新处理图表数据
    const processed = processChartData(windowData)
    setChartData(processed.chartData)
    setDataKeys(processed.dataKeys)
    setAddressMapping(processed.addressMapping)
    
  }, [allHistoryData, windowStart, windowSize])

  // 监听窗口位置和大小变化
  React.useEffect(() => {
    if (allHistoryData.length > 0) {
      updateWindowData()
    }
  }, [windowStart, windowSize, updateWindowData])

  /**
   * 处理滑动条变化
   */
  const handleSliderChange = (value: number[]) => {
    const newStart = value[0]
    setWindowStart(newStart)
  }

  /**
   * 处理窗口大小变化
   */
  const handleWindowSizeChange = (newSize: string) => {
    const size = parseInt(newSize)
    setWindowSize(size)
  }

  /**
   * 向前移动窗口
   */
  const moveWindowForward = () => {
    const maxStart = Math.max(0, allHistoryData.length - windowSize)
    const newStart = Math.min(windowStart + Math.floor(windowSize / 2), maxStart)
    setWindowStart(newStart)
  }

  /**
   * 向后移动窗口
   */
  const moveWindowBackward = () => {
    const newStart = Math.max(0, windowStart - Math.floor(windowSize / 2))
    setWindowStart(newStart)
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
        item.originalAddress || item.address,
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

  // 监听窗口数据变化，自动更新图表
  React.useEffect(() => {
    if (allHistoryData.length > 0) {
      updateWindowData()
    }
  }, [allHistoryData, updateWindowData])



  const filteredDevices = getFilteredDevices()

  return (
    <AuthGuard>
      <MainLayout>
        <div className="w-full max-w-none p-6 space-y-8">
          {/* 页面标题 - 扁平拟物风格 */}
          <div className="neumorphic-card p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-neumorphic-lg">
                  <Calendar className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-h1 gradient-text mb-2">历史数据</h1>
                  <p className="text-body text-muted-foreground">查看和分析设备历史数据</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleQuery}
                  disabled={isLoading}
                  className="shadow-neumorphic hover:shadow-neumorphic-lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-5 w-5 mr-2" />
                  )}
                  查询数据
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleExport}
                  disabled={historyData.length === 0}
                  className="shadow-neumorphic-sm hover:shadow-neumorphic"
                >
                  <Download className="h-5 w-5 mr-2" />
                  导出CSV
                </Button>
              </div>
            </div>
          </div>

          {/* 筛选条件 - 扁平拟物风格 */}
          <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                  <Filter className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-h2 gradient-text">筛选条件</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 分组选择 */}
            <div className="space-y-3">
              <Label htmlFor="group-select" className="text-body font-semibold">分组</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger id="group-select" className="h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                  <SelectValue placeholder="选择分组" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
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
            <div className="space-y-3">
              <Label htmlFor="device-select" className="text-body font-semibold">选择设备</Label>
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
                <SelectTrigger className="h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                  <SelectValue placeholder="选择设备" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                  {getFilteredDevices().map(device => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 地址选择 */}
            <div className="space-y-3">
              <Label htmlFor="address-select" className="text-body font-semibold">选择地址</Label>

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
                    <SelectTrigger className="h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                      <SelectValue placeholder={
                        selectedAddresses.length > 0
                          ? `已选择 ${selectedAddresses.length} 个地址`
                          : "选择地址"
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                      {/* 全选/清空选项 */}
                      <SelectItem value="select-all" className="font-medium text-blue-600 hover:bg-blue-50">
                        ✓ 全选所有地址
                      </SelectItem>
                      <SelectItem value="clear-all" className="font-medium text-red-600 hover:bg-red-50">
                        ✗ 清空选择
                      </SelectItem>
                      <div className="border-t border-border/30 my-1"></div>

                      {/* 地址列表 */}
                      {deviceAddresses.map(addr => {
                        const isSelected = selectedAddresses.includes(addr.address)
                        return (
                          <SelectItem
                            key={addr.address}
                            value={addr.address}
                            className={`${isSelected ? 'bg-blue-50 text-blue-700' : ''} hover:bg-muted/50`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-lg border-2 ${isSelected ? 'bg-blue-500 border-blue-500 shadow-neumorphic-sm' : 'border-border bg-muted/30'}`}>
                                  {isSelected && <span className="block w-full h-full text-white text-xs leading-3 text-center">✓</span>}
                                </div>
                                <div>
                                  <div className="font-medium text-body">{addr.name || `地址 ${addr.originalAddress || addr.address}`}</div>
                                  <div className="text-caption text-muted-foreground">
                                    {addr.originalAddress || addr.address}
                                    {addr.unit && ` • ${addr.unit}`}
                                    {addr.stationId && addr.stationId > 1 && ` • 站号${addr.stationId}`}
                                  </div>
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
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 rounded-2xl p-4 text-center shadow-neumorphic-sm">
                  <div className="text-body-sm text-muted-foreground">
                    {selectedDevice ? '该设备暂无可用地址' : '请先选择设备'}
                  </div>
                </div>
              )}
            </div>

            {/* 开始时间 */}
            <div className="space-y-3">
              <Label htmlFor="start-time" className="text-body font-semibold">开始时间</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
              />
            </div>

            {/* 结束时间 */}
            <div className="space-y-3">
              <Label htmlFor="end-time" className="text-body font-semibold">结束时间</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
              />
            </div>

            {/* 重置按钮 */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full h-12 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
              >
                重置条件
              </Button>
            </div>
          </div>
          
          {/* 已选设备和地址 */}
          {selectedDevice && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-body font-semibold">已选设备</Label>
                <div className="flex flex-wrap gap-3 mt-3">
                  <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 shadow-neumorphic-sm">
                    <div className="p-1.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                      <Monitor className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span className="font-medium">{selectedDevice.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all duration-300"
                      onClick={() => handleRemoveDevice(selectedDevice.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                </div>
              </div>
              {selectedAddresses.length > 0 && (
                <div>
                  <Label className="text-body font-semibold">已选地址 ({selectedAddresses.length})</Label>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {selectedAddresses.map(address => {
                      const addr = deviceAddresses.find(a => a.address === address)
                      return (
                        <Badge key={address} variant="outline" className="text-body-sm px-3 py-2 shadow-neumorphic-sm">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                              <MapPin className="h-3 w-3 text-green-600" />
                            </div>
                            <span>{addr?.name || address}</span>
                          </div>
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

          {/* 数据统计 - 扁平拟物风格 */}
          {historyData.length > 0 && (
            <div className="dashboard-grid">
              <div className="stat-card group">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-2">
                    <h3 className="text-h4 text-foreground">当前数据</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200 shadow-neumorphic-sm">
                        窗口数据
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                    <BarChart3 className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="stat-card-number group-hover:scale-105 transition-transform duration-300">
                    {historyData.length}
                  </div>
                  <p className="stat-card-label">
                    当前显示 / 总计: {allHistoryData.length}
                  </p>
                </div>
              </div>

              <div className="stat-card group">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-2">
                    <h3 className="text-h4 text-foreground">选中设备</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-medium bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 shadow-neumorphic-sm">
                        设备数量
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                    <Monitor className="h-6 w-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="stat-card-number text-emerald-600 group-hover:scale-105 transition-transform duration-300">
                    {selectedDevice ? 1 : 0}
                  </div>
                  <p className="stat-card-label">
                    {selectedDevice ? selectedDevice.name : '未选择设备'}
                  </p>
                </div>
              </div>

              <div className="stat-card group">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-2">
                    <h3 className="text-h4 text-foreground">涉及地址</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-medium bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200 shadow-neumorphic-sm">
                        地址数量
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                    <MapPin className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="stat-card-number text-purple-600 group-hover:scale-105 transition-transform duration-300">
                    {new Set(historyData.map(item => item.address)).size}
                  </div>
                  <p className="stat-card-label">
                    当前窗口内唯一地址数量
                  </p>
                </div>
              </div>

              <div className="stat-card group">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-2">
                    <h3 className="text-h4 text-foreground">最新数据</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-medium bg-orange-50 text-orange-700 px-3 py-1 rounded-full border border-orange-200 shadow-neumorphic-sm">
                        时间戳
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 shadow-neumorphic group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out">
                    <Clock className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="stat-card-number text-orange-600 group-hover:scale-105 transition-transform duration-300">
                    {historyData.length > 0 ? new Date(Math.max(...historyData.map(item => new Date(item.time).getTime()))).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </div>
                  <p className="stat-card-label">
                    当前窗口最新数据时间
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 滑动窗口控制 - 扁平拟物风格 */}
          {allHistoryData.length > 0 && (
            <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                    <Sliders className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-h2 gradient-text">数据窗口控制</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
            <div className="space-y-6">
              {/* 窗口大小选择 */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-body font-semibold">显示数据点:</span>
                  <Select value={windowSize.toString()} onValueChange={handleWindowSizeChange}>
                    <SelectTrigger className="w-28 h-10 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-sm border-0 shadow-neumorphic-lg">
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                      <SelectItem value="2000">2000</SelectItem>
                      <SelectItem value="5000">5000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-body text-muted-foreground">
                  总数据: {allHistoryData.length} 条 | 当前显示: {windowStart + 1} - {Math.min(windowStart + windowSize, allHistoryData.length)} 条
                </div>
              </div>

              {/* 滑动控制 */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={moveWindowBackward}
                    disabled={windowStart === 0}
                    className="h-12 px-6 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
                  >
                    <ChevronLeft className="h-5 w-5" />
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
                    size="lg"
                    onClick={moveWindowForward}
                    disabled={windowStart >= allHistoryData.length - windowSize}
                    className="h-12 px-6 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
                  >
                    向后
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="text-body-sm text-muted-foreground text-center">
                  拖动滑块或使用按钮来浏览数据
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

          {/* 图表展示 - 扁平拟物风格 */}
          <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-h2 gradient-text">数据趋势图</span>
                    {dataKeys.length > 0 && (
                      <span className="text-body text-muted-foreground ml-3">
                        ({dataKeys.length} 条数据线)
                      </span>
                    )}
                  </div>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <span className="text-body text-muted-foreground">加载图表数据中...</span>
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[400px] sm:h-[500px] lg:h-[700px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: window.innerWidth < 768 ? 10 : 30,
                    left: window.innerWidth < 768 ? 10 : 20,
                    bottom: window.innerWidth < 768 ? 80 : 120
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    opacity={0.7}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{
                      fontSize: window.innerWidth < 768 ? 8 : 10,
                      fill: '#666'
                    }}
                    angle={window.innerWidth < 768 ? -90 : -45}
                    textAnchor="end"
                    height={window.innerWidth < 768 ? 60 : 100}
                    interval={Math.max(0, Math.floor(chartData.length / (window.innerWidth < 768 ? 5 : 10)))}
                  />
                  <YAxis
                    tick={{
                      fontSize: window.innerWidth < 768 ? 9 : 11,
                      fill: '#666'
                    }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickLine={{ stroke: '#e0e0e0' }}
                  />
                  <Tooltip
                    labelStyle={{
                      color: '#333',
                      fontWeight: 'bold',
                      fontSize: window.innerWidth < 768 ? '12px' : '14px'
                    }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: window.innerWidth < 768 ? '8px' : '12px'
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
                      strokeWidth={window.innerWidth < 768 ? 1.5 : 2}
                      dot={false}
                      activeDot={{
                        r: window.innerWidth < 768 ? 3 : 4,
                        stroke: getLineColor(index),
                        strokeWidth: 2
                      }}
                      connectNulls={false}
                      name={addressMapping[key] || key}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm mb-6">
                <TrendingUp className="h-16 w-16 text-muted-foreground" />
              </div>
              <h3 className="text-h3 text-foreground mb-3">暂无数据</h3>
              <p className="text-body text-muted-foreground text-center">
                {!selectedDevice
                  ? '请先选择要查看的设备'
                  : selectedAddresses.length === 0
                  ? '请选择要查看的地址'
                  : '请设置筛选条件并点击"查询数据"按钮'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}