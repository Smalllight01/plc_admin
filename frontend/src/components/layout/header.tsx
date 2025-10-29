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
    <header className="neumorphic-header px-6 py-5">
      <div className="flex items-center justify-between">
        {/* 左侧：菜单按钮和标题 */}
        <div className="flex items-center space-x-6">
          <Button
            variant="neumorphic"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300 hover:scale-105"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300 hover:scale-105 hover:rotate-3">
              <Activity className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">
                {systemName}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {systemDescription}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧：用户操作 */}
        <div className="flex items-center space-x-4">
          {/* 通知按钮 */}
          <Button
            variant="neumorphic"
            size="icon"
            className="relative h-11 w-11 shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300 hover:scale-105 group"
          >
            <Bell className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
            {/* 通知红点 */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full border-2 border-background animate-pulse shadow-lg"></span>
          </Button>

          {/* 用户菜单 */}
          <div className="flex items-center space-x-4 neumorphic-card px-5 py-3">
            {/* 用户信息 */}
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold text-foreground">
                {user?.username}
              </div>
              <div className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-lg text-center mt-1">
                {user?.role === 'super_admin'
                  ? '超级管理员'
                  : user?.role === 'admin'
                  ? '管理员'
                  : '普通用户'}
              </div>
            </div>

            {/* 用户头像 */}
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300 hover:scale-105 hover:rotate-3">
              <User className="w-7 h-7 text-primary-foreground" />
            </div>

            {/* 用户操作按钮 */}
            <div className="flex items-center space-x-2">
              {/* 修改密码 */}
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="neumorphic"
                    size="icon"
                    title="修改密码"
                    onClick={resetPasswordForm}
                    className="h-9 w-9 shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300 hover:scale-105"
                  >
                    <Key className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] neumorphic-card">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold gradient-text">修改密码</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                      请输入当前密码和新密码来修改您的登录密码
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-3">
                      <Label htmlFor="current-password" className="text-base font-semibold">当前密码</Label>
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
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="new-password" className="text-base font-semibold">新密码</Label>
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
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="confirm-password" className="text-base font-semibold">确认新密码</Label>
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
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-3">
                    <Button
                      variant="neumorphic"
                      onClick={() => setShowPasswordDialog(false)}
                      disabled={isChangingPassword}
                      className="shadow-neumorphic-sm hover:shadow-neumorphic"
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="shadow-neumorphic hover:shadow-neumorphic-lg"
                    >
                      {isChangingPassword ? '修改中...' : '确认修改'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* 系统设置 */}
              {user?.role === 'super_admin' && (
                <Button
                  variant="neumorphic"
                  size="icon"
                  title="系统设置"
                  onClick={() => router.push('/settings')}
                  className="h-9 w-9 shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300 hover:scale-105"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              )}

              {/* 登出 */}
              <Button
                variant="neumorphic"
                size="icon"
                title="登出"
                onClick={handleLogout}
                className="h-9 w-9 shadow-neumorphic-sm hover:shadow-neumorphic hover:bg-destructive/10 transition-all duration-300 hover:scale-105 group"
              >
                <LogOut className="h-5 w-5 group-hover:text-destructive transition-colors duration-300" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}