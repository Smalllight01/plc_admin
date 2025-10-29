import {
  apiClient,
  ApiResponse,
  PaginatedResponse,
  User,
  Group,
  Device,
  DeviceStatus,
  CollectLog,
  RealtimeData,
  HistoryData,
  StatisticsData,
  DashboardStats,
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  DataQueryParams,
  StatisticsQueryParams,
  GroupQueryParams,
} from '@/lib/api'

/**
 * 认证相关API服务
 */
export const authService = {
  /**
   * 用户登录
   * @param credentials 登录凭据
   * @returns 登录响应
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', credentials)
    console.log(response)
    return response.data.data!
  },

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout')
  },

  /**
   * 获取当前用户信息
   * @returns 用户信息
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/api/auth/me')
    return response.data.data!
  },

  /**
   * 修改密码
   * @param data 密码修改数据
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/api/auth/change-password', data)
  },
}

/**
 * 用户管理API服务
 */
export const userService = {
  /**
   * 获取用户列表
   * @param params 查询参数对象
   * @returns 用户列表
   */
  async getUsers(params: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
  } = {}): Promise<PaginatedResponse<User>> {
    const { page = 1, page_size = 10, search, role } = params;
    
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', page_size.toString());
    
    if (search) {
      queryParams.append('search', search);
    }
    
    if (role) {
      queryParams.append('role', role);
    }
    
    const response = await apiClient.get<ApiResponse<{users: User[], total: number, page: number, per_page: number}>>(
      `/api/users?${queryParams.toString()}`
    )
    const backendData = response.data.data!
    // 转换后端数据格式为前端期望的 PaginatedResponse 格式
    return {
      data: backendData.users,
      total: backendData.total,
      page: backendData.page,
      per_page: backendData.per_page,
      pages: Math.ceil(backendData.total / backendData.per_page)
    }
  },

  /**
   * 获取单个用户信息
   * @param id 用户ID
   * @returns 用户信息
   */
  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/api/users/${id}`)
    return response.data.data!
  },

  /**
   * 创建用户
   * @param data 用户数据
   * @returns 创建的用户
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/api/users', data)
    return response.data.data!
  },

  /**
   * 更新用户
   * @param id 用户ID
   * @param data 更新数据
   * @returns 更新后的用户
   */
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data)
    return response.data.data!
  },

  /**
   * 删除用户
   * @param id 用户ID
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/api/users/${id}`)
  },

  /**
   * 重置用户密码
   * @param id 用户ID
   * @param newPassword 新密码
   */
  async resetPassword(id: number, newPassword: string): Promise<void> {
    await apiClient.post(`/api/users/${id}/reset-password`, { new_password: newPassword })
  },
}

/**
 * 分组管理API服务
 */
export const groupService = {
  /**
   * 获取分组列表
   * @param params 查询参数
   * @returns 分组列表
   */
  async getGroups(params?: GroupQueryParams): Promise<PaginatedResponse<Group>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Group>>>('/api/groups', {
      params
    })
    return response.data.data!
  },

  /**
   * 获取单个分组信息
   * @param id 分组ID
   * @returns 分组信息
   */
  async getGroup(id: number): Promise<Group> {
    const response = await apiClient.get<ApiResponse<Group>>(`/api/groups/${id}`)
    return response.data.data!
  },

  /**
   * 创建分组
   * @param data 分组数据
   * @returns 创建的分组
   */
  async createGroup(data: CreateGroupRequest): Promise<Group> {
    const response = await apiClient.post<ApiResponse<Group>>('/api/groups', data)
    return response.data.data!
  },

  /**
   * 更新分组
   * @param id 分组ID
   * @param data 更新数据
   * @returns 更新后的分组
   */
  async updateGroup(id: number, data: UpdateGroupRequest): Promise<Group> {
    const response = await apiClient.put<ApiResponse<Group>>(`/api/groups/${id}`, data)
    return response.data.data!
  },

  /**
   * 删除分组
   * @param id 分组ID
   */
  async deleteGroup(id: number): Promise<void> {
    await apiClient.delete(`/api/groups/${id}`)
  },
}

