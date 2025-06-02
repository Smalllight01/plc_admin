import { create } from 'zustand'
import { Device, Group, DeviceStatus } from '@/lib/api'

// 应用状态接口
interface AppState {
  // 侧边栏状态
  sidebarCollapsed: boolean
  
  // 当前选中的分组
  selectedGroup: Group | null
  
  // 设备状态缓存
  deviceStatuses: Record<number, DeviceStatus>
  
  // 实时数据更新时间
  lastDataUpdate: Date | null
  
  // 全局加载状态
  globalLoading: boolean
  
  // 错误信息
  error: string | null
  
  // 成功信息
  success: string | null
}

// 应用操作接口
interface AppActions {
  // 侧边栏操作
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // 分组操作
  setSelectedGroup: (group: Group | null) => void
  
  // 设备状态操作
  setDeviceStatus: (deviceId: number, status: DeviceStatus) => void
  setDeviceStatuses: (statuses: Record<number, DeviceStatus>) => void
  
  // 数据更新时间
  setLastDataUpdate: (time: Date) => void
  
  // 全局状态操作
  setGlobalLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  clearMessages: () => void
}

// 应用store类型
type AppStore = AppState & AppActions

/**
 * 应用状态管理store
 * 管理全局应用状态，如侧边栏、选中分组、设备状态等
 */
export const useAppStore = create<AppStore>((set, get) => ({
  // 初始状态
  sidebarCollapsed: false,
  selectedGroup: null,
  deviceStatuses: {},
  lastDataUpdate: null,
  globalLoading: false,
  error: null,
  success: null,

  // 切换侧边栏状态
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
  },

  // 设置侧边栏状态
  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed })
  },

  // 设置选中的分组
  setSelectedGroup: (group: Group | null) => {
    set({ selectedGroup: group })
  },

  // 设置单个设备状态
  setDeviceStatus: (deviceId: number, status: DeviceStatus) => {
    set((state) => ({
      deviceStatuses: {
        ...state.deviceStatuses,
        [deviceId]: status,
      },
    }))
  },

  // 批量设置设备状态
  setDeviceStatuses: (statuses: Record<number, DeviceStatus>) => {
    set({ deviceStatuses: statuses })
  },

  // 设置最后数据更新时间
  setLastDataUpdate: (time: Date) => {
    set({ lastDataUpdate: time })
  },

  // 设置全局加载状态
  setGlobalLoading: (loading: boolean) => {
    set({ globalLoading: loading })
  },

  // 设置错误信息
  setError: (error: string | null) => {
    set({ error, success: null })
  },

  // 设置成功信息
  setSuccess: (success: string | null) => {
    set({ success, error: null })
  },

  // 清除所有消息
  clearMessages: () => {
    set({ error: null, success: null })
  },
}))