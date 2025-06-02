# -*- coding: utf-8 -*-
"""
仪表板API路由
提供仪表板统计数据功能
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from loguru import logger
from datetime import datetime, timedelta

from auth import get_current_user
from database import db_manager
from models import User, Device, Group, CollectLog

# 创建路由器
router = APIRouter(prefix="/api", tags=["dashboard"])

class DashboardStats(BaseModel):
    """仪表板统计数据模型"""
    total_users: int
    total_groups: int
    total_devices: int
    online_devices: int
    offline_devices: int
    total_data_points: int
    recent_alerts: int
    user_group_name: Optional[str] = None

class ApiResponse(BaseModel):
    """API响应模型"""
    success: bool
    data: Optional[DashboardStats] = None
    message: str
    code: str = "SUCCESS"

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user)
) -> ApiResponse:
    """获取仪表板统计数据"""
    try:
        with db_manager.get_db() as db:
            # 根据用户角色获取不同的统计数据
            if current_user.role == 'super_admin':
                # 超级管理员可以看到所有数据
                total_users = db.query(User).filter(User.is_active == True).count()
                total_groups = db.query(Group).count()
                total_devices = db.query(Device).count()
                devices = db.query(Device).all()
                user_group_name = "全部分组"
            else:
                # 普通用户和管理员只能看到自己分组的数据
                total_users = db.query(User).filter(
                    User.group_id == current_user.group_id,
                    User.is_active == True
                ).count()
                
                # 获取用户分组信息
                user_group = db.query(Group).filter(Group.id == current_user.group_id).first()
                user_group_name = user_group.name if user_group else "未知分组"
                
                # 只统计自己分组的数据
                total_groups = 1 if user_group else 0
                total_devices = db.query(Device).filter(
                    Device.group_id == current_user.group_id
                ).count()
                
                devices = db.query(Device).filter(
                    Device.group_id == current_user.group_id
                ).all()
            
            # 计算设备在线状态
            online_devices = 0
            offline_devices = 0
            
            for device in devices:
                if device.status == 'online':
                    online_devices += 1
                else:
                    offline_devices += 1
            
            # 计算数据点数量（最近24小时）
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)
            
            total_data_points = 0
            recent_alerts = 0
            
            try:
                # 统计真实的数据点数量
                for device in devices:
                    # 使用真实的InfluxDB查询获取数据点数
                    device_stats = db_manager.query_statistics(
                        device.id, 
                        start_time, 
                        end_time
                    )
                    if device_stats and 'total_points' in device_stats:
                        total_data_points += device_stats['total_points']
                
                # 统计最近告警数量（模拟数据）
                recent_alerts = min(len(devices), 5)  # 简单模拟
                
            except Exception as e:
                logger.warning(f"统计数据点数量失败: {e}")
                total_data_points = 0
                recent_alerts = 0
            
            stats = DashboardStats(
                total_users=total_users,
                total_groups=total_groups,
                total_devices=total_devices,
                online_devices=online_devices,
                offline_devices=offline_devices,
                total_data_points=total_data_points,
                recent_alerts=recent_alerts,
                user_group_name=user_group_name
            )
            
            return ApiResponse(
                success=True,
                data=stats,
                message="获取仪表板统计数据成功"
            )
            
    except Exception as e:
        logger.error(f"获取仪表板统计数据异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )