import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/lib/api'

// 认证状态接口
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// 认证操作接口
interface AuthActions {
  setUser: (user: User) => void
  setToken: (token: string) => void
  login: (user: User, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateUser: (updates: Partial<User>) => void
}

// 认证store类型
type AuthStore = AuthState & AuthActions

/**
 * 认证状态管理store
 * 使用zustand进行状态管理，并持久化到localStorage
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // 设置用户信息
      setUser: (user: User) => {
        set({ 
          user, 
          isAuthenticated: true 
        })
      },

      // 设置token
      setToken: (token: string) => {
        set({ token })
      },

      // 登录
      login: (user: User, token: string) => {
        set({ 
          user, 
          token, 
          isAuthenticated: true,
          isLoading: false 
        })
      },

      // 登出
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          isLoading: false 
        })
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      // 更新用户信息
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates }
          set({ user: updatedUser })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)