/**
 * 设备管理API服务
 */
export const deviceService = {
  /**
   * 获取设备列表
   * @param options 查询选项
   * @returns 设备列表
   */
  async getDevices(options: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    group_id?: number;
  } = {}): Promise<PaginatedResponse<Device>> {
    try {
      const { page = 1, page_size = 10, search, status, group_id } = options;
      let url = `/api/devices?page=${page}&page_size=${page_size}`
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }
      if (status) {
        url += `&status=${status}`
      }
      if (group_id) {
        url += `&group_id=${group_id}`
      }
      const response = await apiClient.get<any>(url)
      // 转换后端响应格式到前端期望的格式
      const backendData = response.data
      return {
        data: backendData.devices || [],
        total: backendData.total || 0,
        page: backendData.page || 1,
        per_page: backendData.page_size || page_size,
        pages: backendData.total_pages || 0
      }
    } catch (error) {
      console.error('获取设备列表失败:', error)
      return { data: [], total: 0, page: 1, per_page: 10, pages: 0 }
    }
  },

  /**
   * 获取单个设备信息
   * @param id 设备ID
   * @returns 设备信息
   */
  async getDevice(id: number): Promise<Device> {
    const response = await apiClient.get<ApiResponse<Device>>(`/api/devices/${id}`)
    return response.data.data!
  },

  /**
   * 创建设备
   * @param data 设备数据
   * @returns 创建的设备
   */
  async createDevice(data: CreateDeviceRequest): Promise<Device> {
    // 转换前端字段名到后端期望的字段名
    const backendData = {
      name: data.name,
      plc_type: data.plc_type,
      protocol: data.protocol,
      ip_address: data.ip_address, // 修正字段名
      port: data.port,
      addresses: typeof data.addresses === 'string' ? JSON.parse(data.addresses) : data.addresses, // 确保发送数组而不是JSON字符串
      group_id: data.group_id || 1, // 如果没有选择分组，默认使用分组1
      description: data.description || '',
      is_active: data.is_active !== undefined ? data.is_active : true
    }
    const response = await apiClient.post<ApiResponse<Device>>('/api/devices', backendData)
    return response.data.data!
  },

  /**
   * 更新设备
   * @param id 设备ID
   * @param data 更新数据
   * @returns 更新后的设备
   */
  async updateDevice(id: number, data: UpdateDeviceRequest): Promise<Device> {
    // 处理addresses字段，确保发送数组格式
    const backendData = {
      ...data,
      addresses: data.addresses && typeof data.addresses === 'string' ? JSON.parse(data.addresses) : data.addresses
    }
    const response = await apiClient.put<ApiResponse<Device>>(`/api/devices/${id}`, backendData)
    return response.data.data!
  },

  /**
   * 删除设备
   * @param id 设备ID
   */
  async deleteDevice(id: number): Promise<void> {
    await apiClient.delete(`/api/devices/${id}`)
  },

  /**
   * 获取设备状态
   * @param id 设备ID
   * @returns 设备状态
   */
  async getDeviceStatus(id: number): Promise<DeviceStatus> {
    const response = await apiClient.get<ApiResponse<DeviceStatus>>(`/api/devices/${id}/status`)
    return response.data.data!
  },

  /**
   * 获取设备采集日志
   * @param id 设备ID
   * @param page 页码
   * @param perPage 每页数量
   * @returns 采集日志列表
   */
  async getDeviceLogs(
    id: number, 
    page: number = 1, 
    perPage: number = 10
  ): Promise<PaginatedResponse<CollectLog>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<CollectLog>>>(
      `/api/devices/${id}/logs?page=${page}&per_page=${perPage}`
    )
    return response.data.data!
  },

  /**
   * 获取设备采集地址列表
   * @param id 设备ID
   * @returns 采集地址列表
   */
  async getDeviceAddresses(id: number): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>(`/api/data/addresses/${id}`)
    return response.data.data!
  },

  /**
   * 获取所有设备状态
   * @returns 所有设备状态信息
   */
  async getAllDeviceStatus(): Promise<Record<number, any>> {
    const response = await apiClient.get<ApiResponse<Record<number, any>>>('/api/devices/status')
    return response.data.data!
  },

  /**
   * 获取协议库信息
   * @returns 协议库状态信息
   */
  async getProtocolInfo(): Promise<{
    modbus_available: boolean
    omron_available: boolean
    siemens_available: boolean
    supported_protocols: string[]
    total_protocols: number
  }> {
    const response = await apiClient.get<ApiResponse<{
      modbus_available: boolean
      omron_available: boolean
      siemens_available: boolean
      supported_protocols: string[]
      total_protocols: number
    }>>('/api/devices/protocol-info')
    return response.data.data!
  },
}

