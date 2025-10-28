import { apiClient, ApiResponse, PaginatedResponse, Group, CreateGroupRequest, UpdateGroupRequest, GroupQueryParams } from '@/lib/api';

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
};