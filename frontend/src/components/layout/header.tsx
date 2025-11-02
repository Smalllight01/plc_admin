'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { authService, apiService } from '@/services/api'
import {
  LogOut,
  User,
  Settings,
  Key,
  Bell,
  Menu,
  Activity,
  Search,
} from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

/**
 * 顶部导航栏组件
 * 提供用户操作、通知和系统功能
 */
export function Header({ onMenuClick }: HeaderProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const { user, logout } = useAuthStore()

  // 获取系统设置
  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      try {
        return await apiService.getSystemSettings()
      } catch (error) {
        console.error('获取系统设置失败:', error)
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  })

  // 从系统设置中获取标题信息，如果没有则使用默认值
  const systemName = systemSettings?.system_name || 'PLC数据采集平台'
  const systemDescription = systemSettings?.system_description || '实时监控和数据管理系统'

  /**
   * 处理用户登出
   */
  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      logout()
      router.push('/login')
      toast({
        title: '已登出',
        description: '您已成功登出系统',
      })
    }
  }

  /**
   * 处理修改密码
   */
  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm
    
    // 表单验证
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: '表单验证失败',
        description: '请填写所有密码字段',
        variant: 'destructive',
      })
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: '密码确认失败',
        description: '新密码和确认密码不一致',
        variant: 'destructive',
      })
      return
    }
    
    if (newPassword.length < 6) {
      toast({
        title: '密码强度不足',
        description: '新密码长度至少为6位',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)
    
    try {
      await authService.changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      })
      
      toast({
        title: '密码修改成功',
        description: '您的密码已成功修改',
      })
      
      // 重置表单并关闭对话框
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordDialog(false)
    } catch (error: any) {
      console.error('修改密码失败:', error)
      
      const errorMessage = error.response?.data?.message || error.message || '修改密码失败'
      
      toast({
        title: '修改密码失败',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  /**
   * 重置密码表单
   */
  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  return (
    <header className="px-4 md:px-6 lg:px-8 py-5 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：菜单按钮和面包屑导航 */}
        <div className="flex items-center gap-3 text-white/70">
          <button
            onClick={onMenuClick}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10 lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="hidden lg:flex items-center gap-3 text-white/70">
            <span className="text-sm font-medium hover:text-white transition-colors text-white/70">
              PLC平台
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/40">
              <path d="m9 18 6-6-6-6"></path>
            </svg>
            <span className="text-sm font-medium text-white">
              控制面板
            </span>
          </div>
        </div>

        {/* 中间：搜索框 */}
        <div className="flex-1 max-w-xl">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-card backdrop-blur ring-1 ring-white/10">
            <Search className="w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="搜索设备、数据..."
              className="w-full bg-transparent placeholder:text-white/50 text-sm outline-none text-white font-medium"
            />
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 text-white/60 font-medium">
              ⌘K
            </span>
          </div>
        </div>

        {/* 右侧：用户操作 */}
        <div className="flex items-center gap-2">
          {/* 通知按钮 */}
          <button className="relative p-2 rounded-xl hover:bg-white/10 transition-colors hidden md:flex">
            <Bell className="w-5 h-5 text-white/80" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"></span>
          </button>

          {/* 快速操作按钮 */}
          <button className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors">
            <Activity className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">快速查看</span>
          </button>

          {/* 用户信息 */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-9 h-9 rounded-xl bg-accent/20 backdrop-blur ring-1 ring-accent/30 flex items-center justify-center">
                <User className="w-5 h-5 text-accent" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold leading-5 text-white">
                  {user?.username || '用户'}
                </div>
                <div className="text-xs text-white/60 font-medium">
                  {user?.role === 'super_admin'
                    ? '超级管理员'
                    : user?.role === 'admin'
                    ? '管理员'
                    : '操作员'}
                </div>
              </div>
              <button className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <LogOut className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>

          {/* 移动端用户菜单 */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="登出"
            >
              <LogOut className="w-5 h-5 text-white/70" />
            </button>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <button
                  onClick={resetPasswordForm}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                  title="修改密码"
                >
                  <Key className="w-5 h-5 text-white/70" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] glass-card">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white">修改密码</DialogTitle>
                  <DialogDescription className="text-white/60 font-medium">
                    请输入当前密码和新密码来修改您的登录密码
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-3">
                    <Label htmlFor="current-password" className="text-base font-semibold text-white">当前密码</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm(prev => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      disabled={isChangingPassword}
                      className="h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="new-password" className="text-base font-semibold text-white">新密码</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm(prev => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      disabled={isChangingPassword}
                      className="h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="confirm-password" className="text-base font-semibold text-white">确认新密码</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm(prev => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      disabled={isChangingPassword}
                      className="h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-3">
                  <button
                    onClick={() => setShowPasswordDialog(false)}
                    disabled={isChangingPassword}
                    className="glass-btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="glass-btn-primary"
                  >
                    {isChangingPassword ? '修改中...' : '确认修改'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  )
}