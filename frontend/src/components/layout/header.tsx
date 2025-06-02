'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { authService } from '@/services/api'
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
        current_password: currentPassword,
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
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* 左侧：菜单按钮和标题 */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden hover:bg-blue-50 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-md">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                PLC数据采集平台
              </h1>
              <p className="text-sm text-blue-600 font-medium">
                实时监控和数据管理系统
              </p>
            </div>
          </div>
        </div>

        {/* 右侧：用户操作 */}
        <div className="flex items-center space-x-3">
          {/* 通知按钮 */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-10 w-10 hover:bg-blue-50 transition-colors border border-gray-200 hover:border-blue-300"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {/* 通知红点 */}
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          </Button>

          {/* 用户菜单 */}
          <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl px-4 py-2 border border-gray-200">
            {/* 用户信息 */}
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-gray-900">
                {user?.username}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                {user?.role === 'super_admin'
                  ? '超级管理员'
                  : user?.role === 'admin'
                  ? '管理员'
                  : '普通用户'}
              </div>
            </div>

            {/* 用户头像 */}
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>

            {/* 用户操作按钮 */}
            <div className="flex items-center space-x-1">
              {/* 修改密码 */}
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="修改密码"
                    onClick={resetPasswordForm}
                    className="h-8 w-8 hover:bg-blue-100 transition-colors"
                  >
                    <Key className="h-4 w-4 text-gray-600" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>修改密码</DialogTitle>
                    <DialogDescription>
                      请输入当前密码和新密码来修改您的登录密码
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current-password">当前密码</Label>
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
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-password">新密码</Label>
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
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">确认新密码</Label>
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
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordDialog(false)}
                      disabled={isChangingPassword}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? '修改中...' : '确认修改'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* 系统设置 */}
              {user?.role === 'super_admin' && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="系统设置"
                  onClick={() => router.push('/settings')}
                  className="h-8 w-8 hover:bg-blue-100 transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-600" />
                </Button>
              )}

              {/* 登出 */}
              <Button
                variant="ghost"
                size="icon"
                title="登出"
                onClick={handleLogout}
                className="h-8 w-8 hover:bg-red-100 transition-colors"
              >
                <LogOut className="h-4 w-4 text-gray-600 hover:text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}