/**
 * 设备性能分析服务
 * 提供设备性能数据的API调用功能
 */

import { apiClient } from '@/lib/api';

export interface PerformanceOverviewParams {
  group_id?: number;
  hours?: number;
}

export interface PerformanceTrendsParams {
  device_id?: number;
  group_id?: number;
  hours?: number;
  interval?: number;
}

export interface DevicePerformanceParams {
  hours?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code?: string;
}

export interface PerformanceSummary {
  total_devices: number;
  healthy_devices: number;
  warning_devices: number;
  critical_devices: number;
  avg_uptime: number;
  avg_response_time: number;
  avg_collection_rate: number;
  top_performers: Array<{
    device_id: number;
    device_name: string;
    health_score: number;
  }>;
  poor_performers: Array<{
    device_id: number;
    device_name: string;
    health_score: number;
  }>;
}

export interface DevicePerformanceMetrics {
  device_id: number;
  device_name: string;
  device_type: string;
  ip_address: string;
  group_name: string;
  connection_uptime: number;
  connection_failures: number;
  avg_response_time: number;
  data_collection_rate: number;
  total_data_points: number;
  successful_collections: number;
  failed_collections: number;
  data_completeness: number;
  data_anomalies: number;
  data_gaps: number;
  last_collect_time?: string;
  analysis_period: string;
}

export interface PerformanceOverviewData {
  summary: PerformanceSummary;
  devices: DevicePerformanceMetrics[];
  analysis_period: string;
  analysis_time: string;
}

export interface PerformanceTrend {
  timestamp: string;
  uptime: number;
  response_time: number;
  collection_rate: number;
  data_quality: number;
  device_id?: number;
  device_name?: string;
}

export interface DevicePerformanceDetail {
  device_performance: DevicePerformanceMetrics;
  trends: PerformanceTrend[];
  health_score: number;
  recommendations: string[];
}

class PerformanceService {
  /**
   * 获取设备性能概览
   */
  async getPerformanceOverview(params: PerformanceOverviewParams = {}): Promise<ApiResponse<PerformanceOverviewData>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.group_id) {
        queryParams.append('group_id', params.group_id.toString());
      }
      
      if (params.hours) {
        queryParams.append('hours', params.hours.toString());
      }
      
      const url = `/api/performance/overview${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      
      return response.data;
    } catch (error: any) {
      console.error('获取性能概览失败:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          message: error.response.data.detail?.error || error.response.data.message || '获取性能概览失败',
          code: error.response.data.detail?.code || 'API_ERROR'
        };
      }
      
      return {
        success: false,
        message: error.message || '网络错误，请稍后重试',
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * 获取单个设备的详细性能分析
   */
  async getDevicePerformance(deviceId: number, params: DevicePerformanceParams = {}): Promise<ApiResponse<DevicePerformanceDetail>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.hours) {
        queryParams.append('hours', params.hours.toString());
      }
      
      const url = `/api/performance/device/${deviceId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      
      return response.data;
    } catch (error: any) {
      console.error('获取设备性能分析失败:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          message: error.response.data.detail?.error || error.response.data.message || '获取设备性能分析失败',
          code: error.response.data.detail?.code || 'API_ERROR'
        };
      }
      
      return {
        success: false,
        message: error.message || '网络错误，请稍后重试',
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * 获取性能趋势数据
   */
  async getPerformanceTrends(params: PerformanceTrendsParams = {}): Promise<ApiResponse<{ trends: PerformanceTrend[] }>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.device_id) {
        queryParams.append('device_id', params.device_id.toString());
      }
      
      if (params.group_id) {
        queryParams.append('group_id', params.group_id.toString());
      }
      
      if (params.hours) {
        queryParams.append('hours', params.hours.toString());
      }
      
      if (params.interval) {
        queryParams.append('interval', params.interval.toString());
      }
      
      const url = `/api/performance/trends${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      
      return response.data;
    } catch (error: any) {
      console.error('获取性能趋势数据失败:', error);
      
      let errorMessage = '获取性能趋势数据失败';
      let errorCode = 'API_ERROR';
      
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = '网络连接失败，请检查后端服务是否正常运行';
        errorCode = 'NETWORK_ERROR';
      } else if (error.response?.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试';
        errorCode = 'SERVER_ERROR';
      } else if (error.response?.data) {
        errorMessage = error.response.data.detail?.error || error.response.data.message || '获取性能趋势数据失败';
        errorCode = error.response.data.detail?.code || 'API_ERROR';
      } else if (error.message) {
        errorMessage = error.message;
        errorCode = 'NETWORK_ERROR';
      }
      
      return {
        success: false,
        message: errorMessage,
        code: errorCode
      };
    }
  }

  /**
   * 计算设备健康分数
   */
  calculateHealthScore(metrics: Partial<DevicePerformanceMetrics>): number {
    const weights = {
      connection_uptime: 0.3,
      data_collection_rate: 0.25,
      data_completeness: 0.2,
      response_time: 0.15,
      anomalies: 0.1
    };
    
    const uptime_score = metrics.connection_uptime || 0;
    const collection_score = metrics.data_collection_rate || 0;
    const completeness_score = metrics.data_completeness || 0;
    
    // 响应时间分数（响应时间越低分数越高）
    const response_time = metrics.avg_response_time || 1000;
    const response_score = Math.max(0, 100 - (response_time / 10));
    
    // 异常分数（异常越少分数越高）
    const anomalies = metrics.data_anomalies || 0;
    const anomaly_score = Math.max(0, 100 - (anomalies * 5));
    
    // 计算加权总分
    const health_score = (
      uptime_score * weights.connection_uptime +
      collection_score * weights.data_collection_rate +
      completeness_score * weights.data_completeness +
      response_score * weights.response_time +
      anomaly_score * weights.anomalies
    );
    
    return Math.round(health_score * 100) / 100;
  }

  /**
   * 获取健康状态信息
   */
  getHealthStatus(score: number): {
    level: 'healthy' | 'warning' | 'critical';
    label: string;
    color: string;
    bgColor: string;
  } {
    if (score >= 80) {
      return {
        level: 'healthy',
        label: '健康',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    } else if (score >= 60) {
      return {
        level: 'warning',
        label: '警告',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      };
    } else {
      return {
        level: 'critical',
        label: '严重',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      };
    }
  }

  /**
   * 格式化性能指标显示
   */
  formatMetric(value: number, type: 'percentage' | 'time' | 'count'): string {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${value.toFixed(0)}ms`;
      case 'count':
        return value.toString();
      default:
        return value.toString();
    }
  }

  /**
   * 生成性能报告摘要
   */
  generatePerformanceSummary(data: PerformanceOverviewData): string {
    const { summary } = data;
    const totalDevices = summary.total_devices;
    const healthyRate = totalDevices > 0 ? (summary.healthy_devices / totalDevices * 100) : 0;
    
    let summaryText = `共监控 ${totalDevices} 台设备，`;
    
    if (healthyRate >= 80) {
      summaryText += '整体运行状态良好。';
    } else if (healthyRate >= 60) {
      summaryText += '部分设备需要关注。';
    } else {
      summaryText += '多台设备存在问题，需要紧急处理。';
    }
    
    summaryText += `平均正常运行时间 ${summary.avg_uptime.toFixed(1)}%，`;
    summaryText += `平均响应时间 ${summary.avg_response_time.toFixed(0)}ms，`;
    summaryText += `平均采集成功率 ${summary.avg_collection_rate.toFixed(1)}%。`;
    
    return summaryText;
  }
}

export const performanceService = new PerformanceService();
export default performanceService;