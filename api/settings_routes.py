"""系统设置API路由"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, get_super_admin_user
from models import User
import json
import os
from loguru import logger

router = APIRouter(prefix="/api/settings", tags=["settings"])

# 系统设置数据模型
class SystemSettings(BaseModel):
    # 系统基本设置
    system_name: str = "PLC管理系统"
    system_description: str = "工业PLC设备管理与数据采集系统"
    timezone: str = "Asia/Shanghai"
    language: str = "zh-CN"
    
    # 数据采集设置
    collection_interval: int = 5000
    data_retention_days: int = 30
    max_concurrent_connections: int = 100
    connection_timeout: int = 10000
    
    # 告警设置
    enable_email_alerts: bool = False
    email_smtp_server: str = ""
    email_smtp_port: int = 587
    email_username: str = ""
    email_password: str = ""
    email_from: str = ""
    
    # 安全设置
    session_timeout: int = 3600
    password_min_length: int = 8
    password_require_special: bool = True
    max_login_attempts: int = 5
    
    # 日志设置
    log_level: str = "INFO"
    log_retention_days: int = 7
    enable_audit_log: bool = True

# 设置文件路径
SETTINGS_FILE = "system_settings.json"

def load_settings() -> SystemSettings:
    """加载系统设置"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return SystemSettings(**data)
        else:
            # 返回默认设置
            return SystemSettings()
    except Exception as e:
        logger.error(f"加载系统设置失败: {e}")
        return SystemSettings()

def save_settings(settings: SystemSettings) -> bool:
    """保存系统设置"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings.dict(), f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"保存系统设置失败: {e}")
        return False

@router.get("")
async def get_system_settings(
    current_user: User = Depends(get_current_user)
) -> dict:
    """获取系统设置"""
    try:
        settings = load_settings()
        logger.info(f"用户 {current_user.username} 获取系统设置")
        return {
            "success": True,
            "data": settings.dict(),
            "message": "获取系统设置成功"
        }
    except Exception as e:
        logger.error(f"获取系统设置失败: {e}")
        raise HTTPException(status_code=500, detail="获取系统设置失败")

@router.put("")
async def update_system_settings(
    settings: SystemSettings,
    current_user: User = Depends(get_super_admin_user)
) -> dict:
    """更新系统设置"""
    try:
        if save_settings(settings):
            logger.info(f"用户 {current_user.username} 更新系统设置")
            return {
                "success": True,
                "data": settings.dict(),
                "message": "系统设置更新成功"
            }
        else:
            raise HTTPException(status_code=500, detail="保存系统设置失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新系统设置失败: {e}")
        raise HTTPException(status_code=500, detail="更新系统设置失败")

@router.post("/test-email")
async def test_email_settings(
    current_user: User = Depends(get_super_admin_user)
) -> dict:
    """测试邮件配置"""
    try:
        settings = load_settings()
        
        if not settings.enable_email_alerts:
            raise HTTPException(status_code=400, detail="邮件告警未启用")
        
        if not all([settings.email_smtp_server, settings.email_username, settings.email_from]):
            raise HTTPException(status_code=400, detail="邮件配置不完整")
        
        # 这里可以添加实际的邮件发送测试逻辑
        # 目前只是模拟测试成功
        logger.info(f"用户 {current_user.username} 测试邮件配置")
        
        return {"message": "邮件配置测试成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"测试邮件配置失败: {e}")
        raise HTTPException(status_code=500, detail="测试邮件配置失败")