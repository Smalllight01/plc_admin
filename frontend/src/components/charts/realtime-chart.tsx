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
    <Card className="w-full h-auto min-h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          实时数据 {deviceName && `- ${deviceName}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 地址选择器 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            选择显示地址:
          </div>
          <div className="flex flex-wrap gap-3">
            {availableAddresses.map(addr => {
              const isSelected = selectedAddresses.has(addr.address)
              const config = chartConfig[addr.address]
              
              return (
                <div key={addr.address} className="flex items-center space-x-2">
                  <Checkbox
                    id={addr.address}
                    checked={isSelected}
                    onCheckedChange={() => handleAddressToggle(addr.address)}
                  />
                  <label
                    htmlFor={addr.address}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config?.color }}
                    />
                    <span>{addr.name || addr.address}</span>
                    {addr.unit && (
                      <Badge variant="secondary" className="text-xs">
                        {addr.unit}
                      </Badge>
                    )}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* 图表 */}
        <div className="w-full">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>等待实时数据...</p>
              </div>
            </div>
          ) : selectedAddresses.size === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>请选择要显示的地址</p>
              </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
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
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={50}
                    interval="preserveStartEnd"
                    tickFormatter={(value) => value.slice(0, 8)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}`}
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
                        }}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
        
        {/* 统计信息 */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>数据点: {chartData.length}/{maxDataPoints}</span>
          <span>选中地址: {selectedAddresses.size}/{availableAddresses.length}</span>
          {chartData.length > 0 && (
            <span>
              最后更新: {formatDateTime(chartData[chartData.length - 1]?.timestamp)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}