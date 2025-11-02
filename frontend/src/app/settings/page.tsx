'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { apiService } from '@/services/api'
import {
  Settings,
  Database,
  Server,
  Save,
  RefreshCw,
} from 'lucide-react'

interface SystemSettings {
  // 系统基本设置
  system_name: string
  system_description: string
  timezone: string
  language: string
  
  // PLC数据采集设置
  plc_collect_interval: number
  plc_connect_timeout: number
  plc_receive_timeout: number
  data_retention_days: number
  max_concurrent_connections: number
  
  // 日志设置
  log_level: string
  log_retention_days: number
  enable_audit_log: boolean
}

/**
 * 系统设置页面组件
 * 提供系统配置管理功能
 */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('system')
  const [formData, setFormData] = useState<SystemSettings>({
    system_name: 'PLC管理系统',
    system_description: '工业PLC设备管理与数据采集系统',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    plc_collect_interval: 5,
    plc_connect_timeout: 5000,
    plc_receive_timeout: 10000,
    data_retention_days: 30,
    max_concurrent_connections: 100,
    log_level: 'INFO',
    log_retention_days: 7,
    enable_audit_log: true,
  })
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 获取系统设置
  const {
    data: settingsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      try {
        const result = await apiService.getSystemSettings()
        console.log('获取到的系统设置数据:', result)
        return result || null
      } catch (error) {
        console.error('获取系统设置失败:', error)
        throw error
      }
    },
    staleTime: 0, // 数据立即过期
    gcTime: 0, // 不缓存数据
    refetchOnMount: true, // 组件挂载时重新获取
    refetchOnWindowFocus: true, // 窗口聚焦时重新获取
  })

  // 当数据加载成功时更新表单数据
  useEffect(() => {
    if (settingsData) {
      setFormData(prev => ({ ...prev, ...settingsData }))
    }
  }, [settingsData])

  // 更新系统设置
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSettings>) => apiService.updateSystemSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      toast({
        title: '保存成功',
        description: '系统设置已成功保存',
      })
    },
    onError: (error: any) => {
      toast({
        title: '保存失败',
        description: error.response?.data?.message || '保存系统设置失败',
        variant: 'destructive',
      })
    },
  })



  /**
   * 处理表单字段变化
   */
  const handleFieldChange = (field: keyof SystemSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  /**
   * 保存设置
   */
  const handleSave = () => {
    updateMutation.mutate(formData)
  }



  /**
   * 手动刷新数据
   */
  const handleRefresh = async () => {
    // 清除查询缓存
    queryClient.removeQueries({ queryKey: ['system-settings'] })
    // 重新获取数据
    await refetch()
    toast({
      title: '刷新成功',
      description: '系统设置数据已更新',
    })
  }

  const isLoading_ = isLoading || updateMutation.isPending

  return (
    <div className="w-full max-w-none p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* 页面标题 - Novara风格 */}
          <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl tracking-tight text-white">系统设置</h1>
                <p className="text-sm md:text-base text-white/70 font-medium mt-1">配置和管理系统运行参数</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  //size="lg"
                  onClick={handleRefresh}
                  disabled={isLoading_}
                  className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 lg:h-5 lg:w-5 mr-2 ${isLoading_ ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">刷新</span>
                  <span className="sm:hidden">刷新</span>
                </Button>
                <Button
                  //size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                  onClick={handleSave}
                  disabled={isLoading_}
                >
                  <Save className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                  <span className="hidden sm:inline">{updateMutation.isPending ? '保存中...' : '保存设置'}</span>
                  <span className="sm:hidden">{updateMutation.isPending ? '保存中' : '保存'}</span>
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="glass-card rounded-2xl p-6 animate-[fadeInDown_0.6s_ease-out_0.5s_both]">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-2xl bg-red-500/20 backdrop-blur ring-1 ring-red-500/30">
                  <Server className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">加载失败</h3>
                  <p className="text-sm text-white/70 mt-1">无法加载系统设置，请刷新页面重试</p>
                </div>
              </div>
            </div>
          )}

          {/* 设置选项卡 - Novara深色玻璃拟态风格 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 glass-surface rounded-2xl p-2 border border-white/10 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
              <TabsTrigger
                value="system"
                className="flex items-center gap-2 data-[state=active]:bg-accent/20 backdrop-blur ring-1 ring-accent/30 data-[state=active]:text-accent data-[state=active]:scale-105 transition-all duration-200 text-white/80 hover:text-white"
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">系统</span>
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="flex items-center gap-2 data-[state=active]:bg-accent/20 backdrop-blur ring-1 ring-accent/30 data-[state=active]:text-accent data-[state=active]:scale-105 transition-all duration-200 text-white/80 hover:text-white"
              >
                <Database className="h-4 w-4" />
                <span className="font-medium">数据</span>
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="flex items-center gap-2 data-[state=active]:bg-accent/20 backdrop-blur ring-1 ring-accent/30 data-[state=active]:text-accent data-[state=active]:scale-105 transition-all duration-200 text-white/80 hover:text-white"
              >
                <Server className="h-4 w-4" />
                <span className="font-medium">日志</span>
              </TabsTrigger>
            </TabsList>

            {/* 系统基本设置 - Novara深色玻璃拟态风格 */}
            <TabsContent value="system">
              <div className="glass-card rounded-3xl animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
                <div className="p-6 lg:p-8 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                      <Settings className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl lg:text-2xl font-bold text-white">系统基本设置</h2>
                      <p className="text-sm text-white/60 mt-1">
                        配置系统的基本信息和显示选项
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 lg:p-8 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label htmlFor="system_name" className="text-white font-semibold">系统名称</Label>
                      <Input
                        id="system_name"
                        value={formData.system_name}
                        onChange={(e) => handleFieldChange('system_name', e.target.value)}
                        placeholder="请输入系统名称"
                        disabled={isLoading_}
                        className="h-12 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="timezone" className="text-white font-semibold">时区</Label>
                      <Select
                        value={formData.timezone}
                        onValueChange={(value) => handleFieldChange('timezone', value)}
                        disabled={isLoading_}
                      >
                        <SelectTrigger className="h-12 glass-surface-light border border-white/10 text-white">
                          <SelectValue placeholder="选择时区" />
                        </SelectTrigger>
                        <SelectContent className="glass-surface border border-white/10">
                          <SelectItem value="Asia/Shanghai" className="text-white">中国标准时间 (UTC+8)</SelectItem>
                          <SelectItem value="UTC" className="text-white">协调世界时 (UTC)</SelectItem>
                          <SelectItem value="America/New_York" className="text-white">美国东部时间 (UTC-5)</SelectItem>
                          <SelectItem value="Europe/London" className="text-white">英国时间 (UTC+0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="system_description" className="text-white font-semibold">系统描述</Label>
                    <Textarea
                      id="system_description"
                      value={formData.system_description}
                      onChange={(e) => handleFieldChange('system_description', e.target.value)}
                      placeholder="请输入系统描述"
                      rows={4}
                      disabled={isLoading_}
                      className="text-white placeholder:text-white/50 glass-surface-light border border-white/10"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="language" className="text-white font-semibold">界面语言</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => handleFieldChange('language', value)}
                      disabled={isLoading_}
                    >
                      <SelectTrigger className="h-12 glass-surface-light border border-white/10 text-white lg:w-64">
                        <SelectValue placeholder="选择语言" />
                      </SelectTrigger>
                      <SelectContent className="glass-surface border border-white/10">
                        <SelectItem value="zh-CN" className="text-white">简体中文</SelectItem>
                        <SelectItem value="en-US" className="text-white">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 数据采集设置 - Novara深色玻璃拟态风格 */}
            <TabsContent value="data">
              <div className="glass-card rounded-3xl animate-[fadeInUp_0.6s_ease-out_0.8s_both]">
                <div className="p-6 lg:p-8 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                      <Database className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl lg:text-2xl font-bold text-white">数据采集设置</h2>
                      <p className="text-sm text-white/60 mt-1">
                        配置数据采集频率、存储和连接参数
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 lg:p-8 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label htmlFor="plc_collect_interval" className="text-white font-semibold">PLC采集间隔 (秒)</Label>
                      <Input
                        id="plc_collect_interval"
                        type="number"
                        value={formData.plc_collect_interval}
                        onChange={(e) => handleFieldChange('plc_collect_interval', parseInt(e.target.value) || 5)}
                        placeholder="5"
                        min="1"
                        max="60"
                        disabled={isLoading_}
                        className="h-12 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-white/60">建议值：1-60秒</p>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="plc_connect_timeout" className="text-white font-semibold">PLC连接超时 (毫秒)</Label>
                      <Input
                        id="plc_connect_timeout"
                        type="number"
                        value={formData.plc_connect_timeout}
                        onChange={(e) => handleFieldChange('plc_connect_timeout', parseInt(e.target.value) || 5000)}
                        placeholder="5000"
                        min="1000"
                        max="30000"
                        disabled={isLoading_}
                        className="h-12 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-white/60">PLC设备连接超时时间</p>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="plc_receive_timeout" className="text-white font-semibold">PLC接收超时 (毫秒)</Label>
                      <Input
                        id="plc_receive_timeout"
                        type="number"
                        value={formData.plc_receive_timeout}
                        onChange={(e) => handleFieldChange('plc_receive_timeout', parseInt(e.target.value) || 10000)}
                        placeholder="10000"
                        min="1000"
                        max="60000"
                        disabled={isLoading_}
                        className="h-12 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-white/60">PLC数据接收超时时间</p>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="data_retention_days" className="text-white font-semibold">数据保留天数</Label>
                      <Input
                        id="data_retention_days"
                        type="number"
                        value={formData.data_retention_days}
                        onChange={(e) => handleFieldChange('data_retention_days', parseInt(e.target.value) || 30)}
                        placeholder="30"
                        min="1"
                        max="365"
                        disabled={isLoading_}
                        className="h-12 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-white/60">超过此天数的历史数据将被自动清理</p>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="max_concurrent_connections" className="text-white font-semibold">最大并发连接数</Label>
                      <Input
                        id="max_concurrent_connections"
                        type="number"
                        value={formData.max_concurrent_connections}
                        onChange={(e) => handleFieldChange('max_concurrent_connections', parseInt(e.target.value) || 100)}
                        placeholder="100"
                        min="1"
                        max="1000"
                        disabled={isLoading_}
                        className="h-12 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-white/60">系统最大并发连接数</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>



            {/* 日志设置 - Novara深色玻璃拟态风格 */}
            <TabsContent value="logs">
              <div className="glass-card rounded-3xl animate-[fadeInUp_0.6s_ease-out_0.9s_both]">
                <div className="p-6 lg:p-8 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-purple-500/20 backdrop-blur ring-1 ring-purple-500/30">
                      <Server className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl lg:text-2xl font-bold text-white">日志设置</h2>
                      <p className="text-sm text-white/60 mt-1">
                        配置系统日志级别和保留策略
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 lg:p-8 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label htmlFor="log_level" className="text-white font-semibold">日志级别</Label>
                      <Select
                        value={formData.log_level}
                        onValueChange={(value) => handleFieldChange('log_level', value)}
                        disabled={isLoading_}
                      >
                        <SelectTrigger className="h-12 glass-surface-light border border-white/10 text-white">
                          <SelectValue placeholder="选择日志级别" />
                        </SelectTrigger>
                        <SelectContent className="glass-surface border border-white/10">
                          <SelectItem value="DEBUG" className="text-white">DEBUG - 调试信息</SelectItem>
                          <SelectItem value="INFO" className="text-white">INFO - 一般信息</SelectItem>
                          <SelectItem value="WARNING" className="text-white">WARNING - 警告信息</SelectItem>
                          <SelectItem value="ERROR" className="text-white">ERROR - 错误信息</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="log_retention_days" className="text-white font-semibold">日志保留天数</Label>
                      <Input
                        id="log_retention_days"
                        type="number"
                        value={formData.log_retention_days}
                        onChange={(e) => handleFieldChange('log_retention_days', parseInt(e.target.value) || 7)}
                        placeholder="7"
                        min="1"
                        max="90"
                        disabled={isLoading_}
                        className="h-12 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-white/60">超过此天数的日志将被自动清理</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 rounded-2xl glass-surface-light border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center h-6 w-11 rounded-full bg-white/20 transition-colors duration-200 peer-checked:bg-accent/20 peer-checked:ring-1 peer-checked:ring-accent/30">
                        <div className={`h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${
                          formData.enable_audit_log ? 'translate-x-6 bg-accent' : 'translate-x-1'
                        }`}></div>
                      </div>
                      <div>
                        <Label htmlFor="enable_audit_log" className="text-white font-semibold cursor-pointer">启用审计日志</Label>
                        <p className="text-sm text-white/60 mt-1">记录用户操作和系统变更</p>
                      </div>
                    </div>
                    <Switch
                      id="enable_audit_log"
                      checked={formData.enable_audit_log}
                      onCheckedChange={(checked) => handleFieldChange('enable_audit_log', checked)}
                      disabled={isLoading_}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
  )
}