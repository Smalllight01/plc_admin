# -*- coding: utf-8 -*-
"""
用户管理API路由
提供用户的增删改查功能
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
from loguru import logger
from sqlalchemy.exc import IntegrityError

from auth import get_current_user, get_admin_user, get_super_admin_user, check_admin_permission, check_group_permission
from database import db_manager
from models import User, Group

# Pydantic 模型定义
class UserCreateRequest(BaseModel):
    """创建用户请求模型"""
    username: str
    password: str
    email: Optional[str] = None
    role: str = 'user'  # super_admin/admin/user
    group_id: int

class UserUpdateRequest(BaseModel):
    """更新用户请求模型"""
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None  # super_admin/admin/user
    group_id: Optional[int] = None
    is_active: Optional[bool] = None

class PasswordResetRequest(BaseModel):
    new_password: str

class ApiResponse(BaseModel):
    """API响应模型"""
    success: bool
    message: str
    data: dict = None

# 创建路由器
router = APIRouter(prefix="/api", tags=["users"])

@router.get("/users", response_model=ApiResponse)
async def get_users(
    group_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """获取用户列表"""
    try:
        with db_manager.get_db() as db:
            query = db.query(User)
            
            # 权限过滤
            if current_user.role == 'super_admin':
                # 超级管理员可以看到所有用户
                pass
            elif current_user.role == 'admin':
                # 管理员只能看到同分组的用户
                query = query.filter(User.group_id == current_user.group_id)
            else:
                # 普通用户只能看到自己
                query = query.filter(User.id == current_user.id)
            
            # 根据group_id过滤
            if group_id is not None:
                query = query.filter(User.group_id == group_id)
            
            # 分页
            total = query.count()
            offset = (page - 1) * per_page
            users = query.offset(offset).limit(per_page).all()
            
            # 转换为字典
            users_data = []
            for user in users:
                user_dict = user.to_dict()
                users_data.append(user_dict)
            
            return ApiResponse(
                success=True,
                message="获取用户列表成功",
                data={
                    "users": users_data,
                    "total": total,
                    "page": page,
                    "per_page": per_page
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户列表异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )

@router.get("/users/{user_id}", response_model=ApiResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取单个用户详情"""
    try:
        with db_manager.get_db() as db:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用户不存在"
                )
            
            # 权限检查
            if current_user.role != 'super_admin':
                if current_user.role == 'admin':
                    # 管理员只能查看同分组用户
                    if user.group_id != current_user.group_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="无权访问该用户信息"
                        )
                else:
                    # 普通用户只能查看自己
                    if user.id != current_user.id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="无权访问该用户信息"
                        )
            
            return ApiResponse(
                success=True,
                message="获取用户详情成功",
                data={"user": user.to_dict()}
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户详情异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )

