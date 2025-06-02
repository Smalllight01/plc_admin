# -*- coding: utf-8 -*-
"""
JWT认证工具模块
提供用户认证、token生成和验证功能
"""

import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from loguru import logger

from config import config
from database import db_manager
from models import User

class AuthManager:
    """认证管理器"""
    
    def __init__(self):
        self.secret_key = config.JWT_SECRET_KEY
        self.algorithm = config.JWT_ALGORITHM
        self.expire_hours = config.JWT_EXPIRE_HOURS
    
    def generate_token(self, user_id: int, username: str) -> str:
        """生成JWT token"""
        try:
            payload = {
                'user_id': user_id,
                'username': username,
                'exp': datetime.utcnow() + timedelta(hours=self.expire_hours),
                'iat': datetime.utcnow()
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
        except Exception as e:
            logger.error(f"生成token失败: {e}")
            return None
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token已过期")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"无效的token: {e}")
            return None
        except Exception as e:
            logger.error(f"验证token失败: {e}")
            return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """用户认证"""
        try:
            with db_manager.get_db() as db:
                from sqlalchemy.orm import joinedload
                user = db.query(User).options(joinedload(User.group)).filter(
                    User.username == username,
                    User.is_active == True
                ).first()
                
                if user and user.check_password(password):
                    # 预加载group关系，避免懒加载错误
                    if user.group:
                        _ = user.group.name  # 触发加载
                    return user
                return None
        except Exception as e:
            logger.error(f"用户认证失败: {e}")
            return None
    
    def get_current_user(self, token: str) -> Optional[User]:
        """根据token获取当前用户"""
        payload = self.verify_token(token)
        if not payload:
            return None
        
        try:
            with db_manager.get_db() as db:
                from sqlalchemy.orm import joinedload
                user = db.query(User).options(joinedload(User.group)).filter(
                    User.id == payload['user_id'],
                    User.is_active == True
                ).first()
                # 预加载group关系，避免懒加载错误
                if user and user.group:
                    _ = user.group.name  # 触发加载
                return user
        except Exception as e:
            logger.error(f"获取当前用户失败: {e}")
            return None

# 创建全局认证管理器实例
auth_manager = AuthManager()

def extract_token_from_header(authorization_header: str) -> Optional[str]:
    """从Authorization头中提取token"""
    if not authorization_header:
        return None
    
    parts = authorization_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]

# FastAPI 认证依赖
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

# 创建Bearer token安全方案
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """获取当前认证用户"""
    token = credentials.credentials
    
    # 验证token并获取用户
    current_user = auth_manager.get_current_user(token)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return current_user

def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[User]:
    """获取当前用户（可选认证）"""
    if not credentials:
        return None
    
    token = credentials.credentials
    return auth_manager.get_current_user(token)

# FastAPI 权限检查依赖
def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """获取管理员用户"""
    if not (current_user.is_admin or current_user.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user

def get_super_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """获取超级管理员用户"""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要超级管理员权限"
        )
    return current_user

# 辅助函数：检查管理员权限
def check_admin_permission(user: User) -> bool:
    """检查用户是否有管理员权限"""
    return user.is_admin or user.is_super_admin

# 辅助函数：检查分组权限
def check_group_permission(user: User, group_id: int) -> bool:
    """检查用户是否有访问指定分组的权限"""
    if user.is_super_admin:
        return True
    return user.group_id == group_id

# 分组权限检查依赖
def get_group_access_user(group_id: int):
    """创建分组访问权限检查依赖"""
    def _check_group_access(current_user: User = Depends(get_current_user)) -> User:
        if not check_group_permission(current_user, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问其他分组的资源"
            )
        return current_user
    return _check_group_access