'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { performanceService } from '@/services/performanceService';
import { deviceService } from '@/services/deviceService';
import { groupService } from '@/services/groupService';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth';

/**
 * 设备性能分析页面组件
 * 提供设备性能监控、分析和趋势展示功能
 */
export default function PerformancePage() {
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // 数据状态
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24');
  const [devices, setDevices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  
  // 自动刷新
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  /**
   * 加载基础数据（设备和分组列表）
   */
  const loadBasicData = async () => {
    try {
      const [devicesRes, groupsRes] = await Promise.all([
        deviceService.getDevices(),
        groupService.getGroups()
      ]);
      
      if (devicesRes && devicesRes.data) {
        setDevices(devicesRes.data || []);
      }
      
      if (groupsRes && groupsRes.data) {
        setGroups(groupsRes.data || []);
      }
    } catch (err) {
      console.error('加载基础数据失败:', err);
    }
  };

  /**
   * 加载性能数据
   */
  const loadPerformanceData = async () => {
    try {
      setError(null);
      
      const params = {
        hours: parseInt(timeRange),
        ...(selectedGroup !== 'all' && { group_id: parseInt(selectedGroup) })
      };
      
      const response = await performanceService.getPerformanceOverview(params);
      
      if (response.success) {
        setPerformanceData(response.data);
      } else {
        setError(response.message || '加载性能数据失败');
      }
    } catch (err: any) {
      console.error('加载性能数据失败:', err);
      setError(err.message || '网络错误，请稍后重试');
    }
  };

  /**
   * 加载趋势数据
   */
  const loadTrendsData = async () => {
    try {
      const params = {
        hours: parseInt(timeRange),
        interval: Math.max(1, Math.floor(parseInt(timeRange) / 24)), // 动态计算间隔
        ...(selectedGroup !== 'all' && { group_id: parseInt(selectedGroup) }),
        ...(selectedDevice !== 'all' && { device_id: parseInt(selectedDevice) })
      };
      
      const response = await performanceService.getPerformanceTrends(params);
      
      if (response.success) {
        setTrends(response.data?.trends || []);
      }
    } catch (err) {
      console.error('加载趋势数据失败:', err);
    }
  };

  /**
   * 刷新所有数据
   */
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPerformanceData(),
        loadTrendsData()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // 认证状态
  const { isAuthenticated, token } = useAuthStore();

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    const initData = async () => {
      // 只有在认证状态下才加载数据
      if (!isAuthenticated || !token) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        await loadBasicData();
        await Promise.all([
          loadPerformanceData(),
          loadTrendsData()
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, [isAuthenticated, token]);
  
  /**
   * 监听筛选条件变化，重新加载数据
   */
  useEffect(() => {
    if (isAuthenticated && token && !loading) {
      refreshData();
    }
  }, [selectedDevice, selectedGroup, timeRange]);
  
  /**
   * 自动刷新定时器
   */
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh && isAuthenticated && token) {
      intervalId = setInterval(() => {
        refreshData();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, isAuthenticated, token]);

  /**
   * 监听筛选条件变化
   */
  useEffect(() => {
    if (!loading && isAuthenticated && token) {
      refreshData();
    }
  }, [selectedGroup, selectedDevice, timeRange, isAuthenticated, token]);

  /**
   * 自动刷新逻辑
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(() => {
        refreshData();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval]);

  /**
   * 获取健康状态颜色和图标
   */
  const getHealthStatus = (score: number) => {
    if (score >= 80) {
      return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: '健康' };
    } else if (score >= 60) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, label: '警告' };
    } else {
      return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: '严重' };
    }
  };

  /**
   * 格式化趋势数据用于图表显示
   */
  const formatTrendsForChart = () => {
    if (!trends || trends.length === 0) return [];
    
    // 按时间戳分组数据
    const groupedData = trends.reduce((acc: any, item: any) => {
      const timestamp = new Date(item.timestamp).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      if (!acc[timestamp]) {
        acc[timestamp] = {
          timestamp,
          uptime: [],
          response_time: [],
          collection_rate: [],
          data_quality: []
        };
      }
      
      acc[timestamp].uptime.push(item.uptime);
      acc[timestamp].response_time.push(item.response_time);
      acc[timestamp].collection_rate.push(item.collection_rate);
      acc[timestamp].data_quality.push(item.data_quality);
      
      return acc;
    }, {});
    
    // 计算平均值
    return Object.values(groupedData).map((group: any) => ({
      timestamp: group.timestamp,
      uptime: group.uptime.reduce((a: number, b: number) => a + b, 0) / group.uptime.length,
      response_time: group.response_time.reduce((a: number, b: number) => a + b, 0) / group.response_time.length,
      collection_rate: group.collection_rate.reduce((a: number, b: number) => a + b, 0) / group.collection_rate.length,
      data_quality: group.data_quality.reduce((a: number, b: number) => a + b, 0) / group.data_quality.length
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载性能数据中...</span>
      </div>
    );
  }

  const summary = performanceData?.summary || {};
  const devices_data = performanceData?.devices || [];
  const chartData = formatTrendsForChart();

  return (
    <AuthGuard>
      <div className="space-y-6">
      {/* 页面标题和控制栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">设备性能分析</h1>
          <p className="text-muted-foreground">
            监控和分析PLC设备的连接性能、数据采集质量和运行状态
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* 时间范围选择 */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1小时</SelectItem>
              <SelectItem value="6">6小时</SelectItem>
              <SelectItem value="24">24小时</SelectItem>
              <SelectItem value="72">3天</SelectItem>
              <SelectItem value="168">7天</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 分组筛选 */}
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择分组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分组</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 设备筛选 */}
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择设备" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部设备</SelectItem>
              {devices
                .filter(device => selectedGroup === 'all' || device.group_id.toString() === selectedGroup)
                .map((device) => (
                <SelectItem key={device.id} value={device.id.toString()}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 刷新按钮 */}
          <Button 
            onClick={refreshData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            <span className="ml-1">刷新</span>
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 性能概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">设备总数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_devices || 0}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span className="text-green-600">健康: {summary.healthy_devices || 0}</span>
              <span className="text-yellow-600">警告: {summary.warning_devices || 0}</span>
              <span className="text-red-600">严重: {summary.critical_devices || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均正常运行时间</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avg_uptime?.toFixed(1) || 0}%</div>
            <Progress value={summary.avg_uptime || 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avg_response_time?.toFixed(0) || 0}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.avg_response_time <= 200 ? '响应良好' : 
               summary.avg_response_time <= 500 ? '响应一般' : '响应较慢'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均采集成功率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avg_collection_rate?.toFixed(1) || 0}%</div>
            <Progress value={summary.avg_collection_rate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">性能概览</TabsTrigger>
          <TabsTrigger value="trends">趋势分析</TabsTrigger>
          <TabsTrigger value="devices">设备详情</TabsTrigger>
        </TabsList>
        
        {/* 性能概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 最佳性能设备 */}
            <Card>
              <CardHeader>
                <CardTitle>性能最佳设备</CardTitle>
                <CardDescription>健康分数排名前5的设备</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.top_performers?.slice(0, 5).map((device: any, index: number) => {
                    const status = getHealthStatus(device.health_score);
                    return (
                      <div key={device.device_id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full ${status.bg} flex items-center justify-center`}>
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{device.device_name}</p>
                            <p className="text-sm text-muted-foreground">ID: {device.device_id}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={status.color}>
                          {device.health_score.toFixed(1)}分
                        </Badge>
                      </div>
                    );
                  }) || (
                    <p className="text-center text-muted-foreground py-4">暂无数据</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* 需要关注的设备 */}
            <Card>
              <CardHeader>
                <CardTitle>需要关注的设备</CardTitle>
                <CardDescription>性能较差或存在问题的设备</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.poor_performers?.slice(0, 5).map((device: any) => {
                    const status = getHealthStatus(device.health_score);
                    const StatusIcon = status.icon;
                    return (
                      <div key={device.device_id} className="flex items-center justify-between p-3 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`h-5 w-5 ${status.color}`} />
                          <div>
                            <p className="font-medium">{device.device_name}</p>
                            <p className="text-sm text-muted-foreground">ID: {device.device_id}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={status.color}>
                          {device.health_score.toFixed(1)}分
                        </Badge>
                      </div>
                    );
                  }) || (
                    <p className="text-center text-muted-foreground py-4">所有设备运行正常</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* 趋势分析标签页 */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 连接正常运行时间趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>连接正常运行时间趋势</CardTitle>
                <CardDescription>设备连接稳定性变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, '正常运行时间']} />
                    <Line 
                      type="monotone" 
                      dataKey="uptime" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* 响应时间趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>响应时间趋势</CardTitle>
                <CardDescription>设备响应速度变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(0)}ms`, '响应时间']} />
                    <Line 
                      type="monotone" 
                      dataKey="response_time" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* 数据采集成功率趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>数据采集成功率趋势</CardTitle>
                <CardDescription>数据采集质量变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, '采集成功率']} />
                    <Line 
                      type="monotone" 
                      dataKey="collection_rate" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* 数据质量趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>数据质量趋势</CardTitle>
                <CardDescription>数据完整性和准确性变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, '数据质量']} />
                    <Line 
                      type="monotone" 
                      dataKey="data_quality" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* 设备详情标签页 */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>设备性能详情</CardTitle>
              <CardDescription>所有设备的详细性能指标</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices_data.map((device: any) => {
                  const healthScore = (
                    device.connection_uptime * 0.3 +
                    device.data_collection_rate * 0.25 +
                    device.data_completeness * 0.2 +
                    Math.max(0, 100 - device.avg_response_time / 10) * 0.15 +
                    Math.max(0, 100 - device.data_anomalies * 5) * 0.1
                  );
                  const status = getHealthStatus(healthScore);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={device.device_id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`h-5 w-5 ${status.color}`} />
                          <div>
                            <h3 className="font-medium">{device.device_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {device.device_type} - {device.ip_address} - {device.group_name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={status.color}>
                          {status.label} ({healthScore.toFixed(1)}分)
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">连接正常运行时间</p>
                          <p className="font-medium">{device.connection_uptime?.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">平均响应时间</p>
                          <p className="font-medium">{device.avg_response_time?.toFixed(0)}ms</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">数据采集成功率</p>
                          <p className="font-medium">{device.data_collection_rate?.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">数据完整性</p>
                          <p className="font-medium">{device.data_completeness?.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">成功采集次数</p>
                          <p className="font-medium">{device.successful_collections}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">失败采集次数</p>
                          <p className="font-medium">{device.failed_collections}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">数据异常数量</p>
                          <p className="font-medium">{device.data_anomalies}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">数据缺失次数</p>
                          <p className="font-medium">{device.data_gaps}</p>
                        </div>
                      </div>
                      
                      {device.last_collect_time && (
                        <p className="text-xs text-muted-foreground">
                          最后采集时间: {new Date(device.last_collect_time).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  );
                })}
                
                {devices_data.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">暂无设备数据</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AuthGuard>
  );
}