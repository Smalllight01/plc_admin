# -*- coding: utf-8 -*-
"""
认证相关API路由
提供用户登录、注册、token验证等功能
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from loguru import logger

from auth import auth_manager, get_current_user
from database import db_manager
from models import User

# Pydantic 模型定义
class LoginRequest(BaseModel):
    """登录请求模型"""
    username: str
    password: str

class LoginResponse(BaseModel):
    """登录响应模型"""
    token: str
    user: dict

class ApiResponse(BaseModel):
    """API响应模型"""
    success: bool
    message: str
    data: dict = None

def setup_auth_routes(app):
    """设置认证路由"""
    router = APIRouter(prefix="/api/auth", tags=["认证"])
    
    @router.post("/login", response_model=ApiResponse)
    async def login(login_data: LoginRequest):
        """用户登录"""
        try:
            # 验证用户
            user = auth_manager.authenticate_user(login_data.username, login_data.password)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="用户名或密码错误"
                )
            
            # 生成token
            token = auth_manager.generate_token(user.id, user.username)
            if not token:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="生成token失败"
                )
            
            logger.info(f"用户登录成功: {login_data.username}")
            
            # 返回符合前端ApiResponse<LoginResponse>格式的数据
            return ApiResponse(
                success=True,
                message="登录成功",
                data={
                    "token": token,
                    "user": user.to_dict()
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"登录异常: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="服务器内部错误"
            )
    
    @router.post("/logout", response_model=ApiResponse)
    async def logout(current_user: User = Depends(get_current_user)):
        """用户登出"""
        try:
            logger.info(f"用户登出: {current_user.username}")
            
            return ApiResponse(
                success=True,
                message="登出成功",
                data={}
            )
            
        except Exception as e:
            logger.error(f"登出异常: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="服务器内部错误"
            )
    
    @router.get("/me", response_model=ApiResponse)
    async def get_current_user_info(current_user: User = Depends(get_current_user)):
        """获取当前用户信息"""
        try:
            return ApiResponse(
                success=True,
                message="获取用户信息成功",
                data={
                    "user": current_user.to_dict()
                }
            )
            
        except Exception as e:
            logger.error(f"获取用户信息异常: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="服务器内部错误"
            )
    
    # 添加密码修改请求模型
    class ChangePasswordRequest(BaseModel):
        """修改密码请求模型"""
        old_password: str
        new_password: str
    
    @router.post("/change-password", response_model=ApiResponse)
    async def change_password(password_data: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
        """修改密码"""
        try:
            if len(password_data.new_password) < 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="新密码长度不能少于6位"
                )
            
            # 验证旧密码
            if not current_user.check_password(password_data.old_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="旧密码错误"
                )
            
            # 更新密码
            with db_manager.get_db() as db:
                user = db.query(User).filter(User.id == current_user.id).first()
                if user:
                    user.set_password(password_data.new_password)
                    db.commit()
                    
                    logger.info(f"用户修改密码成功: {user.username}")
                    
                    return ApiResponse(
                        success=True,
                        message="密码修改成功",
                        data={}
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="用户不存在"
                    )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"修改密码异常: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="服务器内部错误"
            )
    
    # 将路由器注册到应用
    app.include_router(router)