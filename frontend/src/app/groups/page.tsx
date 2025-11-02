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
    
        <div className="w-full max-w-none p-6 space-y-6">
          {/* 页面标题 - Novara风格 */}
          <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl tracking-tight text-white">分组管理</h1>
                <p className="text-sm md:text-base text-white/70 font-medium mt-1">管理和组织设备分组</p>
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
                <Button
                  onClick={() => {
                    resetForm()
                    setShowCreateDialog(true)
                  }}
                  //size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                >
                  <FolderPlus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                  <span className="hidden sm:inline">新建分组</span>
                  <span className="sm:hidden">新建</span>
                </Button>
              </div>
            </div>
          </div>

          {/* 工具栏 - Novara风格 */}
          <div className="rounded-2xl glass-card p-4 animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* 搜索区域 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                  <Input
                    placeholder="搜索分组名称、描述..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-12 h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                  />
                </div>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-200">
                  <div className="p-2 rounded-lg bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                    <Database className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">{groups.length} 个分组</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/30 transition-all duration-200">
                  <div className="p-2 rounded-lg bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">活跃管理</span>
                </div>
              </div>
            </div>
          </div>

          {/* 新建分组对话框 - Novara风格 */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-md bg-surface backdrop-blur-xl border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl text-white">
                  <div className="p-3 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                    <FolderPlus className="h-6 w-6 text-emerald-400" />
                  </div>
                  <span className="font-bold tracking-tight">创建新分组</span>
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  创建一个新的设备分组来组织您的PLC设备
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-white/90">分组名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入分组名称"
                    disabled={createMutation.isPending}
                    className="h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold text-white/90">分组描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入分组描述（可选）"
                    disabled={createMutation.isPending}
                    className="h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={createMutation.isPending}
                  className="h-12 px-6 bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
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

          {/* 分组列表 - Novara风格 */}
          <div className="rounded-2xl glass-card p-4 md:p-6 animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                  <Folder className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">分组列表</h2>
                  <p className="text-sm text-white/70 mt-1">
                    管理您的设备分组，点击操作按钮进行编辑或删除
                  </p>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium">
                  {groups.length} 个分组
                </span>
              </div>
            </div>
            {error ? (
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl bg-red-500/20 backdrop-blur ring-1 ring-red-500/30 inline-block mb-6">
                    <AlertTriangle className="h-16 w-16 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">加载分组列表失败</h3>
                  <p className="text-base text-white/70 mb-6">
                    请检查网络连接或稍后重试
                  </p>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => refetch()}
                    className="bg-red-500/20 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/30 hover:ring-red-500/50 transition-all duration-200"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    重试
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-2xl bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30 mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-400/20 border-t-blue-400"></div>
                  </div>
                  <span className="text-base text-white/70">加载分组数据中...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-6 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 inline-block mb-6">
                    <Folder className="h-16 w-16 text-white/70" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {searchTerm ? '没有找到匹配的分组' : '暂无分组'}
                  </h3>
                  <p className="text-base text-white/70 mb-6">
                    {searchTerm ? '尝试调整搜索条件' : '创建您的第一个设备分组'}
                  </p>
                  {!searchTerm && (
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 hover:ring-emerald-500/50 transition-all duration-200"
                    >
                      <FolderPlus className="h-5 w-5 mr-2" />
                      创建第一个分组
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* 桌面端表格视图 */}
                  <div className="hidden lg:block">
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">分组名称</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">描述</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">设备数量</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">创建时间</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">更新时间</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {groups.map((group) => (
                            <tr key={group.id} className="hover:bg-white/5 transition-all duration-200">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-lg bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 group-hover:scale-110 transition-all duration-300">
                                    <Folder className="h-5 w-5 text-emerald-400" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors duration-300">
                                      {group.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {group.description || (
                                  <span className="text-sm text-white/50 italic">暂无描述</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-lg bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                                    <HardDrive className="h-4 w-4 text-blue-400" />
                                  </div>
                                  <span className="font-semibold text-white">{group.device_count || 0} 个设备</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20">
                                    <Clock className="h-3.5 w-3.5 text-white/60" />
                                  </div>
                                  {formatDateTime(group.created_at)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20">
                                    <Clock className="h-3.5 w-3.5 text-white/60" />
                                  </div>
                                  {formatDateTime(group.updated_at)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(group)}
                                    disabled={isLoading_}
                                    className="h-10 w-10 p-0 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(group)}
                                    disabled={isLoading_}
                                    className="h-10 w-10 p-0 rounded-lg bg-red-500/20 backdrop-blur border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-500/50 transition-all duration-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 移动端卡片视图 - Novara风格 */}
                  <div className="lg:hidden space-y-4">
                    {groups.map((group) => (
                      <div key={group.id} className="rounded-2xl glass-card p-4 hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30 group-hover:scale-110 transition-all duration-300">
                              <Folder className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors duration-300">{group.name}</h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(group)}
                              disabled={isLoading_}
                              className="h-10 w-10 p-0 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(group)}
                              disabled={isLoading_}
                              className="h-10 w-10 p-0 rounded-lg bg-red-500/20 backdrop-blur border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-500/50 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm text-white/70 font-medium">描述</label>
                            <p className="text-sm text-white/90">
                              {group.description || (
                                <span className="text-white/50 italic">暂无描述</span>
                              )}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-white/70 font-medium">设备数量</label>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-blue-500/20 backdrop-blur ring-1 ring-blue-500/30">
                                <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                              </div>
                              <span className="font-semibold text-white">{group.device_count || 0} 个设备</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm text-white/70 font-medium">创建时间</label>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20">
                                  <Clock className="h-3.5 w-3.5 text-white/60" />
                                </div>
                                <span className="text-sm text-white/90">{formatDateTime(group.created_at)}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm text-white/70 font-medium">更新时间</label>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20">
                                  <Clock className="h-3.5 w-3.5 text-white/60" />
                                </div>
                                <span className="text-sm text-white/90">{formatDateTime(group.updated_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
          </div>

          {/* 编辑分组对话框 - Novara风格 */}
          <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
            <DialogContent className="sm:max-w-md bg-surface backdrop-blur-xl border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl text-white">
                  <div className="p-3 rounded-xl bg-emerald-500/20 backdrop-blur ring-1 ring-emerald-500/30">
                    <Edit className="h-6 w-6 text-emerald-400" />
                  </div>
                  <span className="font-bold tracking-tight">编辑分组</span>
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  修改分组的基本信息
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <Label htmlFor="edit-name" className="text-sm font-semibold text-white/90">分组名称 *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入分组名称"
                    disabled={updateMutation.isPending}
                    className="h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-description" className="text-sm font-semibold text-white/90">分组描述</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入分组描述（可选）"
                    disabled={updateMutation.isPending}
                    className="h-12 bg-white/10 backdrop-blur border border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/30 transition-all duration-200"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingGroup(null)}
                  disabled={updateMutation.isPending}
                  className="h-12 px-6 bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                >
                  取消
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
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
    
 
  )
}