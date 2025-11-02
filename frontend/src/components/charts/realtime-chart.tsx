'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { TrendingUp, Activity } from 'lucide-react'

/**
 * 实时数据点接口
 */
interface RealtimeDataPoint {
  timestamp: string
  data: Record<string, any>
}

/**
 * 地址配置接口
 */
interface AddressConfig {
  address: string
  name?: string
  type?: string
  unit?: string
}

/**
 * 图表数据点接口
 */
interface ChartDataPoint {
  timestamp: string
  time: string
  [key: string]: any
}

/**
 * 实时数据图表组件属性
 */
interface RealtimeChartProps {
  /** 实时数据数组 */
  realtimeData: RealtimeDataPoint[]
  /** 地址配置数组 */
  addresses: AddressConfig[]
  /** 设备名称 */
  deviceName?: string
  /** 图表高度 */
  height?: number
  /** 最大数据点数量 */
  maxDataPoints?: number
}

/**
 * 生成图表颜色配置
 */
function generateChartConfig(addresses: AddressConfig[]): ChartConfig {
  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]
  
  const config: ChartConfig = {}
  
  addresses.forEach((addr, index) => {
    const colorIndex = index % colors.length
    config[addr.address] = {
      label: addr.name || addr.address,
      color: colors[colorIndex],
    }
  })
  
  return config
}

/**
 * 实时数据图表组件
 * 显示设备实时数据的曲线图，支持地址选择和实时更新
 */
export function RealtimeChart({
  realtimeData,
  addresses,
  deviceName,
  height = 400,
  maxDataPoints = 50,
}: RealtimeChartProps) {
  // 选中的地址状态
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(
    new Set(addresses.slice(0, 3).map(addr => addr.address)) // 默认选中前3个地址
  )
  
  // 历史数据状态
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  
  // 生成图表配置
  const chartConfig = useMemo(() => generateChartConfig(addresses), [addresses])
  
  /**
   * 处理地址选择变化
   */
  const handleAddressToggle = (address: string) => {
    setSelectedAddresses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(address)) {
        newSet.delete(address)
      } else {
        newSet.add(address)
      }
      return newSet
    })
  }
  
  /**
   * 更新图表数据
   */
  useEffect(() => {
    if (!realtimeData || realtimeData.length === 0) {
      return
    }
    
    // 转换数据格式为图表所需格式
    const convertedData: ChartDataPoint[] = realtimeData.map(item => {
      const date = new Date(item.timestamp)
      const timeLabel = date.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      
      const dataPoint: ChartDataPoint = {
        timestamp: item.timestamp,
        time: timeLabel,
      }
      
      // 添加每个地址的值
      Object.entries(item.data || {}).forEach(([address, value]) => {
        if (value !== undefined && value !== null) {
          // 确保数值类型
          const numericValue = typeof value === 'number' 
            ? value 
            : parseFloat(String(value))
          
          if (!isNaN(numericValue)) {
            dataPoint[address] = numericValue
          }
        }
      })
      
      return dataPoint
    })
    
    // 限制数据点数量
    const limitedData = convertedData.length > maxDataPoints 
      ? convertedData.slice(-maxDataPoints) 
      : convertedData
    
    setChartData(limitedData)
  }, [realtimeData, maxDataPoints])
  
  // 过滤出有数值的地址
  const availableAddresses = addresses.filter(addr => {
    return chartData.some(point => 
      point[addr.address] !== undefined && 
      !isNaN(Number(point[addr.address]))
    )
  })
  
  return (
    <Card className="w-full h-auto min-h-fit border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <span className="text-h2 gradient-text">实时数据趋势</span>
            {deviceName && (
              <p className="text-body text-muted-foreground mt-1">设备: {deviceName}</p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 地址选择器 - 扁平拟物风格 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-body font-semibold">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            选择显示地址:
          </div>
          <div className="flex flex-wrap gap-4">
            {availableAddresses.map(addr => {
              const isSelected = selectedAddresses.has(addr.address)
              const config = chartConfig[addr.address]

              return (
                <div
                  key={addr.address}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic hover:shadow-neumorphic-lg border border-blue-200'
                      : 'bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm hover:shadow-neumorphic border border-transparent'
                  }`}
                  onClick={() => handleAddressToggle(addr.address)}
                >
                  <Checkbox
                    id={addr.address}
                    checked={isSelected}
                    onCheckedChange={() => handleAddressToggle(addr.address)}
                    className="h-5 w-5"
                  />
                  <label
                    htmlFor={addr.address}
                    className="text-body font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-3"
                  >
                    <div
                      className="w-4 h-4 rounded-full shadow-neumorphic-sm"
                      style={{ backgroundColor: config?.color }}
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{addr.name || addr.address}</span>
                      {addr.unit && (
                        <Badge variant="outline" className="text-body-sm shadow-neumorphic-sm mt-1">
                          {addr.unit}
                        </Badge>
                      )}
                    </div>
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        {/* 图表容器 - 扁平拟物风格 */}
        <div className="w-full rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm shadow-neumorphic-sm p-6">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm mb-4">
                <Activity className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-h3 text-foreground mb-2">等待实时数据</h3>
              <p className="text-body text-muted-foreground">设备正在采集数据中...</p>
            </div>
          ) : selectedAddresses.size === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm mb-4">
                <TrendingUp className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-h3 text-foreground mb-2">请选择地址</h3>
              <p className="text-body text-muted-foreground">请选择要显示的地址以查看数据趋势</p>
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="min-h-[300px] w-full rounded-2xl"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    top: 20,
                    left: 12,
                    right: 12,
                    bottom: 40,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#f0f0f0"
                    strokeDasharray="3 3"
                    opacity={0.7}
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={50}
                    interval="preserveStartEnd"
                    tickFormatter={(value) => value.slice(0, 8)}
                    tick={{ fontSize: 11, fill: '#666' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}`}
                    tick={{ fontSize: 11, fill: '#666' }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {Array.from(selectedAddresses).map(address => {
                    const config = chartConfig[address]
                    return (
                      <Line
                        key={address}
                        type="monotone"
                        dataKey={address}
                        stroke={config?.color}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        activeDot={{
                          r: 6,
                          stroke: config?.color,
                          strokeWidth: 2,
                          fill: '#fff',
                        }}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>

        {/* 统计信息 - 扁平拟物风格 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
          <div className="flex items-center gap-4 text-body-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                <Activity className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span>数据点: <span className="font-semibold text-foreground">{chartData.length}/{maxDataPoints}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-neumorphic-sm">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span>选中地址: <span className="font-semibold text-foreground">{selectedAddresses.size}/{availableAddresses.length}</span></span>
            </div>
          </div>
          {chartData.length > 0 && (
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <div className="p-1.5 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 shadow-neumorphic-sm">
                <Activity className="h-3.5 w-3.5 text-orange-600" />
              </div>
              <span>最后更新: <span className="font-semibold text-foreground">{formatDateTime(chartData[chartData.length - 1]?.timestamp)}</span></span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}