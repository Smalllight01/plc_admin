# -*- coding: utf-8 -*-
"""
数据查询API路由
提供PLC采集数据的查询功能
"""

import json
from datetime import datetime, timedelta
from loguru import logger
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user, get_super_admin_user
from database import db_manager
from models import Device, User

# 创建路由器
router = APIRouter(prefix="/api/data", tags=["data"])

# Pydantic 模型
class ApiResponse(BaseModel):
    error: Optional[str] = None
    code: Optional[str] = None
    message: Optional[str] = None
    data: Optional[dict] = None

class RealtimeDataResponse(BaseModel):
    device_id: int
    device_name: str
    data: dict
    timestamp: str

class HistoryDataResponse(BaseModel):
    device_id: int
    device_name: str
    data: List[dict]
    total: int
    page: int
    page_size: int

@router.get("/realtime")
def get_realtime_data(
    device_id: Optional[int] = Query(None, description="设备ID"),
    group_id: Optional[int] = Query(None, description="分组ID"),
    current_user: User = Depends(get_current_user)
):
    """获取实时数据"""
    try:
            
        with db_manager.get_db() as db:
            query = db.query(Device)
            
            # 权限过滤
            if current_user.role != 'super_admin':
                query = query.filter(Device.group_id == current_user.group_id)
            
            # 设备过滤
            if device_id:
                query = query.filter(Device.id == device_id)
            elif group_id:
                query = query.filter(Device.group_id == group_id)
            
            devices = query.filter(Device.is_active == True).all()
            
            if not devices:
                raise HTTPException(
                    status_code=404,
                    detail={
                        'error': '未找到符合条件的设备',
                        'code': 'NO_DEVICES_FOUND'
                    }
                )
                
            # 获取实时数据
            realtime_data = []
            for device in devices:
                # 权限检查
                if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                    continue
                
                try:
                    # 从InfluxDB获取最新数据（基于设备配置）
                    latest_data = db_manager.query_latest_data_by_device_config(
                        device_id=device.id,
                        limit=100
                    )
                    
                    device_data = {
                        'device_id': device.id,
                        'device_name': device.name,
                        'plc_type': device.plc_type,
                        'ip_address': device.ip_address,
                        'is_connected': device.is_connected,
                        'last_collect_time': device.last_collect_time.isoformat() if device.last_collect_time else None,
                        'data': latest_data
                    }
                    
                    realtime_data.append(device_data)
                    
                except Exception as e:
                    logger.error(f"获取设备 {device.id} 实时数据异常: {e}")
                    device_data = {
                        'device_id': device.id,
                        'device_name': device.name,
                        'plc_type': device.plc_type,
                        'ip_address': device.ip_address,
                        'is_connected': device.is_connected,
                        'last_collect_time': device.last_collect_time.isoformat() if device.last_collect_time else None,
                        'data': [],
                        'error': '数据获取失败'
                    }
                    realtime_data.append(device_data)
            
            return {
                'success': True,
                'data': {
                    'realtime_data': realtime_data,
                    'timestamp': datetime.now().isoformat()
                },
                'message': '获取实时数据成功'
            }
            
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                'error': '参数格式错误',
                'code': 'INVALID_PARAMETERS'
            }
        )
    except Exception as e:
        logger.error(f"获取实时数据异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )
    
@router.get("/history")
def get_history_data(
    device_id: int = Query(..., description="设备ID"),
    start_time: Optional[str] = Query(None, description="开始时间(ISO格式)"),
    end_time: Optional[str] = Query(None, description="结束时间(ISO格式)"),
    address: Optional[str] = Query(None, description="地址过滤"),
    station_id: Optional[int] = Query(None, description="站号过滤"),
    limit: int = Query(1000, description="数据条数限制"),
    offset: int = Query(0, description="数据偏移量"),
    current_user: User = Depends(get_current_user)
):
    """获取历史数据"""
    try:
            
        with db_manager.get_db() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            
            if not device:
                raise HTTPException(
                    status_code=404,
                    detail={
                        'error': '设备不存在',
                        'code': 'DEVICE_NOT_FOUND'
                    }
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=403,
                    detail={
                        'error': '无权访问该设备数据',
                        'code': 'ACCESS_DENIED'
                    }
                )
                
            # 解析时间参数
            try:
                if start_time:
                    start_time_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                else:
                    # 默认查询最近24小时
                    start_time_dt = datetime.now() - timedelta(hours=24)
                
                if end_time:
                    end_time_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                else:
                    end_time_dt = datetime.now()
                    
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail={
                        'error': '时间格式错误，请使用ISO格式',
                        'code': 'INVALID_TIME_FORMAT'
                    }
                )
            
            # 限制查询范围（最多30天）
            if (end_time_dt - start_time_dt).days > 30:
                raise HTTPException(
                    status_code=400,
                    detail={
                        'error': '查询时间范围不能超过30天',
                        'code': 'TIME_RANGE_TOO_LARGE'
                    }
                )
                
            # 限制返回数据量
            if limit > 10000:
                limit = 10000
            
            try:
                # 构建查询地址，支持分离的地址和站号
                query_address = address
                if address and station_id is not None:
                    # 如果同时提供了地址和站号，构建组合查询以兼容现有的query_history_data方法
                    query_address = f"{address}_s{station_id}"

                # 从InfluxDB查询历史数据（基于设备配置）
                history_data = db_manager.query_history_data_by_device_config(
                    device_id=device_id,
                    start_time=start_time_dt,
                    end_time=end_time_dt,
                    address=address,
                    station_id=station_id,
                    limit=limit,
                    offset=offset
                )

                return {
                    'device_id': device_id,
                    'device_name': device.name,
                    'start_time': start_time_dt.isoformat(),
                    'end_time': end_time_dt.isoformat(),
                    'address': address,
                    'station_id': station_id,
                    'query_address': query_address,
                    'data_count': len(history_data),
                    'data': history_data
                }
                
            except Exception as e:
                logger.error(f"查询历史数据异常: {e}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        'error': '数据查询失败',
                        'code': 'QUERY_FAILED'
                    }
                )
            
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                'error': '参数格式错误',
                'code': 'INVALID_PARAMETERS'
            }
        )
    except Exception as e:
        logger.error(f"获取历史数据异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )
    
@router.get("/statistics")
def get_data_statistics(
    device_id: Optional[int] = Query(None, description="设备ID"),
    group_id: Optional[int] = Query(None, description="分组ID"),
    time_range: str = Query("24h", description="时间范围: 10m, 30m, 1h, 24h, 7d, 30d"),
    current_user: User = Depends(get_current_user)
):
    """获取数据统计信息"""
    try:
        # 计算时间范围
        now = datetime.now()
        if time_range == '10m':
            start_time = now - timedelta(minutes=10)
        elif time_range == '30m':
            start_time = now - timedelta(minutes=30)
        elif time_range == '1h':
            start_time = now - timedelta(hours=1)
        elif time_range == '24h':
            start_time = now - timedelta(hours=24)
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    'error': '无效的时间范围',
                    'code': 'INVALID_TIME_RANGE'
                }
            )
            
        with db_manager.get_db() as db:
            query = db.query(Device)
            
            # 权限过滤
            if current_user.role != 'super_admin':
                query = query.filter(Device.group_id == current_user.group_id)
            
            # 设备过滤
            if device_id:
                query = query.filter(Device.id == device_id)
            elif group_id:
                query = query.filter(Device.group_id == group_id)
            
            devices = query.filter(Device.is_active == True).all()
            
            # 获取统计数据
            statistics = []
            
            if not devices:
                # 如果没有设备，返回空的统计数据而不是抛出异常
                return {
                    'statistics': [],
                    'timestamp': now.isoformat(),
                    'message': '未找到符合条件的设备'
                }
                
            for device in devices:
                # 权限检查
                if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                    continue
                
                try:
                    # 从InfluxDB获取统计数据
                    device_stats = db_manager.query_statistics(
                        device_id=device.id,
                        start_time=start_time,
                        end_time=now
                    )
                    
                    device_statistics = {
                        'device_id': device.id,
                        'device_name': device.name,
                        'plc_type': device.plc_type,
                        'time_range': time_range,
                        'start_time': start_time.isoformat(),
                        'end_time': now.isoformat(),
                        'statistics': device_stats
                    }
                    
                    statistics.append(device_statistics)
                    
                except Exception as e:
                    logger.error(f"获取设备 {device.id} 统计数据异常: {e}")
                    device_statistics = {
                        'device_id': device.id,
                        'device_name': device.name,
                        'plc_type': device.plc_type,
                        'time_range': time_range,
                        'start_time': start_time.isoformat(),
                        'end_time': now.isoformat(),
                        'statistics': {},
                        'error': '统计数据获取失败'
                    }
                    statistics.append(device_statistics)
                
            return {
                'statistics': statistics,
                'timestamp': now.isoformat()
            }
            
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                'error': '参数格式错误',
                'code': 'INVALID_PARAMETERS'
            }
        )
    except Exception as e:
        logger.error(f"获取数据统计异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )
    
@router.get("/addresses/{device_id}")
def get_device_addresses(
    device_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取设备的采集地址列表"""
    try:
        with db_manager.get_db() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            
            if not device:
                raise HTTPException(
                    status_code=404,
                    detail={
                        'error': '设备不存在',
                        'code': 'DEVICE_NOT_FOUND'
                    }
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=403,
                    detail={
                        'error': '无权访问该设备',
                        'code': 'ACCESS_DENIED'
                    }
                )
            
            addresses = device.get_addresses()
            
            return {
                'device_id': device_id,
                'device_name': device.name,
                'addresses': addresses
            }
            
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={
                'error': '无效的设备ID',
                'code': 'INVALID_DEVICE_ID'
            }
        )
    except Exception as e:
        logger.error(f"获取设备地址列表异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )

@router.get("/anomalies")
def get_anomaly_analysis(
    device_id: Optional[int] = Query(None, description="设备ID"),
    group_id: Optional[int] = Query(None, description="分组ID"),
    time_range: str = Query("24h", description="时间范围"),
    current_user: User = Depends(get_current_user)
):
    """获取异常分析数据
    
    根据用户权限和分组筛选异常数据：
    - 超级管理员：可查看所有设备异常
    - 普通用户：只能查看所属分组的设备异常
    """
    try:
        # 解析时间范围
        now = datetime.now()
        if time_range == "10m":
            start_time = now - timedelta(minutes=10)
        elif time_range == "30m":
            start_time = now - timedelta(minutes=30)
        elif time_range == "1h":
            start_time = now - timedelta(hours=1)
        elif time_range == "6h":
            start_time = now - timedelta(hours=6)
        elif time_range == "24h":
            start_time = now - timedelta(hours=24)
        elif time_range == "7d":
            start_time = now - timedelta(days=7)
        elif time_range == "30d":
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(hours=24)
        
        # 权限控制：普通用户只能查看自己分组的数据
        if current_user.role != 'super_admin':
            if group_id and group_id != current_user.group_id:
                raise HTTPException(
                    status_code=403,
                    detail={
                        'error': '无权访问该分组数据',
                        'code': 'ACCESS_DENIED'
                    }
                )
            # 如果没有指定分组，默认使用用户所属分组
            if not group_id:
                group_id = current_user.group_id
            
            # 如果指定了设备，检查设备是否属于用户分组
            if device_id:
                with db_manager.get_db() as db:
                    device = db.query(Device).filter(Device.id == device_id).first()
                    if not device or device.group_id != current_user.group_id:
                        raise HTTPException(
                            status_code=403,
                            detail={
                                'error': '无权访问该设备',
                                'code': 'ACCESS_DENIED'
                            }
                        )
        
        # 查询异常数据
        anomaly_data = db_manager.query_anomalies(
            device_id=device_id,
            group_id=group_id,
            start_time=start_time,
            end_time=now
        )
        
        # 添加额外的统计信息
        anomaly_data['query_info'] = {
            'device_id': device_id,
            'group_id': group_id,
            'time_range': time_range,
            'user_role': current_user.role,
            'query_time': now.isoformat()
        }
        
        return anomaly_data
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                'error': '参数格式错误',
                'code': 'INVALID_PARAMETERS',
                'message': str(e)
            }
        )
    except Exception as e:
        logger.error(f"获取异常分析数据异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )

# 导出路由器
__all__ = ['router']