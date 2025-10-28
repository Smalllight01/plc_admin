#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设备性能分析API路由
提供设备性能统计、分析和监控功能
"""

import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from loguru import logger

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user
from database import db_manager
from models import Device, User, Group

# 创建路由器
router = APIRouter(prefix="/api/performance", tags=["performance"])

# Pydantic 模型
class ApiResponse(BaseModel):
    """API响应模型"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    message: str
    code: str = "SUCCESS"

class DevicePerformanceMetrics(BaseModel):
    """设备性能指标模型"""
    device_id: int
    device_name: str
    device_type: str
    ip_address: str
    group_name: str
    
    # 连接性能指标
    connection_uptime: float  # 连接正常运行时间百分比
    connection_failures: int  # 连接失败次数
    avg_response_time: float  # 平均响应时间(ms)
    
    # 数据采集性能指标
    data_collection_rate: float  # 数据采集成功率
    total_data_points: int  # 总数据点数
    successful_collections: int  # 成功采集次数
    failed_collections: int  # 失败采集次数
    
    # 数据质量指标
    data_completeness: float  # 数据完整性百分比
    data_anomalies: int  # 数据异常数量
    data_gaps: int  # 数据缺失次数
    
    # 时间相关指标
    last_collect_time: Optional[str] = None
    analysis_period: str  # 分析时间段
    
class PerformanceSummary(BaseModel):
    """性能汇总模型"""
    total_devices: int
    healthy_devices: int  # 健康设备数
    warning_devices: int  # 警告设备数
    critical_devices: int  # 严重问题设备数
    
    avg_uptime: float  # 平均正常运行时间
    avg_response_time: float  # 平均响应时间
    avg_collection_rate: float  # 平均采集成功率
    
    top_performers: List[Dict[str, Any]]  # 性能最佳设备
    poor_performers: List[Dict[str, Any]]  # 性能较差设备
    
class PerformanceTrend(BaseModel):
    """性能趋势模型"""
    timestamp: str
    uptime: float
    response_time: float
    collection_rate: float
    data_quality: float

