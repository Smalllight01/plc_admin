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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent/10 to-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* 登录标题 */}
        <div className="text-center mb-10 animate-slide-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-3xl shadow-neumorphic-lg mb-6 hover:shadow-neumorphic-xl transition-all duration-300 hover:scale-102">
            <LogIn className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-3">
            PLC采集平台
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            请登录您的账户以继续
          </p>
        </div>

        {/* 登录表单 */}
        <Card className="neumorphic-card p-8 animate-scale-in shadow-neumorphic-lg">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold gradient-text">用户登录</CardTitle>
            <CardDescription className="text-muted-foreground text-base font-medium">
              输入您的用户名和密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-base font-semibold">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-base font-semibold">密码</Label>
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
                    className="h-12 text-base pr-12"
                  />
                  <Button
                    type="button"
                    variant="neumorphic"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300 hover:scale-105"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300 hover:-translate-y-0.5"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                    <span>登录中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <LogIn className="h-5 w-5" />
                    <span>登录</span>
                  </div>
                )}
              </Button>
            </form>

            {/* 默认账户提示 */}
            <div className="mt-8 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground mb-2">默认管理员账户：</p>
                <div className="bg-background/80 rounded-xl p-3 border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    用户名：<span className="font-mono font-bold text-primary">admin</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    密码：<span className="font-mono font-bold text-primary">admin123</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部装饰 */}
        <div className="text-center mt-8 animate-fade-in">
          <p className="text-xs text-muted-foreground">
            © 2024 PLC数据采集平台 · 扁平化拟物风格设计
          </p>
        </div>
      </div>
    </div>
  )
}