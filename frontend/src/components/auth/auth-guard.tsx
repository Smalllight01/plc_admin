'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { authService } from '@/services/api'
import { useToast } from '@/components/ui/use-toast'
import { MainLayout } from '@/components/layout/main-layout'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
}

/**
 * 认证守卫组件
 * 用于保护需要登录或特定权限的页面
 */
export function AuthGuard({
  children,
  requireAdmin = false,
  requireSuperAdmin = false
}: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const { user, token, isAuthenticated, login, logout } = useAuthStore()

  // 判断是否是登录页面
  const isLoginPage = pathname === '/login'

  // 等待zustand persist状态恢复
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasHydrated(true)
    }, 100) // 给persist一点时间恢复状态
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // 等待状态恢复完成
    if (!hasHydrated) return
    
    const checkAuth = async () => {
      try {
        // 检查localStorage中是否有认证数据
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          try {
            const persistedData = JSON.parse(authStorage)
            const storedToken = persistedData?.state?.token
            const storedUser = persistedData?.state?.user
            const storedIsAuthenticated = persistedData?.state?.isAuthenticated
            
            // 如果localStorage有数据但zustand状态为空，说明状态还没恢复
            if (storedToken && storedUser && storedIsAuthenticated && !token) {
              // 手动恢复状态
              login(storedUser, storedToken)
              
              // 检查权限
              if (checkPermissions(storedUser)) {
                setIsAuthorized(true)
              } else {
                handleUnauthorized()
              }
              setIsLoading(false)
              return
            }
          } catch (error) {
            console.error('解析localStorage数据失败:', error)
            localStorage.removeItem('auth-storage')
          }
        }
        
        // 如果没有token，直接跳转到登录页
        if (!token) {
          router.push('/login')
          return
        }

        // 如果有token但没有用户信息，尝试获取用户信息
        if (!user && token) {
          try {
            const currentUser = await authService.getCurrentUser()
            login(currentUser, token)
            
            // 检查权限
            if (checkPermissions(currentUser)) {
              setIsAuthorized(true)
            } else {
              handleUnauthorized()
            }
          } catch (error) {
            // token无效，清除登录状态并跳转到登录页
            logout()
            router.push('/login')
            return
          }
        } else if (user) {
          // 检查权限
          if (checkPermissions(user)) {
            setIsAuthorized(true)
          } else {
            handleUnauthorized()
          }
        }
      } catch (error) {
        console.error('认证检查失败:', error)
        logout()
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [hasHydrated, token, user, router, login, logout])

  /**
   * 检查用户权限
   */
  const checkPermissions = (currentUser: any): boolean => {
    if (requireSuperAdmin && currentUser.role !== 'super_admin') {
      return false
    }
    
    if (requireAdmin && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      return false
    }
    
    return true
  }

  /**
   * 处理权限不足的情况
   */
  const handleUnauthorized = () => {
    toast({
      title: '权限不足',
      description: '您没有访问此页面的权限',
      variant: 'destructive',
    })
    
    // 跳转到主页或上一页
    router.push('/')
  }

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">正在验证身份...</p>
        </div>
      </div>
    )
  }

  // 如果未授权，不渲染子组件
  if (!isAuthorized) {
    return null
  }

  // 渲染受保护的内容
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <MainLayout>
      {children}
    </MainLayout>
  )
}