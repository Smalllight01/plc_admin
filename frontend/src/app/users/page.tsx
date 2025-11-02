'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { apiService } from '@/services/api'
import { User, CreateUserRequest, UpdateUserRequest, UserRole, Group } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  RefreshCw,
  Shield,
  User as UserIcon,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react'

/**
 * 用户管理页面组件
 * 提供用户的增删改查功能
 */
export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'user',  // super_admin/admin/user
    group_id: undefined
  })
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 获取用户列表
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', { search: searchTerm, role: roleFilter }],
    queryFn: () => apiService.getUsers({ 
      page: 1, 
      page_size: 100,
      search: searchTerm || undefined,
      role: roleFilter !== 'all' ? roleFilter as UserRole : undefined,
    }),
  })

  // 获取分组列表
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiService.getGroups({ page: 1, page_size: 100 })
  })

  // 创建用户
  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => apiService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreateDialog(false)
      resetForm()
      toast({
        title: '创建成功',
        description: '用户已成功创建',
      })
    },
    onError: (error: any) => {
      toast({
        title: '创建失败',
        description: error.response?.data?.message || '创建用户失败',
        variant: 'destructive',
      })
    },
  })

  // 更新用户
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      apiService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowEditDialog(false)
      setEditingUser(null)
      resetForm()
      toast({
        title: '更新成功',
        description: '用户信息已成功更新',
      })
    },
    onError: (error: any) => {
      toast({
        title: '更新失败',
        description: error.response?.data?.message || '更新用户失败',
        variant: 'destructive',
      })
    },
  })

  // 删除用户
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: '删除成功',
        description: '用户已成功删除',
      })
    },
    onError: (error: any) => {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '删除用户失败',
        variant: 'destructive',
      })
    },
  })

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      role: 'user',  // super_admin/admin/user
      group_id: undefined
    })
    setShowPassword(false)
  }

  /**
   * 处理创建用户
   */
  const handleCreate = () => {
    if (!formData.username.trim()) {
      toast({
        title: '表单验证失败',
        description: '请输入用户名',
        variant: 'destructive',
      })
      return
    }

    if (!formData.password.trim()) {
      toast({
        title: '表单验证失败',
        description: '请输入密码',
        variant: 'destructive',
      })
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: '表单验证失败',
        description: '请输入有效的邮箱地址',
        variant: 'destructive',
      })
      return
    }

    createMutation.mutate(formData)
  }

  /**
   * 处理编辑用户
   */
  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '', // 编辑时不显示密码
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role,
      group_id: user.group_id
    })
    setShowEditDialog(true)
  }

  /**
   * 处理更新用户
   */
  const handleUpdate = () => {
    if (!editingUser) return
    
    if (!formData.username.trim()) {
      toast({
        title: '表单验证失败',
        description: '请输入用户名',
        variant: 'destructive',
      })
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: '表单验证失败',
        description: '请输入有效的邮箱地址',
        variant: 'destructive',
      })
      return
    }

    // 如果密码为空，则不更新密码
    const updateData: UpdateUserRequest = {
      username: formData.username,
      email: formData.email || undefined,
      full_name: formData.full_name || undefined,
      role: formData.role,
      group_id: formData.group_id
    }

    if (formData.password.trim()) {
      updateData.password = formData.password
    }

    updateMutation.mutate({
      id: editingUser.id,
      data: updateData,
    })
  }

  /**
   * 处理删除用户
   */
  const handleDelete = (user: User) => {
    if (confirm(`确定要删除用户 "${user.username}" 吗？此操作不可撤销。`)) {
      deleteMutation.mutate(user.id)
    }
  }

  /**
   * 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  /**
   * 处理角色筛选
   */
  const handleRoleFilter = (value: string) => {
    setRoleFilter(value)
  }

  /**
   * 获取角色显示信息
   */
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'super_admin':
        return { label: '超级管理员', variant: 'destructive' as const, icon: Shield }
      case 'admin':
        return { label: '管理员', variant: 'default' as const, icon: Shield }
      case 'user':
        return { label: '普通用户', variant: 'outline' as const, icon: UserIcon }
      default:
        return { label: '未知', variant: 'outline' as const, icon: UserIcon }
    }
  }

  const users = usersData?.data || []
  const isLoading_ = isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="w-full max-w-none p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* 页面标题 - Novara风格 */}
          <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl tracking-tight text-white">用户管理</h1>
                <p className="text-sm md:text-base text-white/70 font-medium mt-1">管理系统用户账户，控制访问权限和角色分配</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  //size="lg"
                  onClick={() => refetch()}
                  disabled={isLoading_}
                  className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 md:h-5 md:w-5 mr-2 ${isLoading_ ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">刷新数据</span>
                  <span className="sm:hidden">刷新</span>
                </Button>

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={resetForm}
                      //size="lg"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                    >
                      <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                      <span className="hidden sm:inline">新建用户</span>
                      <span className="sm:hidden">新建</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-surface backdrop-blur-xl border border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-3 rounded-2xl bg-accent/20 backdrop-blur ring-1 ring-accent/30">
                          <Plus className="h-6 w-6 text-accent" />
                        </div>
                        <span className="text-white font-bold">创建新用户</span>
                      </DialogTitle>
                      <DialogDescription className="text-white/70">
                        创建一个新的系统用户账户
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="space-y-3">
                        <Label htmlFor="username" className="text-white font-semibold">用户名 *</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="请输入用户名"
                          disabled={createMutation.isPending}
                          className="h-12 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="password" className="text-white font-semibold">密码 *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="请输入密码"
                            disabled={createMutation.isPending}
                            className="h-12 text-white placeholder:text-white/50"
                          />
                          <Button
                            type="button"
                            className="glass-btn absolute right-2 top-2 h-8 w-8 p-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="email" className="text-white font-semibold">邮箱</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="请输入邮箱地址（可选）"
                          disabled={createMutation.isPending}
                          className="h-12 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="full_name" className="text-white font-semibold">姓名</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="请输入真实姓名（可选）"
                          disabled={createMutation.isPending}
                          className="h-12 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="role" className="text-white font-semibold">角色 *</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                          disabled={createMutation.isPending}
                        >
                          <SelectTrigger className="h-12 glass-surface-light border border-white/10 text-white">
                            <SelectValue placeholder="选择用户角色" />
                          </SelectTrigger>
                          <SelectContent className="glass-surface border border-white/10">
                            <SelectItem value="user" className="text-white">普通用户</SelectItem>
                            <SelectItem value="admin" className="text-white">管理员</SelectItem>
                            <SelectItem value="super_admin" className="text-white">超级管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="group" className="text-white font-semibold">分组</Label>
                        <Select
                          value={formData.group_id?.toString() || 'none'}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            group_id: value === 'none' ? undefined : parseInt(value)
                          }))}
                          disabled={createMutation.isPending}
                        >
                          <SelectTrigger className="h-12 glass-surface-light border border-white/10 text-white">
                            <SelectValue placeholder="选择用户分组（可选）" />
                          </SelectTrigger>
                          <SelectContent className="glass-surface border border-white/10">
                            <SelectItem value="none" className="text-white">无分组</SelectItem>
                            {groupsData?.data?.map((group: Group) => (
                              <SelectItem key={group.id} value={group.id.toString()} className="text-white">
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button
                        className="glass-btn"
                        onClick={() => setShowCreateDialog(false)}
                        disabled={createMutation.isPending}
                      >
                        取消
                      </Button>
                      <Button
                        className="glass-btn-primary"
                        onClick={handleCreate}
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? '创建中...' : '创建用户'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* 搜索和筛选 - Novara风格 */}
          <div className="rounded-2xl glass-card p-4 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* 搜索和筛选 */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      placeholder="搜索用户名、邮箱或姓名..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-12 h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-56">
                  <Select value={roleFilter} onValueChange={handleRoleFilter}>
                    <SelectTrigger className="h-12 bg-white/10 backdrop-blur border border-white/20 text-white focus:bg-white/20 focus:border-white/30">
                      <Filter className="h-4 w-4 mr-2 text-white/50" />
                      <SelectValue placeholder="筛选角色" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface backdrop-blur border border-white/10">
                      <SelectItem value="all" className="text-white">所有角色</SelectItem>
                      <SelectItem value="user" className="text-white">普通用户</SelectItem>
                      <SelectItem value="admin" className="text-white">管理员</SelectItem>
                      <SelectItem value="super_admin" className="text-white">超级管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 用户列表 - Novara风格 */}
          <div className="rounded-2xl glass-card p-4 md:p-6 animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">用户列表</h2>
                  <p className="text-sm text-white/70 mt-1">
                    管理系统用户账户，点击操作按钮进行编辑或删除
                  </p>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium">
                  {users.length} 个用户
                </span>
              </div>
            </div>
            <div className="p-0">
              {error ? (
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl glass-surface-light inline-block mb-6">
                    <Users className="h-16 w-16 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">加载用户列表失败</h3>
                  <p className="text-white/60 mb-6 max-w-md mx-auto">
                    请检查网络连接或稍后重试
                  </p>
                  <Button
                    className="glass-btn-primary"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    重试
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">用户名</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">姓名</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">邮箱</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">角色</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">状态</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">创建时间</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">最后登录</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-white/70">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="p-4 rounded-2xl glass-surface-light">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-accent"></div>
                              </div>
                              <span className="text-white/70">加载用户数据中...</span>
                            </div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-16">
                            <div className="flex flex-col items-center space-y-4">
                              <div className="p-6 rounded-2xl glass-surface-light">
                                <Users className="h-16 w-16 text-white/60" />
                              </div>
                              <h3 className="text-xl font-bold text-white">
                                {searchTerm || roleFilter !== 'all' ? '没有找到匹配的用户' : '暂无用户'}
                              </h3>
                              <p className="text-white/60 max-w-md mx-auto">
                                {searchTerm || roleFilter !== 'all' ? '尝试调整搜索条件' : '创建第一个系统用户'}
                              </p>
                              {!searchTerm && roleFilter === 'all' && (
                                <Button
                                  className="glass-btn-primary"
                                  onClick={() => setShowCreateDialog(true)}
                                >
                                  <Plus className="h-5 w-5 mr-2" />
                                  创建第一个用户
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => {
                          const roleInfo = getRoleInfo(user.role)
                          return (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors duration-200">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-2xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                                    <UserIcon className="h-4 w-4 text-blue-400" />
                                  </div>
                                  <div className="font-semibold text-white text-sm">{user.username}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-white/80">
                                {user.full_name || '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-white/80">
                                {user.email || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                                  user.role === 'super_admin'
                                    ? 'bg-red-500/20 backdrop-blur ring-1 ring-red-500/30 text-red-400'
                                    : user.role === 'admin'
                                    ? 'bg-accent/20 backdrop-blur ring-1 ring-accent/30 text-accent'
                                    : 'glass-surface-light text-white/80'
                                }`}>
                                  <roleInfo.icon className="h-3.5 w-3.5" />
                                  <span className="text-xs font-semibold">{roleInfo.label}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                                  user.is_active
                                    ? 'bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 text-emerald-400'
                                    : 'glass-surface-light text-white/60'
                                }`}>
                                  <span className="text-xs font-semibold">
                                    {user.is_active ? '活跃' : '禁用'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-white/60">
                                {formatDateTime(user.created_at)}
                              </td>
                              <td className="px-6 py-4 text-sm text-white/60">
                                {user.last_login ? formatDateTime(user.last_login) : '从未登录'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    className="glass-btn h-8 w-8 p-0"
                                    size="sm"
                                    onClick={() => handleEdit(user)}
                                    disabled={isLoading_}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    className="glass-btn h-8 w-8 p-0 hover:bg-red-500/20 hover:border-red-500/30"
                                    size="sm"
                                    onClick={() => handleDelete(user)}
                                    disabled={isLoading_}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 编辑用户对话框 - Novara深色玻璃拟态风格 */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-md glass-surface border border-white/10">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="p-3 rounded-2xl bg-accent/20 backdrop-blur ring-1 ring-accent/30">
                    <Edit className="h-6 w-6 text-accent" />
                  </div>
                  <span className="text-white font-bold">编辑用户</span>
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  修改用户的基本信息和权限
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <Label htmlFor="edit-username" className="text-white font-semibold">用户名 *</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="请输入用户名"
                    disabled={updateMutation.isPending}
                    className="h-12 text-white placeholder:text-white/50"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-password" className="text-white font-semibold">新密码</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="留空则不修改密码"
                      disabled={updateMutation.isPending}
                      className="h-12 text-white placeholder:text-white/50"
                    />
                    <Button
                      type="button"
                      className="glass-btn absolute right-2 top-2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-email" className="text-white font-semibold">邮箱</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="请输入邮箱地址（可选）"
                    disabled={updateMutation.isPending}
                    className="h-12 text-white placeholder:text-white/50"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-full_name" className="text-white font-semibold">姓名</Label>
                  <Input
                    id="edit-full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="请输入真实姓名（可选）"
                    disabled={updateMutation.isPending}
                    className="h-12 text-white placeholder:text-white/50"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-role" className="text-white font-semibold">角色 *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-12 glass-surface-light border border-white/10 text-white">
                      <SelectValue placeholder="选择用户角色" />
                    </SelectTrigger>
                    <SelectContent className="glass-surface border border-white/10">
                      <SelectItem value="user" className="text-white">普通用户</SelectItem>
                      <SelectItem value="admin" className="text-white">管理员</SelectItem>
                      <SelectItem value="super_admin" className="text-white">超级管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-group" className="text-white font-semibold">分组</Label>
                  <Select
                    value={formData.group_id?.toString() || 'none'}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      group_id: value === 'none' ? undefined : parseInt(value)
                    }))}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-12 glass-surface-light border border-white/10 text-white">
                      <SelectValue placeholder="选择用户分组（可选）" />
                    </SelectTrigger>
                    <SelectContent className="glass-surface border border-white/10">
                      <SelectItem value="none" className="text-white">无分组</SelectItem>
                      {groupsData?.data?.map((group: Group) => (
                        <SelectItem key={group.id} value={group.id.toString()} className="text-white">
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button
                  className="glass-btn"
                  onClick={() => {
                    setShowEditDialog(false)
                    setEditingUser(null)
                    resetForm()
                  }}
                  disabled={updateMutation.isPending}
                >
                  取消
                </Button>
                <Button
                  className="glass-btn-primary"
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '更新中...' : '更新用户'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
  )
}