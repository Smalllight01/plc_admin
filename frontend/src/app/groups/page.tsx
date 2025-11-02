'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { AuthGuard } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/main-layout'
import { apiService } from '@/services/api'
import { Group, CreateGroupRequest, UpdateGroupRequest } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import {
  Plus,
  Edit,
  Trash2,
  Layers,
  Search,
  RefreshCw,
  Shield,
  Clock,
  Users,
  HardDrive,
  TrendingUp,
  Settings,
  Folder,
  FolderPlus,
  Activity,
  Zap,
  Grid3X3,
  BarChart3,
  Database,
  Network,
  AlertTriangle,
} from 'lucide-react'

/**
 * 分组管理页面组件
 * 提供分组的增删改查功能
 */
export default function GroupsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [formData, setFormData] = useState<CreateGroupRequest>({
    name: '',
    description: '',
  })
  
  const { toast } = useToast()

  // 获取分组列表
  const {
    data: groupsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['groups', { search: searchTerm }],
    queryFn: () => apiService.getGroups({ 
      page: 1, 
      page_size: 100,
      search: searchTerm || undefined 
    }),
  })

  const groups = groupsData?.data || []; // Define groups here for consistent use

  // 添加调试信息
  console.log('Groups Debug Info:', {
    groupsData,
    isLoading,
    error,
    groups, // Use the defined groups variable
    groupsLength: groups.length // Use the defined groups variable
  })

  const queryClient = useQueryClient()

  // 分组数据已在上面的useQuery中获取



  // 创建分组
  const createMutation = useMutation({
    mutationFn: (data: CreateGroupRequest) => apiService.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setShowCreateDialog(false)
      resetForm()
      toast({
        title: '创建成功',
        description: '分组已成功创建',
      })
    },
    onError: (error: any) => {
      toast({
        title: '创建失败',
        description: error.response?.data?.message || '创建分组失败',
        variant: 'destructive',
      })
    },
  })

  // 更新分组
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGroupRequest }) =>
      apiService.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setShowEditDialog(false)
      setEditingGroup(null)
      resetForm()
      toast({
        title: '更新成功',
        description: '分组信息已成功更新',
      })
    },
    onError: (error: any) => {
      toast({
        title: '更新失败',
        description: error.response?.data?.message || '更新分组失败',
        variant: 'destructive',
      })
    },
  })

  // 删除分组
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast({
        title: '删除成功',
        description: '分组已成功删除',
      })
    },
    onError: (error: any) => {
      toast({
        title: '删除失败',
        description: error.response?.data?.message || '删除分组失败',
        variant: 'destructive',
      })
    },
  })

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    })
  }

  /**
   * 处理创建分组
   */
  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: '表单验证失败',
        description: '请输入分组名称',
        variant: 'destructive',
      })
      return
    }

    createMutation.mutate(formData)
  }

  /**
   * 处理编辑分组
   */
  const handleEdit = (group: Group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || '',
    })
    setShowEditDialog(true)
  }

  /**
   * 处理更新分组
   */
  const handleUpdate = () => {
    if (!editingGroup) return
    
    if (!formData.name.trim()) {
      toast({
        title: '表单验证失败',
        description: '请输入分组名称',
        variant: 'destructive',
      })
      return
    }

    updateMutation.mutate({
      id: editingGroup.id,
      data: formData,
    })
  }

  /**
   * 处理删除分组
   */
  const handleDelete = (group: Group) => {
    if (confirm(`确定要删除分组 "${group.name}" 吗？此操作不可撤销。`)) {
      deleteMutation.mutate(group.id)
    }
  }

  /**
   * 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const isLoading_ = isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <AuthGuard requireAdmin>
      <MainLayout>
        <div className="w-full max-w-none p-6 space-y-8">
          {/* 页面标题 - 扁平拟物风格 */}
          <div className="neumorphic-card p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-neumorphic-lg">
                  <Layers className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-h1 gradient-text mb-2">分组管理</h1>
                  <p className="text-body text-muted-foreground">管理和组织设备分组</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => refetch()}
                  disabled={isLoading_}
                  className="shadow-neumorphic-sm hover:shadow-neumorphic"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isLoading_ ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => {
                    resetForm()
                    setShowCreateDialog(true)
                  }}
                  className="shadow-neumorphic hover:shadow-neumorphic-lg"
                >
                  <FolderPlus className="h-5 w-5 mr-2" />
                  新建分组
                </Button>
              </div>
            </div>
          </div>

          {/* 工具栏 - 扁平拟物风格 */}
          <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 搜索区域 */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="搜索分组名称、描述..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-12 h-12 border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 text-body"
                    />
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-0 rounded-2xl shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300">
                    <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-neumorphic-sm">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-body font-semibold text-blue-700">{groups.length} 个分组</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-emerald-50 to-green-50 border-0 rounded-2xl shadow-neumorphic-sm hover:shadow-neumorphic transition-all duration-300">
                    <div className="p-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-neumorphic-sm">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-body font-semibold text-emerald-700">活跃管理</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 新建分组对话框 - 扁平拟物风格 */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-md border-0 shadow-neumorphic-lg bg-card/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                    <FolderPlus className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-h2 gradient-text">创建新分组</span>
                </DialogTitle>
                <DialogDescription className="text-body text-muted-foreground">
                  创建一个新的设备分组来组织您的PLC设备
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-body font-semibold">分组名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入分组名称"
                    disabled={createMutation.isPending}
                    className="h-12 border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 text-body"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-body font-semibold">分组描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入分组描述（可选）"
                    disabled={createMutation.isPending}
                    className="h-12 border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 text-body"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={createMutation.isPending}
                  className="h-12 px-6 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="h-12 px-6 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      创建中...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="h-5 w-5 mr-2" />
                      创建分组
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 分组列表 - 扁平拟物风格 */}
          <Card className="border-0 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                  <Folder className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <span className="text-h2 gradient-text">分组列表</span>
                  <Badge variant="secondary" className="ml-3 text-body-sm">
                    {groups.length} 个分组
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                管理您的设备分组，点击操作按钮进行编辑或删除
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 shadow-neumorphic-sm inline-block mb-6">
                    <AlertTriangle className="h-16 w-16 text-red-600" />
                  </div>
                  <h3 className="text-h3 text-foreground mb-3">加载分组列表失败</h3>
                  <p className="text-body text-muted-foreground mb-6">
                    请检查网络连接或稍后重试
                  </p>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => refetch()}
                    className="shadow-neumorphic hover:shadow-neumorphic-lg"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    重试
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                  </div>
                  <span className="text-body text-muted-foreground">加载分组数据中...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm inline-block mb-6">
                    <Folder className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-h3 text-foreground mb-3">
                    {searchTerm ? '没有找到匹配的分组' : '暂无分组'}
                  </h3>
                  <p className="text-body text-muted-foreground mb-6">
                    {searchTerm ? '尝试调整搜索条件' : '创建您的第一个设备分组'}
                  </p>
                  {!searchTerm && (
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => setShowCreateDialog(true)}
                      className="shadow-neumorphic hover:shadow-neumorphic-lg"
                    >
                      <FolderPlus className="h-5 w-5 mr-2" />
                      创建第一个分组
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* 桌面端表格视图 */}
                  <div className="hidden lg:block rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-h4 font-semibold">分组名称</TableHead>
                          <TableHead className="text-h4 font-semibold">描述</TableHead>
                          <TableHead className="text-h4 font-semibold">设备数量</TableHead>
                          <TableHead className="text-h4 font-semibold">创建时间</TableHead>
                          <TableHead className="text-h4 font-semibold">更新时间</TableHead>
                          <TableHead className="text-right text-h4 font-semibold">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groups.map((group) => (
                          <TableRow key={group.id} className="group hover:bg-muted/30 transition-all duration-300">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm group-hover:scale-110 transition-all duration-300">
                                  <Folder className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-body group-hover:text-primary transition-colors duration-300">
                                    {group.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {group.description || (
                                <span className="text-body-sm text-muted-foreground italic">暂无描述</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-2xl bg-gradient-to-br from-yellow-50 to-amber-50 shadow-neumorphic-sm">
                                  <HardDrive className="h-4 w-4 text-yellow-600" />
                                </div>
                                <span className="font-semibold text-body">{group.device_count || 0} 个设备</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                                <div className="p-1.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                                {formatDateTime(group.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                                <div className="p-1.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                                {formatDateTime(group.updated_at)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(group)}
                                  disabled={isLoading_}
                                  className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(group)}
                                  disabled={isLoading_}
                                  className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 移动端卡片视图 - 扁平拟物风格 */}
                  <div className="lg:hidden p-6 space-y-4">
                    {groups.map((group) => (
                      <Card key={group.id} className="border-0 shadow-neumorphic-sm hover:shadow-neumorphic hover:-translate-y-1 transition-all duration-300">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm group-hover:scale-110 transition-all duration-300">
                                <Folder className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-body font-semibold group-hover:text-primary transition-colors duration-300">{group.name}</CardTitle>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(group)}
                                disabled={isLoading_}
                                className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(group)}
                                disabled={isLoading_}
                                className="h-10 w-10 p-0 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 shadow-neumorphic-sm hover:shadow-neumorphic hover:scale-110 transition-all duration-300 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <label className="text-body-sm text-muted-foreground font-medium">描述</label>
                              <p className="text-body-sm">
                                {group.description || (
                                  <span className="text-muted-foreground italic">暂无描述</span>
                                )}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-body-sm text-muted-foreground font-medium">设备数量</label>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 shadow-neumorphic-sm">
                                  <HardDrive className="h-3.5 w-3.5 text-yellow-600" />
                                </div>
                                <span className="font-semibold text-body">{group.device_count || 0} 个设备</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-body-sm text-muted-foreground font-medium">创建时间</label>
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
                                    <Clock className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-body-sm">{formatDateTime(group.created_at)}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-body-sm text-muted-foreground font-medium">更新时间</label>
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 shadow-neumorphic-sm">
                                    <Clock className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-body-sm">{formatDateTime(group.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 编辑分组对话框 - 扁平拟物风格 */}
          <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
            <DialogContent className="sm:max-w-md border-0 shadow-neumorphic-lg bg-card/95 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-neumorphic-sm">
                    <Edit className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-h2 gradient-text">编辑分组</span>
                </DialogTitle>
                <DialogDescription className="text-body text-muted-foreground">
                  修改分组的基本信息
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <Label htmlFor="edit-name" className="text-body font-semibold">分组名称 *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入分组名称"
                    disabled={updateMutation.isPending}
                    className="h-12 border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 text-body"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-description" className="text-body font-semibold">分组描述</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入分组描述（可选）"
                    disabled={updateMutation.isPending}
                    className="h-12 border-0 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300 text-body"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingGroup(null)}
                  disabled={updateMutation.isPending}
                  className="h-12 px-6 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border-0 shadow-neumorphic-sm hover:shadow-neumorphic focus:shadow-neumorphic-lg transition-all duration-300"
                >
                  取消
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="h-12 px-6 shadow-neumorphic hover:shadow-neumorphic-lg transition-all duration-300"
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      更新中...
                    </>
                  ) : (
                    <>
                      <Edit className="h-5 w-5 mr-2" />
                      更新分组
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
    
    
      </MainLayout>
    </AuthGuard>

  )
}