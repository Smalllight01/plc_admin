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
        <div className="w-full max-w-none p-6 space-y-6">
          {/* 页面标题 - 仿照实时数据页面设计 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">分组管理</h1>
                    <p className="text-blue-600 mt-1 font-medium">
                      管理和组织 {groups.length} 个设备分组
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
                <Button
                   variant="default"
                   size="sm"
                   onClick={() => {
                     resetForm()
                     setShowCreateDialog(true)
                   }}
                   className="bg-blue-500 hover:bg-blue-600"
                 >
                   <FolderPlus className="h-4 w-4 mr-2" />
                   新建分组
                 </Button>
               </div>
             </div>
           </div>

          {/* 工具栏 - 仿照实时数据页面设计 */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 搜索区域 */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="搜索分组名称、描述..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-11 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                
                {/* 统计信息 */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">{groups.length} 个分组</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">活跃管理</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 新建分组对话框 */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-blue-600" />
                  创建新分组
                </DialogTitle>
                <DialogDescription>
                  创建一个新的设备分组来组织您的PLC设备
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">分组名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入分组名称"
                    disabled={createMutation.isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">分组描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入分组描述（可选）"
                    disabled={createMutation.isPending}
                  />
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
                  {createMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      创建中...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      创建
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 分组列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-blue-600" />
                分组列表
              </CardTitle>
              <CardDescription>
                管理您的设备分组，点击操作按钮进行编辑或删除
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <AlertTriangle className="h-12 w-12 text-red-500" />
                    <div className="space-y-2">
                      <p className="text-red-600 font-medium">加载分组列表失败</p>
                      <p className="text-sm text-gray-500">请检查网络连接或稍后重试</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重试
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>分组名称</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>设备数量</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                            <div className="space-y-1">
                              <span className="text-gray-700 font-medium">加载中...</span>
                              <p className="text-sm text-gray-500">正在获取分组数据</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center space-y-4">
                            <Folder className="h-12 w-12 text-gray-400" />
                            <div className="space-y-2">
                              <p className="text-gray-700 font-medium">
                                {searchTerm ? '没有找到匹配的分组' : '暂无分组'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {searchTerm ? '尝试调整搜索条件' : '创建您的第一个设备分组'}
                              </p>
                            </div>
                            {!searchTerm && (
                              <Button
                                variant="outline"
                                onClick={() => setShowCreateDialog(true)}
                              >
                                <FolderPlus className="h-4 w-4 mr-2" />
                                创建第一个分组
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-blue-600" />
                              {group.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            {group.description || (
                              <span className="italic text-gray-400">暂无描述</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-gray-500" />
                              {group.device_count || 0} 个设备
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatDateTime(group.created_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatDateTime(group.updated_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(group)}
                                disabled={isLoading_}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(group)}
                                disabled={isLoading_}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 编辑分组对话框 */}
          <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>编辑分组</DialogTitle>
                <DialogDescription>
                  修改分组的基本信息
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    名称
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-description" className="text-right">
                    描述
                  </Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingGroup(null)}
                  disabled={updateMutation.isPending}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      更新中...
                    </>
                  ) : (
                    "更新分组"
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