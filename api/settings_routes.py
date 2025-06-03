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

# PLC采集器引用
_plc_collector = None

def set_plc_collector(collector):
    """设置PLC采集器引用"""
    global _plc_collector
    _plc_collector = collector

# 系统设置数据模型
class SystemSettings(BaseModel):
    # 系统基本设置
    system_name: str = "PLC管理系统"
    system_description: str = "工业PLC设备管理与数据采集系统"
    timezone: str = "Asia/Shanghai"
    language: str = "zh-CN"
    
    # PLC数据采集设置
    plc_collect_interval: int = 5  # PLC采集间隔（秒）
    plc_connect_timeout: int = 5000  # PLC连接超时（毫秒）
    plc_receive_timeout: int = 10000  # PLC接收超时（毫秒）
    data_retention_days: int = 30  # 数据保留天数
    max_concurrent_connections: int = 100  # 最大并发连接数
    
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
            
            # 通知PLC采集器重新加载配置
            if _plc_collector:
                try:
                    _plc_collector.reload_settings()
                    logger.info("PLC采集器配置已重新加载")
                except Exception as e:
                    logger.error(f"重新加载PLC采集器配置失败: {e}")
            
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