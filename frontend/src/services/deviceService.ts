import { apiClient, ApiResponse, PaginatedResponse, Device, DeviceStatus, CollectLog, CreateDeviceRequest, UpdateDeviceRequest } from '@/lib/api';

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
};