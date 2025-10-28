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
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
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
    <AuthGuard requireAdmin>
      <MainLayout>
        <div className="w-full max-w-none p-6 space-y-6">
          {/* 页面标题 - 优化版本 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
                    <p className="text-blue-600 mt-1 font-medium">
                      管理系统用户，控制访问权限和角色分配
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading_}
                  className="bg-white hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading_ ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
                
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} className="bg-blue-500 hover:bg-blue-600">
                      <Plus className="h-4 w-4 mr-2" />
                      新建用户
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>创建新用户</DialogTitle>
                      <DialogDescription>
                        创建一个新的系统用户账户
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="username">用户名 *</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="请输入用户名"
                          disabled={createMutation.isPending}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">密码 *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="请输入密码"
                            disabled={createMutation.isPending}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="请输入邮箱地址（可选）"
                          disabled={createMutation.isPending}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="full_name">姓名</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="请输入真实姓名（可选）"
                          disabled={createMutation.isPending}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="role">角色 *</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                          disabled={createMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择用户角色" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">普通用户</SelectItem>
                            <SelectItem value="admin">管理员</SelectItem>
                            <SelectItem value="super_admin">超级管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="group">分组</Label>
                        <Select
                          value={formData.group_id?.toString() || 'none'}
                          onValueChange={(value) => setFormData(prev => ({ 
                            ...prev, 
                            group_id: value === 'none' ? undefined : parseInt(value) 
                          }))}
                          disabled={createMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择用户分组（可选）" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">无分组</SelectItem>
                            {groupsData?.data?.map((group: Group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        disabled={createMutation.isPending}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleCreate}
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? '创建中...' : '创建'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* 搜索和筛选 - 优化版本 */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 搜索和筛选 */}
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="搜索用户名、邮箱或姓名..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-11 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-56">
                    <Select value={roleFilter} onValueChange={handleRoleFilter}>
                      <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500">
                        <Filter className="h-4 w-4 mr-2 text-gray-500" />
                        <SelectValue placeholder="筛选角色" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">👥 所有角色</SelectItem>
                        <SelectItem value="user">👤 普通用户</SelectItem>
                        <SelectItem value="admin">🛡️ 管理员</SelectItem>
                        <SelectItem value="super_admin">⚡ 超级管理员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 用户列表 - 优化版本 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-gray-900">用户列表</span>
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({users.length} 个用户)
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                管理系统用户账户，点击操作按钮进行编辑或删除
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">加载用户列表失败</p>
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    重试
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户名</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>最后登录</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span>加载中...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <Users className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">
                              {searchTerm || roleFilter !== 'all' ? '没有找到匹配的用户' : '暂无用户'}
                            </p>
                            {!searchTerm && roleFilter === 'all' && (
                              <Button
                                variant="outline"
                                onClick={() => setShowCreateDialog(true)}
                              >
                                创建第一个用户
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => {
                        const roleInfo = getRoleInfo(user.role)
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.username}
                            </TableCell>
                            <TableCell>
                              {user.full_name || '-'}
                            </TableCell>
                            <TableCell>
                              {user.email || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={roleInfo.variant} className="flex items-center space-x-1 w-fit">
                                <roleInfo.icon className="h-3 w-3" />
                                <span>{roleInfo.label}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                {user.is_active ? '活跃' : '禁用'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDateTime(user.created_at)}
                            </TableCell>
                            <TableCell>
                              {user.last_login ? formatDateTime(user.last_login) : '从未登录'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(user)}
                                  disabled={isLoading_}
                                  className="hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(user)}
                                  disabled={isLoading_}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 编辑用户对话框 */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>编辑用户</DialogTitle>
                <DialogDescription>
                  修改用户的基本信息和权限
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">用户名 *</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="请输入用户名"
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">新密码</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="留空则不修改密码"
                      disabled={updateMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">邮箱</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="请输入邮箱地址（可选）"
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-full_name">姓名</Label>
                  <Input
                    id="edit-full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="请输入真实姓名（可选）"
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">角色 *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择用户角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">普通用户</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="super_admin">超级管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-group">分组</Label>
                  <Select
                    value={formData.group_id?.toString() || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      group_id: value === 'none' ? undefined : parseInt(value) 
                    }))}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择用户分组（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无分组</SelectItem>
                      {groupsData?.data?.map((group: Group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
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
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '更新中...' : '更新'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </AuthGuard>
  )
}