@router.post("/users", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateRequest,
    current_user: User = Depends(get_super_admin_user)
):
    """创建用户（仅超级管理员）"""
    try:
        # 验证用户名长度
        if len(user_data.username.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名长度不能少于3个字符"
            )
        
        # 验证密码长度
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码长度不能少于6个字符"
            )
        
        with db_manager.get_db() as db:
            # 检查分组是否存在
            group = db.query(Group).filter(Group.id == user_data.group_id).first()
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="分组不存在"
                )
            
            # 检查用户名是否已存在
            existing_user = db.query(User).filter(User.username == user_data.username.strip()).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="用户名已存在"
                )
            
            # 检查邮箱是否已存在（如果提供了邮箱）
            if user_data.email and user_data.email.strip():
                existing_email = db.query(User).filter(User.email == user_data.email.strip()).first()
                if existing_email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="邮箱已存在"
                    )
            
            # 验证角色
            if user_data.role not in ['super_admin', 'admin', 'user']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="角色必须是 super_admin、admin 或 user"
                )
            
            # 处理邮箱字段：如果为空字符串或None，则设为None
            email_value = user_data.email.strip() if user_data.email and user_data.email.strip() else None
            
            # 创建新用户
            user = User(
                username=user_data.username.strip(),
                group_id=user_data.group_id,
                role=user_data.role,
                email=email_value
            )
            user.set_password(user_data.password)
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            logger.info(f"创建用户成功: {user_data.username} (ID: {user.id})")
            
            return ApiResponse(
                success=True,
                message="用户创建成功",
                data={'user': user.to_dict()}
            )
            
    except HTTPException:
        raise
    except IntegrityError as e:
        error_msg = str(e)
        if "users.username" in error_msg:
            detail = "用户名已存在"
        elif "users.email" in error_msg:
            detail = "邮箱已存在"
        else:
            detail = "数据完整性错误，请检查输入信息"
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
    except Exception as e:
        logger.error(f"创建用户异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )

@router.put("/users/{user_id}", response_model=ApiResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """更新用户"""
    try:
        with db_manager.get_db() as db:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用户不存在"
                )
            
            # 权限检查
            if current_user.role != 'super_admin':
                # 普通用户只能修改自己的信息，且不能修改管理员权限
                if user.id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="无权修改该用户"
                    )
                
                # 普通用户不能修改角色和分组
                if user_data.role is not None or user_data.group_id is not None:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="无权修改用户角色或分组"
                    )
            
            # 更新用户信息
            if user_data.username is not None:
                username = user_data.username.strip()
                if username:
                    if len(username) < 3:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="用户名长度不能少于3个字符"
                        )
                    
                    # 检查用户名是否已被其他用户使用
                    existing_user = db.query(User).filter(
                        User.username == username,
                        User.id != user_id
                    ).first()
                    
                    if existing_user:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="用户名已存在"
                        )
                    
                    user.username = username
            
            if user_data.email is not None:
                user.email = user_data.email
            
            # 只有超级管理员可以修改分组和管理员权限
            if current_user.role == 'super_admin':
                if user_data.group_id is not None:
                    # 检查分组是否存在
                    group = db.query(Group).filter(Group.id == user_data.group_id).first()
                    if not group:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="分组不存在"
                        )
                    user.group_id = user_data.group_id
                
                if user_data.role is not None:
                    # 验证角色
                    if user_data.role not in ['super_admin', 'admin', 'user']:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="角色必须是 super_admin、admin 或 user"
                        )
                    user.role = user_data.role
            
            if user_data.is_active is not None:
                # 只有超级管理员可以禁用/启用用户
                if current_user.role == 'super_admin':
                    user.is_active = user_data.is_active
                elif user.id == current_user.id and not user_data.is_active:
                    # 用户不能禁用自己
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="不能禁用自己的账户"
                    )
            
            db.commit()
            db.refresh(user)
            
            logger.info(f"更新用户成功: {user.username} (ID: {user_id})")
            
            return ApiResponse(
                success=True,
                message="用户更新成功",
                data={'user': user.to_dict()}
            )
            
    except HTTPException:
        raise
    except IntegrityError as e:
        error_msg = str(e)
        if "users.username" in error_msg:
            detail = "用户名已存在"
        elif "users.email" in error_msg:
            detail = "邮箱已存在"
        else:
            detail = "数据完整性错误，请检查输入信息"
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
    except Exception as e:
        logger.error(f"更新用户异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )

@router.delete("/users/{user_id}", response_model=ApiResponse)
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_super_admin_user)
):
    """删除用户（仅超级管理员）"""
    try:
        with db_manager.get_db() as db:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用户不存在"
                )
            
            # 不能删除超级管理员
            if user.role == 'super_admin':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="不能删除超级管理员"
                )
            
            # 不能删除自己
            if user.id == current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="不能删除自己的账户"
                )
            
            username = user.username
            
            # 删除用户
            db.delete(user)
            db.commit()
            
            logger.info(f"删除用户成功: {username} (ID: {user_id})")
            
            return ApiResponse(
                success=True,
                message="用户删除成功",
                data={}
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除用户异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )

@router.put("/users/{user_id}/reset-password", response_model=ApiResponse)
async def reset_user_password(
    user_id: int,
    password_data: PasswordResetRequest,
    current_user: User = Depends(get_super_admin_user)
):
    """重置用户密码（仅超级管理员）"""
    try:
        if len(password_data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码长度不能少于6个字符"
            )
        
        with db_manager.get_db() as db:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用户不存在"
                )
            
            # 重置密码
            user.set_password(password_data.new_password)
            db.commit()
            
            logger.info(f"重置用户密码成功: {user.username} (ID: {user_id})")
            
            return ApiResponse(
                success=True,
                message="密码重置成功",
                data={}
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重置用户密码异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误"
        )

# 导出路由器供主应用使用
__all__ = ["router"]