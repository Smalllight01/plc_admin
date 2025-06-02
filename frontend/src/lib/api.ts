import axios, { AxiosInstance, AxiosResponse } from 'axios'

// API基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    // 从zustand persist storage获取token
    if (typeof window !== 'undefined') {
      try {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const persistedData = JSON.parse(authStorage)
          // zustand persist存储格式: {state: {...}, version: ...}
          const token = persistedData?.state?.token
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
      } catch (error) {
        console.error('获取token失败:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误和token过期
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除认证状态
      if (typeof window !== 'undefined') {
        // 动态导入useAuthStore以避免循环依赖
        import('@/store/auth').then(({ useAuthStore }) => {
          useAuthStore.getState().logout()
        })
        
        // 跳转到登录页
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  total: number
  page: number
  per_page: number
  pages: number
}

// 用户类型
export interface User {
  id: number
  username: string
  email?: string
  role: string  // super_admin/admin/user
  group_id?: number
  group?: Group
  created_at: string
  updated_at: string
}

// 分组类型
export interface Group {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
  device_count?: number  // 分组中的设备数量
  user_count?: number    // 分组中的用户数量
}

// 设备类型
export interface Device {
  id: number
  name: string
  plc_type: string
  protocol: string
  ip_address: string
  port: number
  addresses: string
  group_id: number | null
  group?: Group
  is_active: boolean
  is_connected: boolean
  last_collect_time?: string
  description?: string
  created_at: string
  updated_at: string
  status?: 'online' | 'offline' | 'error' | 'connecting'
}

// 设备状态类型
export interface DeviceStatus {
  device_id: number
  status: 'online' | 'offline' | 'connecting'
  last_collect_time?: string
  error_message?: string
}

// 采集日志类型
export interface CollectLog {
  id: number
  device_id: number
  device?: Device
  status: 'success' | 'error'
  message?: string
  collect_time: string
}

// 实时数据类型
export interface RealtimeData {
  device_id: number
  device_name: string
  address: string
  value: any
  timestamp: string
}

// 历史数据类型
export interface HistoryData {
  time: string
  device_id: number
  address: string
  value: any
}

// 统计数据类型
export interface StatisticsData {
  device_id: number
  device_name: string
  plc_type: string
  time_range: string
  start_time: string
  end_time: string
  statistics: {
    total_points: number
    addresses: {
      [key: string]: {
        count: number
        avg_value: number
        last_time: string
      }
    }
    time_range: {
      start: string
      end: string
    }
  }
}

// 仪表板统计数据类型
export interface DashboardStats {
  total_users: number
  total_groups: number
  total_devices: number
  online_devices: number
  offline_devices: number
  total_data_points: number
  recent_alerts: number
  user_group_name?: string
}

// 登录请求类型
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应类型
export interface LoginResponse {
  token: string
  user: User
}

// 修改密码请求类型
export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

// 创建用户请求类型
export interface CreateUserRequest {
  username: string
  password: string
  email?: string
  full_name?: string
  role: string  // super_admin/admin/user
  group_id?: number
}

// 更新用户请求类型
export interface UpdateUserRequest {
  username?: string
  email?: string
  role?: string  // super_admin/admin/user
  group_id?: number
}

// 创建分组请求类型
export interface CreateGroupRequest {
  name: string
  description?: string
}

// 更新分组请求类型
export interface UpdateGroupRequest {
  name?: string
  description?: string
}

// 创建设备请求类型
export interface CreateDeviceRequest {
  name: string
  plc_type: string
  protocol: string
  ip_address: string
  port: number
  addresses: string
  group_id?: number | null
  is_active?: boolean
  description?: string
}

// 更新设备请求类型
export interface UpdateDeviceRequest {
  name?: string
  plc_type?: string
  protocol?: string
  ip_address?: string
  port?: number
  addresses?: string
  group_id?: number | null
  is_active?: boolean
  description?: string
}

// 数据查询参数类型
export interface DataQueryParams {
  device_id?: number
  group_id?: number
  start_time?: string
  end_time?: string
  address?: string
  limit?: number
}

// 统计查询参数类型
export interface StatisticsQueryParams {
  device_id?: number
  group_id?: number
  time_range?: '10m' | '30m' | '1h' | '24h' | '7d' | '30d'
}

// 分组查询参数类型
export interface GroupQueryParams {
  page?: number
  page_size?: number
  search?: string
}

export { apiClient }
export default apiClient