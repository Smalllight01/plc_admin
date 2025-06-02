'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { authService } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { Eye, EyeOff, LogIn } from 'lucide-react'

/**
 * 登录页面组件
 * 提供用户登录功能，包括表单验证和错误处理
 */
export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuthStore()

  /**
   * 处理登录表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: '登录失败',
        description: '请输入用户名和密码',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await authService.login({ username, password })
      console.log('登录成功:', response)

      // 保存登录状态
      login(response.user, response.token)
      
      toast({
        title: '登录成功',
        description: `欢迎回来，${response.user.username}！`,
      })
      
      // 跳转到主页
      router.push('/')
    } catch (error: any) {
      console.error('登录失败:', error)
      
      const errorMessage = error.response?.data?.message || error.message || '登录失败，请检查用户名和密码'
      
      toast({
        title: '登录失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PLC采集平台
          </h1>
          <p className="text-gray-600">
            请登录您的账户以继续
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">用户登录</CardTitle>
            <CardDescription className="text-center">
              输入您的用户名和密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>登录中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="h-4 w-4" />
                    <span>登录</span>
                  </div>
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>默认管理员账户：</p>
              <p>用户名：admin，密码：admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}