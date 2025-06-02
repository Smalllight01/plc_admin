# -*- coding: utf-8 -*-
"""
分组管理API路由
提供分组的增删改查功能
"""

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from loguru import logger
from sqlalchemy.exc import IntegrityError

from auth import get_current_user, get_admin_user, get_super_admin_user, check_admin_permission, check_group_permission
from database import db_manager
from models import Group, Device, User

# 创建路由器
router = APIRouter(prefix="/api", tags=["groups"])

# Pydantic 模型
class GroupCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class GroupUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ApiResponse(BaseModel):
    message: str
    code: str = "SUCCESS"

@router.get("/groups")
def get_groups(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """获取分组列表"""
    try:
        with db_manager.get_db() as db:
            query = db.query(Group)
            
            # 权限过滤
            if current_user.role == 'super_admin':
                # 超级管理员可以查看所有分组
                pass
            else:
                # 普通用户只能查看自己的分组
                query = query.filter(Group.id == current_user.group_id)
            
            # 搜索过滤
            if search:
                query = query.filter(Group.name.contains(search))
            
            # 计算总数
            total = query.count()
            
            # 分页
            offset = (page - 1) * page_size
            groups = query.offset(offset).limit(page_size).all()
            
            groups_data = [group.to_dict() for group in groups]
            
            return {
                'success': True,
                'data': {
                    'data': groups_data,
                    'total': total,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total + page_size - 1) // page_size
                },
                'message': '获取分组列表成功'
            }
            
    except Exception as e:
        logger.error(f"获取分组列表异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )
    
@router.get("/groups/{group_id}")
def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取单个分组详情"""
    try:
        # 权限检查
        if not check_group_permission(current_user, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问该分组"
            )
        
        with db_manager.get_db() as db:
            group = db.query(Group).filter(Group.id == group_id).first()
            
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="分组不存在"
                )
            
            return {
                'group': group.to_dict()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分组详情异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )
    
@router.post("/groups", status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreateRequest,
    current_user: User = Depends(get_super_admin_user)
):
    """创建分组"""
    try:
        if not group_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分组名称不能为空"
            )
        
        with db_manager.get_db() as db:
            # 检查分组名是否已存在
            existing_group = db.query(Group).filter(Group.name == group_data.name.strip()).first()
            if existing_group:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="分组名称已存在"
                )
            
            # 创建新分组
            group = Group(
                name=group_data.name.strip(),
                description=group_data.description.strip() if group_data.description else None
            )
            
            db.add(group)
            db.commit()
            db.refresh(group)
            
            logger.info(f"创建分组成功: {group_data.name} (ID: {group.id})")
            
            return {
                'message': '分组创建成功',
                'group': group.to_dict()
            }
            
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分组名称已存在"
        )
    except Exception as e:
        logger.error(f"创建分组异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )
    
@router.put("/groups/{group_id}")
def update_group(
    group_id: int,
    group_data: GroupUpdateRequest,
    current_user: User = Depends(get_super_admin_user)
):
    """更新分组"""
    try:
        # 检查是否提供了名称
        if group_data.name is not None and not group_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分组名称不能为空"
            )
        
        with db_manager.get_db() as db:
            group = db.query(Group).filter(Group.id == group_id).first()
            
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="分组不存在"
                )
            
            # 如果要更新名称，检查分组名是否已被其他分组使用
            if group_data.name is not None:
                name = group_data.name.strip()
                existing_group = db.query(Group).filter(
                    Group.name == name,
                    Group.id != group_id
                ).first()
                
                if existing_group:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="分组名称已存在"
                    )
                
                group.name = name
            
            # 更新描述
            if group_data.description is not None:
                group.description = group_data.description.strip() if group_data.description else None
            
            db.commit()
            db.refresh(group)
            
            logger.info(f"更新分组成功: {group.name} (ID: {group_id})")
            
            return {
                'message': '分组更新成功',
                'group': group.to_dict()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新分组异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )
    
@router.delete("/groups/{group_id}")
def delete_group(
    group_id: int,
    current_user: User = Depends(get_super_admin_user)
) -> ApiResponse:
    """删除分组"""
    try:
        with db_manager.get_db() as db:
            group = db.query(Group).filter(Group.id == group_id).first()
            
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="分组不存在"
                )
            
            # 检查分组下是否有用户
            users_count = db.query(User).filter(User.group_id == group_id).count()
            if users_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"分组下还有 {users_count} 个用户，无法删除"
                )
            
            # 检查分组下是否有设备
            devices_count = db.query(Device).filter(Device.group_id == group_id).count()
            if devices_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"分组下还有 {devices_count} 个设备，无法删除"
                )
            
            # 删除分组
            group_name = group.name
            db.delete(group)
            db.commit()
            
            logger.info(f"删除分组成功: {group_name} (ID: {group_id})")
            
            return ApiResponse(message="分组删除成功")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除分组异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )

# 导出路由器
__all__ = ["router"]