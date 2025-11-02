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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-50 font-geist antialiased">
      <div className="w-full max-w-md px-4 sm:px-6 lg:px-8">
          {/* 顶部栏 (移动端) */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-surface border-b border-white/10 animate-[fadeInDown_0.6s_ease-out]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <button className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors">
                <LogIn className="w-6 h-6" />
                <span className="text-sm font-medium text-white">PLC登录</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/80 font-medium tracking-tight">PLC平台</span>
                <div className="w-8 h-8 rounded-full bg-accent/20 backdrop-blur ring-1 ring-accent/30 flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-accent" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full mt-16 lg:mt-0">
            <div className="glass-surface backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-[fadeInUp_0.8s_ease-out_0.2s_both] max-w-md mx-auto">
              <div className="grid lg:grid-cols-1 bg-zinc-900">
                {/* 主内容 */}
                <main className="p-8">
                  {/* 头部 */}
                  <div className="flex flex-col items-center text-center mb-8 animate-[fadeInDown_0.6s_ease-out_0.3s_both]">
                    <div className="h-12 w-12 rounded-xl bg-accent/20 backdrop-blur ring-1 ring-accent/30 flex items-center justify-center mb-4">
                      <LogIn className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <div className="text-2xl font-semibold tracking-tight text-white mb-1">PLC采集平台</div>
                      <div className="text-xs text-white/60">请登录您的账户以继续</div>
                    </div>
                  </div>

                  {/* 登录表单 */}
                  <div className="space-y-6 animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="username" className="text-sm text-white/70 font-medium mb-2 block">用户名</label>
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

                        <div>
                          <label htmlFor="password" className="text-sm text-white/70 font-medium mb-2 block">密码</label>
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
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isLoading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-white/60" />
                              ) : (
                                <Eye className="h-4 w-4 text-white/60" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full glass-btn-primary font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>登录中...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <LogIn className="w-5 h-5" />
                            <span>登录</span>
                          </div>
                        )}
                      </button>
                    </form>

                    {/* 默认账户提示 */}
                    <div className="rounded-2xl p-4 glass-surface-light animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white mb-3">默认管理员账户：</p>
                        <div className="glass-card p-3">
                          <p className="text-sm text-white/80 mb-1">
                            用户名：<span className="font-mono font-bold text-accent">admin</span>
                          </p>
                          <p className="text-sm text-white/80">
                            密码：<span className="font-mono font-bold text-accent">admin123</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>

          {/* 底部信息 */}
          <div className="text-center mt-8 animate-[fadeIn_0.6s_ease-out_1s_both]">
            <p className="text-xs text-white/60">
              © 2024 PLC数据采集平台 · Novara风格设计
            </p>
          </div>
      </div>
    </div>
  )
}