@router.get("/overview")
async def get_performance_overview(
    group_id: Optional[int] = Query(None, description="分组ID"),
    hours: int = Query(24, description="分析时间范围(小时)"),
    current_user: User = Depends(get_current_user)
) -> ApiResponse:
    """获取设备性能概览"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        with db_manager.get_db() as db:
            # 构建设备查询
            query = db.query(Device)
            
            # 权限过滤
            if current_user.role != 'super_admin':
                query = query.filter(Device.group_id == current_user.group_id)
            elif group_id:
                query = query.filter(Device.group_id == group_id)
            
            devices = query.filter(Device.is_active == True).all()
            
            if not devices:
                return ApiResponse(
                    success=True,
                    data={
                        "summary": {
                            "total_devices": 0,
                            "healthy_devices": 0,
                            "warning_devices": 0,
                            "critical_devices": 0,
                            "avg_uptime": 0,
                            "avg_response_time": 0,
                            "avg_collection_rate": 0,
                            "top_performers": [],
                            "poor_performers": []
                        }
                    },
                    message="未找到设备数据"
                )
            
            # 计算性能指标
            device_metrics = []
            total_uptime = 0
            total_response_time = 0
            total_collection_rate = 0
            
            for device in devices:
                try:
                    # 获取设备分组信息
                    group = db.query(Group).filter(Group.id == device.group_id).first()
                    group_name = group.name if group else "未知分组"
                    
                    # 计算连接性能指标
                    metrics = await _calculate_device_performance(
                        device, start_time, end_time
                    )
                    
                    device_metric = {
                        "device_id": device.id,
                        "device_name": device.name,
                        "device_type": device.plc_type,
                        "ip_address": device.ip_address,
                        "group_name": group_name,
                        **metrics
                    }
                    
                    device_metrics.append(device_metric)
                    
                    # 累计统计
                    total_uptime += metrics["connection_uptime"]
                    total_response_time += metrics["avg_response_time"]
                    total_collection_rate += metrics["data_collection_rate"]
                    
                except Exception as e:
                    logger.warning(f"计算设备 {device.id} 性能指标失败: {e}")
                    continue
            
            # 计算汇总统计
            device_count = len(device_metrics)
            if device_count > 0:
                avg_uptime = total_uptime / device_count
                avg_response_time = total_response_time / device_count
                avg_collection_rate = total_collection_rate / device_count
            else:
                avg_uptime = avg_response_time = avg_collection_rate = 0
            
            # 设备健康状态分类
            healthy_devices = 0
            warning_devices = 0
            critical_devices = 0
            
            for metric in device_metrics:
                health_score = _calculate_health_score(metric)
                if health_score >= 80:
                    healthy_devices += 1
                elif health_score >= 60:
                    warning_devices += 1
                else:
                    critical_devices += 1
            
            # 排序获取最佳和最差性能设备
            sorted_metrics = sorted(
                device_metrics, 
                key=lambda x: _calculate_health_score(x), 
                reverse=True
            )
            
            top_performers = sorted_metrics[:5]
            poor_performers = sorted_metrics[-5:] if len(sorted_metrics) > 5 else []
            
            summary = {
                "total_devices": device_count,
                "healthy_devices": healthy_devices,
                "warning_devices": warning_devices,
                "critical_devices": critical_devices,
                "avg_uptime": round(avg_uptime, 2),
                "avg_response_time": round(avg_response_time, 2),
                "avg_collection_rate": round(avg_collection_rate, 2),
                "top_performers": [
                    {
                        "device_id": m["device_id"],
                        "device_name": m["device_name"],
                        "health_score": _calculate_health_score(m)
                    } for m in top_performers
                ],
                "poor_performers": [
                    {
                        "device_id": m["device_id"],
                        "device_name": m["device_name"],
                        "health_score": _calculate_health_score(m)
                    } for m in poor_performers
                ]
            }
            
            return ApiResponse(
                success=True,
                data={
                    "summary": summary,
                    "devices": device_metrics,
                    "analysis_period": f"{hours}小时",
                    "analysis_time": end_time.isoformat()
                },
                message="获取设备性能概览成功"
            )
            
    except Exception as e:
        logger.error(f"获取设备性能概览异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )

@router.get("/device/{device_id}")
async def get_device_performance(
    device_id: int,
    hours: int = Query(24, description="分析时间范围(小时)"),
    current_user: User = Depends(get_current_user)
) -> ApiResponse:
    """获取单个设备的详细性能分析"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        with db_manager.get_db() as db:
            # 获取设备信息
            device = db.query(Device).filter(
                Device.id == device_id,
                Device.is_active == True
            ).first()
            
            if not device:
                raise HTTPException(
                    status_code=404,
                    detail={
                        'error': '设备不存在或已禁用',
                        'code': 'DEVICE_NOT_FOUND'
                    }
                )
            
            # 权限检查
            if current_user.role != 'super_admin' and device.group_id != current_user.group_id:
                raise HTTPException(
                    status_code=403,
                    detail={
                        'error': '无权限访问该设备',
                        'code': 'PERMISSION_DENIED'
                    }
                )
            
            # 获取设备分组信息
            group = db.query(Group).filter(Group.id == device.group_id).first()
            group_name = group.name if group else "未知分组"
            
            # 计算详细性能指标
            metrics = await _calculate_device_performance(
                device, start_time, end_time, detailed=True
            )
            
            # 获取性能趋势数据
            trends = await _get_performance_trends(
                device_id, start_time, end_time
            )
            
            device_performance = DevicePerformanceMetrics(
                device_id=device.id,
                device_name=device.name,
                device_type=device.plc_type,
                ip_address=device.ip_address,
                group_name=group_name,
                last_collect_time=device.last_collect_time.isoformat() if device.last_collect_time else None,
                analysis_period=f"{hours}小时",
                **metrics
            )
            
            return ApiResponse(
                success=True,
                data={
                    "device_performance": device_performance.dict(),
                    "trends": trends,
                    "health_score": _calculate_health_score(metrics),
                    "recommendations": _generate_recommendations(metrics)
                },
                message="获取设备性能分析成功"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取设备性能分析异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )

