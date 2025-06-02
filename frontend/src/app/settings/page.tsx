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
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
import { apiService } from '@/services/api'
import {
  Settings,
  Database,
  Bell,
  Shield,
  Clock,
  Mail,
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
  
  // 数据采集设置
  collection_interval: number
  data_retention_days: number
  max_concurrent_connections: number
  connection_timeout: number
  
  // 告警设置
  enable_email_alerts: boolean
  email_smtp_server: string
  email_smtp_port: number
  email_username: string
  email_password: string
  email_from: string
  
  // 安全设置
  session_timeout: number
  password_min_length: number
  password_require_special: boolean
  max_login_attempts: number
  
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
    collection_interval: 5000,
    data_retention_days: 30,
    max_concurrent_connections: 100,
    connection_timeout: 10000,
    enable_email_alerts: false,
    email_smtp_server: '',
    email_smtp_port: 587,
    email_username: '',
    email_password: '',
    email_from: '',
    session_timeout: 3600,
    password_min_length: 8,
    password_require_special: true,
    max_login_attempts: 5,
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
    cacheTime: 0, // 不缓存数据
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

  // 测试邮件配置
  const testEmailMutation = useMutation({
    mutationFn: () => apiService.testEmailSettings(),
    onSuccess: () => {
      toast({
        title: '测试成功',
        description: '邮件配置测试通过，测试邮件已发送',
      })
    },
    onError: (error: any) => {
      toast({
        title: '测试失败',
        description: error.response?.data?.message || '邮件配置测试失败',
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
   * 测试邮件配置
   */
  const handleTestEmail = () => {
    testEmailMutation.mutate()
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
    <AuthGuard requireSuperAdmin>
      <MainLayout>
        <div className="w-full px-6 py-8">
          {/* 页面标题 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
                  <p className="text-blue-600 mt-1 font-medium">配置和管理系统参数</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading_}
                  className="bg-white hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading_ ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading_}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? '保存中...' : '保存设置'}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Card className="border-0 shadow-sm bg-red-50/80 backdrop-blur-sm mb-6">
              <CardContent className="pt-6">
                <p className="text-red-600">加载系统设置失败，请刷新页面重试</p>
              </CardContent>
            </Card>
          )}

          {/* 设置选项卡 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border-0 shadow-sm rounded-xl p-2">
              <TabsTrigger value="system" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-200">
                <Settings className="h-4 w-4" />
                <span>系统</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-200">
                <Database className="h-4 w-4" />
                <span>数据</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-200">
                <Bell className="h-4 w-4" />
                <span>告警</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-200">
                <Shield className="h-4 w-4" />
                <span>安全</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-200">
                <Server className="h-4 w-4" />
                <span>日志</span>
              </TabsTrigger>
            </TabsList>

            {/* 系统基本设置 */}
            <TabsContent value="system">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Settings className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-gray-800">系统基本设置</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    配置系统的基本信息和显示选项
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="system_name">系统名称</Label>
                      <Input
                        id="system_name"
                        value={formData.system_name}
                        onChange={(e) => handleFieldChange('system_name', e.target.value)}
                        placeholder="请输入系统名称"
                        disabled={isLoading_}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="timezone">时区</Label>
                      <Select
                        value={formData.timezone}
                        onValueChange={(value) => handleFieldChange('timezone', value)}
                        disabled={isLoading_}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择时区" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Shanghai">中国标准时间 (UTC+8)</SelectItem>
                          <SelectItem value="UTC">协调世界时 (UTC)</SelectItem>
                          <SelectItem value="America/New_York">美国东部时间 (UTC-5)</SelectItem>
                          <SelectItem value="Europe/London">英国时间 (UTC+0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="system_description">系统描述</Label>
                    <Textarea
                      id="system_description"
                      value={formData.system_description}
                      onChange={(e) => handleFieldChange('system_description', e.target.value)}
                      placeholder="请输入系统描述"
                      rows={3}
                      disabled={isLoading_}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">界面语言</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => handleFieldChange('language', value)}
                      disabled={isLoading_}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="选择语言" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh-CN">简体中文</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 数据采集设置 */}
            <TabsContent value="data">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Database className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-gray-800">数据采集设置</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    配置数据采集频率、存储和连接参数
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="collection_interval">采集间隔 (毫秒)</Label>
                      <Input
                        id="collection_interval"
                        type="number"
                        value={formData.collection_interval}
                        onChange={(e) => handleFieldChange('collection_interval', parseInt(e.target.value) || 5000)}
                        placeholder="5000"
                        min="1000"
                        max="60000"
                        disabled={isLoading_}
                      />
                      <p className="text-sm text-gray-500">建议值：1000-60000毫秒</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="data_retention_days">数据保留天数</Label>
                      <Input
                        id="data_retention_days"
                        type="number"
                        value={formData.data_retention_days}
                        onChange={(e) => handleFieldChange('data_retention_days', parseInt(e.target.value) || 30)}
                        placeholder="30"
                        min="1"
                        max="365"
                        disabled={isLoading_}
                      />
                      <p className="text-sm text-gray-500">超过此天数的历史数据将被自动清理</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max_concurrent_connections">最大并发连接数</Label>
                      <Input
                        id="max_concurrent_connections"
                        type="number"
                        value={formData.max_concurrent_connections}
                        onChange={(e) => handleFieldChange('max_concurrent_connections', parseInt(e.target.value) || 100)}
                        placeholder="100"
                        min="1"
                        max="1000"
                        disabled={isLoading_}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="connection_timeout">连接超时 (毫秒)</Label>
                      <Input
                        id="connection_timeout"
                        type="number"
                        value={formData.connection_timeout}
                        onChange={(e) => handleFieldChange('connection_timeout', parseInt(e.target.value) || 10000)}
                        placeholder="10000"
                        min="1000"
                        max="60000"
                        disabled={isLoading_}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 告警设置 */}
            <TabsContent value="alerts">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Bell className="h-5 w-5 text-orange-600" />
                    </div>
                    <span className="text-gray-800">告警设置</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    配置邮件告警和通知参数
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enable_email_alerts"
                      checked={formData.enable_email_alerts}
                      onCheckedChange={(checked) => handleFieldChange('enable_email_alerts', checked)}
                      disabled={isLoading_}
                    />
                    <Label htmlFor="enable_email_alerts">启用邮件告警</Label>
                  </div>
                  
                  {formData.enable_email_alerts && (
                    <div className="space-y-6 pl-6 border-l-2 border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="email_smtp_server">SMTP服务器</Label>
                          <Input
                            id="email_smtp_server"
                            value={formData.email_smtp_server}
                            onChange={(e) => handleFieldChange('email_smtp_server', e.target.value)}
                            placeholder="smtp.example.com"
                            disabled={isLoading_}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email_smtp_port">SMTP端口</Label>
                          <Input
                            id="email_smtp_port"
                            type="number"
                            value={formData.email_smtp_port}
                            onChange={(e) => handleFieldChange('email_smtp_port', parseInt(e.target.value) || 587)}
                            placeholder="587"
                            min="1"
                            max="65535"
                            disabled={isLoading_}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email_username">用户名</Label>
                          <Input
                            id="email_username"
                            value={formData.email_username}
                            onChange={(e) => handleFieldChange('email_username', e.target.value)}
                            placeholder="username@example.com"
                            disabled={isLoading_}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email_password">密码</Label>
                          <Input
                            id="email_password"
                            type="password"
                            value={formData.email_password}
                            onChange={(e) => handleFieldChange('email_password', e.target.value)}
                            placeholder="请输入邮箱密码"
                            disabled={isLoading_}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email_from">发件人地址</Label>
                        <Input
                          id="email_from"
                          value={formData.email_from}
                          onChange={(e) => handleFieldChange('email_from', e.target.value)}
                          placeholder="noreply@example.com"
                          disabled={isLoading_}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={handleTestEmail}
                          disabled={testEmailMutation.isPending || isLoading_}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 transition-all duration-200"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {testEmailMutation.isPending ? '测试中...' : '测试邮件配置'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 安全设置 */}
            <TabsContent value="security">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-gray-800">安全设置</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    配置用户认证和密码策略
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="session_timeout">会话超时 (秒)</Label>
                      <Input
                        id="session_timeout"
                        type="number"
                        value={formData.session_timeout}
                        onChange={(e) => handleFieldChange('session_timeout', parseInt(e.target.value) || 3600)}
                        placeholder="3600"
                        min="300"
                        max="86400"
                        disabled={isLoading_}
                      />
                      <p className="text-sm text-gray-500">用户无操作后自动登出的时间</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max_login_attempts">最大登录尝试次数</Label>
                      <Input
                        id="max_login_attempts"
                        type="number"
                        value={formData.max_login_attempts}
                        onChange={(e) => handleFieldChange('max_login_attempts', parseInt(e.target.value) || 5)}
                        placeholder="5"
                        min="3"
                        max="10"
                        disabled={isLoading_}
                      />
                      <p className="text-sm text-gray-500">超过次数后账户将被锁定</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password_min_length">密码最小长度</Label>
                      <Input
                        id="password_min_length"
                        type="number"
                        value={formData.password_min_length}
                        onChange={(e) => handleFieldChange('password_min_length', parseInt(e.target.value) || 8)}
                        placeholder="8"
                        min="6"
                        max="32"
                        disabled={isLoading_}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="password_require_special"
                      checked={formData.password_require_special}
                      onCheckedChange={(checked) => handleFieldChange('password_require_special', checked)}
                      disabled={isLoading_}
                    />
                    <Label htmlFor="password_require_special">密码必须包含特殊字符</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 日志设置 */}
            <TabsContent value="logs">
              <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Server className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-gray-800">日志设置</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    配置系统日志级别和保留策略
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="log_level">日志级别</Label>
                      <Select
                        value={formData.log_level}
                        onValueChange={(value) => handleFieldChange('log_level', value)}
                        disabled={isLoading_}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择日志级别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEBUG">DEBUG - 调试信息</SelectItem>
                          <SelectItem value="INFO">INFO - 一般信息</SelectItem>
                          <SelectItem value="WARNING">WARNING - 警告信息</SelectItem>
                          <SelectItem value="ERROR">ERROR - 错误信息</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="log_retention_days">日志保留天数</Label>
                      <Input
                        id="log_retention_days"
                        type="number"
                        value={formData.log_retention_days}
                        onChange={(e) => handleFieldChange('log_retention_days', parseInt(e.target.value) || 7)}
                        placeholder="7"
                        min="1"
                        max="90"
                        disabled={isLoading_}
                      />
                      <p className="text-sm text-gray-500">超过此天数的日志将被自动清理</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enable_audit_log"
                      checked={formData.enable_audit_log}
                      onCheckedChange={(checked) => handleFieldChange('enable_audit_log', checked)}
                      disabled={isLoading_}
                    />
                    <Label htmlFor="enable_audit_log">启用审计日志</Label>
                    <p className="text-sm text-gray-500 ml-2">记录用户操作和系统变更</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}