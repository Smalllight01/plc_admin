#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设备管理API路由
提供设备的增删改查功能
"""

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from loguru import logger
from sqlalchemy.exc import IntegrityError

from auth import get_current_user, get_admin_user, get_super_admin_user, check_group_permission, check_admin_permission
from database import db_manager
from models import Device, Group, CollectLog
try:
    from plc_collector import PLCCollector
    PLC_COLLECTOR_AVAILABLE = True
except ImportError:
    PLC_COLLECTOR_AVAILABLE = False

try:
    from simple_collector import simple_collector
    SIMPLE_COLLECTOR_AVAILABLE = True
except ImportError:
    SIMPLE_COLLECTOR_AVAILABLE = False

# 创建路由器
router = APIRouter(prefix="/api", tags=["devices"])

# Pydantic 模型
class DeviceCreateRequest(BaseModel):
    """设备创建请求模型"""
    name: str
    plc_type: str
    protocol: str
    ip_address: str
    port: int = 502
    addresses: List[dict]
    group_id: Optional[int] = None
    description: Optional[str] = None
    is_active: bool = True

class DeviceUpdateRequest(BaseModel):
    """设备更新请求模型"""
    name: Optional[str] = None
    plc_type: Optional[str] = None
    protocol: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    addresses: Optional[List[dict]] = None
    group_id: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ApiResponse(BaseModel):
    """API响应模型"""
    message: str
    code: str = "SUCCESS"

# 全局PLC采集器实例（在main.py中会被设置）
plc_collector_instance = None

def set_plc_collector(collector: PLCCollector):
    """设置PLC采集器实例"""
    global plc_collector_instance
    plc_collector_instance = collector

@router.get("/devices")
async def get_devices(
    current_user: dict = Depends(get_current_user),
    group_id: Optional[int] = Query(None, description="分组ID"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=1000, description="每页数量")
):
    """获取设备列表"""
    try:
        with db_manager.get_db() as db:
            query = db.query(Device)
            
            # 权限过滤
            if current_user.role == 'super_admin':
                # 超级管理员可以查看所有设备
                if group_id:
                    query = query.filter(Device.group_id == group_id)
            else:
                # 普通用户只能查看自己分组的设备
                query = query.filter(Device.group_id == current_user.group_id)
            
            # 分页
            total = query.count()
            devices = query.offset((page - 1) * page_size).limit(page_size).all()
            
            devices_data = [device.to_dict() for device in devices]
            
            return {
                'devices': devices_data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': '参数格式错误', 'code': 'INVALID_PARAMETERS'}
        )
    except Exception as e:
        logger.error(f"获取设备列表异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

@router.get("/devices/{device_id}")
async def get_device(
    device_id: int,
    current_user: dict = Depends(get_current_user)
):
    """获取单个设备详情"""
    try:
        with db_manager.get_db() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            
            if not device:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={'error': '设备不存在', 'code': 'DEVICE_NOT_FOUND'}
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={'error': '无权访问该设备', 'code': 'ACCESS_DENIED'}
                )
            
            return {
                'success': True,
                'data': device.to_dict(),
                'message': '获取设备信息成功'
            }
            
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': '无效的设备ID', 'code': 'INVALID_DEVICE_ID'}
        )
    except Exception as e:
        logger.error(f"获取设备详情异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

@router.post("/devices")
async def create_device(
    device_data: DeviceCreateRequest,
    current_user: dict = Depends(get_admin_user)
):
    """创建新设备"""
    try:
        with db_manager.get_db() as db:
            # 检查分组是否存在
            group = db.query(Group).filter(Group.id == device_data.group_id).first()
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={'error': '分组不存在', 'code': 'GROUP_NOT_FOUND'}
                )
            
            # 权限检查：非超级管理员只能在自己的分组下创建设备
            if current_user.role != 'super_admin' and device_data.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={'error': '无权在该分组下创建设备', 'code': 'ACCESS_DENIED'}
                )
            
            # 检查设备名称是否重复
            existing_device = db.query(Device).filter(
                Device.name == device_data.name,
                Device.group_id == device_data.group_id
            ).first()
            if existing_device:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={'error': '设备名称已存在', 'code': 'DEVICE_NAME_EXISTS'}
                )
            
            # 创建设备
            device = Device(
                name=device_data.name,
                plc_type=device_data.plc_type,
                protocol=device_data.protocol,
                ip_address=device_data.ip_address,
                port=device_data.port,
                addresses=json.dumps(device_data.addresses),
                group_id=device_data.group_id,
                description=device_data.description,
                is_active=device_data.is_active
            )
            
            db.add(device)
            db.commit()
            db.refresh(device)
            
            # 如果采集器存在，重新加载设备配置
            if SIMPLE_COLLECTOR_AVAILABLE:
                simple_collector.reload_devices()
            elif PLC_COLLECTOR_AVAILABLE and plc_collector_instance:
                plc_collector_instance.reload_devices()
            
            return {
                'success': True,
                'data': device.to_dict(),
                'message': '设备创建成功'
            }
            
    except HTTPException:
        raise
    except IntegrityError as e:
        logger.error(f"设备创建数据库约束错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': '设备数据违反约束条件', 'code': 'CONSTRAINT_VIOLATION'}
        )
    except Exception as e:
        logger.error(f"创建设备异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

@router.put("/devices/{device_id}")
async def update_device(
    device_id: int,
    device_data: DeviceUpdateRequest,
    current_user: dict = Depends(get_admin_user)
):
    """更新设备信息"""
    try:
        with db_manager.get_db() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            
            if not device:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={'error': '设备不存在', 'code': 'DEVICE_NOT_FOUND'}
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={'error': '无权修改该设备', 'code': 'ACCESS_DENIED'}
                )
            
            # 更新设备信息
            update_data = device_data.dict(exclude_unset=True)
            logger.info(f"更新设备 {device_id}，接收到的数据: {update_data}")
            
            for field, value in update_data.items():
                if hasattr(device, field):
                    # 特殊处理addresses字段，将数组转换为JSON字符串
                    if field == 'addresses' and isinstance(value, list):
                        value = json.dumps(value)
                    setattr(device, field, value)
                    logger.info(f"更新字段 {field}: {value}")
                else:
                    logger.warning(f"设备模型中不存在字段: {field}")
            
            db.commit()
            db.refresh(device)
            
            # 如果采集器存在，重新加载设备配置
            if SIMPLE_COLLECTOR_AVAILABLE:
                simple_collector.reload_devices()
            elif PLC_COLLECTOR_AVAILABLE and plc_collector_instance:
                plc_collector_instance.reload_devices()
            
            return {
                'message': '设备更新成功',
                'device': device.to_dict()
            }
            
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': '无效的设备ID', 'code': 'INVALID_DEVICE_ID'}
        )
    except Exception as e:
        logger.error(f"更新设备异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

@router.delete("/devices/{device_id}")
async def delete_device(
    device_id: int,
    current_user: dict = Depends(get_admin_user)
):
    """删除设备"""
    try:
        with db_manager.get_db() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            
            if not device:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={'error': '设备不存在', 'code': 'DEVICE_NOT_FOUND'}
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={'error': '无权删除该设备', 'code': 'ACCESS_DENIED'}
                )
            
            db.delete(device)
            db.commit()
            
            # 如果采集器存在，重新加载设备配置
            if SIMPLE_COLLECTOR_AVAILABLE:
                simple_collector.reload_devices()
            elif PLC_COLLECTOR_AVAILABLE and plc_collector_instance:
                plc_collector_instance.reload_devices()
            
            return {'message': '设备删除成功'}
            
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': '无效的设备ID', 'code': 'INVALID_DEVICE_ID'}
        )
    except Exception as e:
        logger.error(f"删除设备异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

@router.get("/devices/{device_id}/status")
async def get_device_status(
    device_id: int,
    current_user: dict = Depends(get_current_user)
):
    """获取设备状态"""
    try:
        with db_manager.get_db() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            
            if not device:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={'error': '设备不存在', 'code': 'DEVICE_NOT_FOUND'}
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={'error': '无权访问该设备', 'code': 'ACCESS_DENIED'}
                )
            
            # 获取设备状态（从PLC采集器或数据库）
            status_info = {
                'device_id': device.id,
                'name': device.name,
                'is_active': device.is_active,
                'last_collect_time': device.last_collect_time,
                'connection_status': 'unknown'
            }
            
            # 如果采集器存在，获取实时连接状态
            if SIMPLE_COLLECTOR_AVAILABLE:
                connection_status = simple_collector.get_device_status(device_id)
                status_info.update(connection_status)
            elif PLC_COLLECTOR_AVAILABLE and plc_collector_instance:
                connection_status = plc_collector_instance.get_device_status(device_id)
                status_info['connection_status'] = connection_status
            
            return status_info
            
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': '无效的设备ID', 'code': 'INVALID_DEVICE_ID'}
        )
    except Exception as e:
        logger.error(f"获取设备状态异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

@router.get("/devices/protocol-info")
async def get_protocol_info(
    current_user: dict = Depends(get_current_user)
):
    """获取协议信息"""
    try:
        if SIMPLE_COLLECTOR_AVAILABLE:
            protocol_info = simple_collector.get_protocol_info()
        elif PLC_COLLECTOR_AVAILABLE and plc_collector_instance:
            protocol_info = plc_collector_instance.get_protocol_info()
        else:
            protocol_info = {
                'modbus_available': False,
                'omron_available': False,
                'siemens_available': False,
                'supported_protocols': [],
                'total_protocols': 0
            }

        return {
            'success': True,
            'data': protocol_info
        }

    except Exception as e:
        logger.error(f"获取协议信息异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

@router.get("/devices/{device_id}/logs")
async def get_device_logs(
    device_id: int,
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=1000, description="每页数量")
):
    """获取设备采集日志"""
    try:
        with db_manager.get_db() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            
            if not device:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={'error': '设备不存在', 'code': 'DEVICE_NOT_FOUND'}
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={'error': '无权访问该设备', 'code': 'ACCESS_DENIED'}
                )
            
            # 查询采集日志
            query = db.query(CollectLog).filter(CollectLog.device_id == device_id)
            query = query.order_by(CollectLog.created_at.desc())
            
            total = query.count()
            logs = query.offset((page - 1) * page_size).limit(page_size).all()
            
            logs_data = [log.to_dict() for log in logs]
            
            return {
                'logs': logs_data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
            
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': '无效的设备ID', 'code': 'INVALID_DEVICE_ID'}
        )
    except Exception as e:
        logger.error(f"获取设备日志异常: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': '服务器内部错误', 'code': 'INTERNAL_ERROR'}
        )

# 导出路由器
__all__ = ['router']