@router.get("/trends")
async def get_performance_trends(
    device_id: Optional[int] = Query(None, description="设备ID"),
    group_id: Optional[int] = Query(None, description="分组ID"),
    hours: int = Query(24, description="分析时间范围(小时)"),
    interval: int = Query(1, description="数据间隔(小时)"),
    current_user: User = Depends(get_current_user)
) -> ApiResponse:
    """获取性能趋势数据"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        with db_manager.get_db() as db:
            # 构建设备查询
            query = db.query(Device)
            
            # 权限过滤
            if current_user.role != 'super_admin':
                query = query.filter(Device.group_id == current_user.group_id)
            elif group_id:
                query = query.filter(Device.group_id == group_id)
            
            if device_id:
                query = query.filter(Device.id == device_id)
            
            devices = query.filter(Device.is_active == True).all()
            
            if not devices:
                return ApiResponse(
                    success=True,
                    data={"trends": []},
                    message="未找到设备数据"
                )
            
            # 获取趋势数据
            all_trends = []
            for device in devices:
                device_trends = await _get_performance_trends(
                    device.id, start_time, end_time, interval
                )
                
                for trend in device_trends:
                    trend["device_id"] = device.id
                    trend["device_name"] = device.name
                    all_trends.append(trend)
            
            return ApiResponse(
                success=True,
                data={"trends": all_trends},
                message="获取性能趋势数据成功"
            )
            
    except Exception as e:
        logger.error(f"获取性能趋势数据异常: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                'error': '服务器内部错误',
                'code': 'INTERNAL_ERROR'
            }
        )

# 辅助函数
async def _calculate_device_performance(
    device: Device, 
    start_time: datetime, 
    end_time: datetime,
    detailed: bool = False
) -> Dict[str, Any]:
    """计算设备性能指标"""
    try:
        # 获取采集日志统计
        with db_manager.get_db() as db:
            from models import CollectLog
            
            # 查询采集日志
            logs = db.query(CollectLog).filter(
                CollectLog.device_id == device.id,
                CollectLog.collect_time >= start_time,
                CollectLog.collect_time <= end_time
            ).all()
            
            total_collections = len(logs)
            successful_collections = len([log for log in logs if log.status == 'success'])
            failed_collections = total_collections - successful_collections
            
            # 计算采集成功率
            data_collection_rate = (
                (successful_collections / total_collections * 100) 
                if total_collections > 0 else 0
            )
            
            # 计算平均响应时间（从日志中获取）
            response_times = [log.response_time for log in logs if log.response_time is not None]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 100
            
            # 计算连接正常运行时间
            connection_failures = failed_collections
            total_time_hours = (end_time - start_time).total_seconds() / 3600
            expected_collections = max(1, int(total_time_hours))  # 假设每小时至少采集一次
            
            connection_uptime = (
                (successful_collections / expected_collections * 100)
                if expected_collections > 0 else 0
            )
            connection_uptime = min(100, connection_uptime)  # 限制在100%以内
            
        # 获取InfluxDB数据统计
        try:
            influx_stats = db_manager.query_statistics(
                device.id, start_time, end_time
            )
            
            total_data_points = influx_stats.get('total_points', 0) if influx_stats else 0
            
            # 获取异常数据统计
            anomalies = db_manager.query_anomalies(
                start_time=start_time,
                end_time=end_time,
                device_id=device.id
            )
            
            data_anomalies = len(anomalies) if anomalies else 0
            
        except Exception as e:
            logger.warning(f"获取InfluxDB统计数据失败: {e}")
            total_data_points = 0
            data_anomalies = 0
        
        # 计算数据完整性
        expected_data_points = expected_collections * 10  # 假设每次采集10个数据点
        data_completeness = (
            (total_data_points / expected_data_points * 100)
            if expected_data_points > 0 else 0
        )
        data_completeness = min(100, data_completeness)
        
        # 计算数据缺失次数
        data_gaps = max(0, expected_collections - successful_collections)
        
        metrics = {
            "connection_uptime": round(connection_uptime, 2),
            "connection_failures": connection_failures,
            "avg_response_time": round(avg_response_time, 2),
            "data_collection_rate": round(data_collection_rate, 2),
            "total_data_points": total_data_points,
            "successful_collections": successful_collections,
            "failed_collections": failed_collections,
            "data_completeness": round(data_completeness, 2),
            "data_anomalies": data_anomalies,
            "data_gaps": data_gaps
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"计算设备性能指标异常: {e}")
        # 返回默认值
        return {
            "connection_uptime": 0,
            "connection_failures": 0,
            "avg_response_time": 0,
            "data_collection_rate": 0,
            "total_data_points": 0,
            "successful_collections": 0,
            "failed_collections": 0,
            "data_completeness": 0,
            "data_anomalies": 0,
            "data_gaps": 0
        }

async def _get_performance_trends(
    device_id: int,
    start_time: datetime,
    end_time: datetime,
    interval_hours: int = 1
) -> List[Dict[str, Any]]:
    """获取设备性能趋势数据"""
    try:
        trends = []
        current_time = start_time
        
        while current_time < end_time:
            next_time = current_time + timedelta(hours=interval_hours)
            if next_time > end_time:
                next_time = end_time
            
            # 获取时间段内的性能数据
            with db_manager.get_db() as db:
                device = db.query(Device).filter(Device.id == device_id).first()
                if device:
                    metrics = await _calculate_device_performance(
                        device, current_time, next_time
                    )
                    
                    # 计算数据质量分数
                    data_quality = (
                        metrics["data_completeness"] * 0.6 +
                        (100 - min(100, metrics["data_anomalies"] * 10)) * 0.4
                    )
                    
                    trend = {
                        "timestamp": current_time.isoformat(),
                        "uptime": metrics["connection_uptime"],
                        "response_time": metrics["avg_response_time"],
                        "collection_rate": metrics["data_collection_rate"],
                        "data_quality": round(data_quality, 2)
                    }
                    
                    trends.append(trend)
            
            current_time = next_time
        
        return trends
        
    except Exception as e:
        logger.error(f"获取性能趋势数据异常: {e}")
        return []

def _calculate_health_score(metrics: Dict[str, Any]) -> float:
    """计算设备健康分数"""
    try:
        # 权重配置
        weights = {
            "connection_uptime": 0.3,
            "data_collection_rate": 0.25,
            "data_completeness": 0.2,
            "response_time": 0.15,
            "anomalies": 0.1
        }
        
        # 标准化指标
        uptime_score = metrics.get("connection_uptime", 0)
        collection_score = metrics.get("data_collection_rate", 0)
        completeness_score = metrics.get("data_completeness", 0)
        
        # 响应时间分数（响应时间越低分数越高）
        response_time = metrics.get("avg_response_time", 1000)
        response_score = max(0, 100 - (response_time / 10))  # 1000ms对应0分，0ms对应100分
        
        # 异常分数（异常越少分数越高）
        anomalies = metrics.get("data_anomalies", 0)
        anomaly_score = max(0, 100 - (anomalies * 5))  # 每个异常扣5分
        
        # 计算加权总分
        health_score = (
            uptime_score * weights["connection_uptime"] +
            collection_score * weights["data_collection_rate"] +
            completeness_score * weights["data_completeness"] +
            response_score * weights["response_time"] +
            anomaly_score * weights["anomalies"]
        )
        
        return round(health_score, 2)
        
    except Exception as e:
        logger.error(f"计算健康分数异常: {e}")
        return 0.0

def _generate_recommendations(metrics: Dict[str, Any]) -> List[str]:
    """生成性能优化建议"""
    recommendations = []
    
    try:
        # 连接性能建议
        if metrics.get("connection_uptime", 0) < 90:
            recommendations.append("设备连接不稳定，建议检查网络连接和PLC设备状态")
        
        if metrics.get("connection_failures", 0) > 10:
            recommendations.append("连接失败次数过多，建议检查网络配置和设备可达性")
        
        # 响应时间建议
        if metrics.get("avg_response_time", 0) > 500:
            recommendations.append("设备响应时间较长，建议优化网络环境或调整采集频率")
        
        # 数据采集建议
        if metrics.get("data_collection_rate", 0) < 80:
            recommendations.append("数据采集成功率较低，建议检查PLC地址配置和设备状态")
        
        # 数据质量建议
        if metrics.get("data_completeness", 0) < 85:
            recommendations.append("数据完整性不足，建议检查采集配置和存储系统")
        
        if metrics.get("data_anomalies", 0) > 5:
            recommendations.append("检测到较多数据异常，建议检查设备运行状态和数据有效性")
        
        if metrics.get("data_gaps", 0) > 5:
            recommendations.append("数据缺失较多，建议检查采集任务调度和系统资源")
        
        # 如果没有问题，给出正面反馈
        if not recommendations:
            recommendations.append("设备运行状态良好，性能指标正常")
        
    except Exception as e:
        logger.error(f"生成建议异常: {e}")
        recommendations.append("无法生成性能建议，请检查系统状态")
    
    return recommendations