/**
 * 数据查询API服务
 */
export const dataService = {
  /**
   * 获取数据点列表
   * @param params 查询参数
   * @returns 数据点列表
   */
  async getDataPoints(params: {
    page?: number;
    page_size?: number;
    search?: string;
    device_id?: number;
    group_id?: number;
  } = {}): Promise<any> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/data/points?${searchParams.toString()}`
    )
    return response.data.data!
  },

  /**
   * 获取实时数据
   * @param params 查询参数
   * @returns 实时数据列表
   */
  async getRealtimeData(params: DataQueryParams = {}): Promise<any> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    
    const response = await apiClient.get<ApiResponse<any>>(
      `/api/data/realtime?${searchParams.toString()}`
    )
    console.log(response.data.data)
    return response.data.data!
  },

  /**
   * 获取历史数据
   * @param params 查询参数
   * @returns 历史数据列表
   */
  async getHistoryData(params: DataQueryParams): Promise<HistoryData[]> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    
    const response = await apiClient.get<ApiResponse<HistoryData[]>>(
      `/api/data/history?${searchParams.toString()}`
    )
    return response.data.data!
  },

  /**
   * 获取统计数据
   * @param params 查询参数
   * @returns 统计数据列表
   */
  async getStatistics(params: StatisticsQueryParams = {}): Promise<StatisticsData[]> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    
    const response = await apiClient.get(
      `/api/data/statistics?${searchParams.toString()}`
    )
    
    // 后端返回格式: {statistics: [...], timestamp: ...}
    // 提取 statistics 数组
    const data = response.data
    if (data && data.statistics && Array.isArray(data.statistics)) {
      return data.statistics
    }
    
    // 如果没有 statistics 字段或不是数组，返回空数组
    return []
  },

  /**
   * 获取异常分析数据
   * @param params 查询参数
   * @returns 异常分析数据
   */
  async getAnomalies(params: {
    device_id?: number;
    group_id?: number;
    time_range?: string;
  } = {}): Promise<any> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    
    const response = await apiClient.get(
      `/api/data/anomalies?${searchParams.toString()}`
    )
    
    return response.data
  },
}

/**
 * 健康检查API服务
 */
export const healthService = {
  /**
   * 检查服务健康状态
   * @returns 健康状态信息
   */
  async checkHealth(): Promise<any> {
    const response = await apiClient.get('/health')
    return response.data
  },
}

/**
 * 系统设置API服务
 */
export const settingsService = {
  /**
   * 获取系统设置
   * @returns 系统设置数据
   */
  async getSystemSettings(): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/api/settings')
      return response.data?.data || null
    } catch (error) {
      console.error('API调用失败:', error)
      throw error
    }
  },

  /**
   * 更新系统设置
   * @param settings 系统设置数据
   * @returns 更新结果
   */
  async updateSystemSettings(settings: any): Promise<any> {
    const response = await apiClient.put<ApiResponse<any>>('/api/settings', settings)
    return response.data.data!
  },


}

/**
 * 仪表板相关API服务
 */
export const dashboardService = {
  /**
   * 获取仪表板统计数据
   * @returns 仪表板统计数据
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/api/dashboard/stats')
    return response.data.data!
  },
}

/**
 * 统一的API服务导出
 * 包含所有API服务的集合
 */
export const apiService = {
  ...authService,
  ...userService,
  ...groupService,
  ...deviceService,
  ...dataService,
  ...dashboardService,
  ...healthService,
  ...settingsService,
}