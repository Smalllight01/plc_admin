# -*- coding: utf-8 -*-
"""
PLC数据采集服务
负责PLC设备的连接、数据采集和存储
"""

import threading
import time
from datetime import datetime
from typing import Dict, List, Optional
from loguru import logger
from apscheduler.schedulers.background import BackgroundScheduler

# 尝试导入CLR和HslCommunication
try:
    import clr
    # 确保 HslCommunication.dll 在 Python 的搜索路径中
    clr.AddReference(r'HslCommunication')
    
    # 导入需要的命名空间和类
    from HslCommunication.Profinet.Omron import OmronFinsNet, OmronPlcType
    from HslCommunication.Profinet.Siemens import SiemensS7Net, SiemensPLCS
    from HslCommunication.Core import DataFormat
    from HslCommunication.Core.Pipe import PipeTcpNet
    
    CLR_AVAILABLE = True
    logger.info("CLR和HslCommunication库加载成功")
except Exception as e:
    logger.error(f"CLR或HslCommunication库加载失败: {e}")
    logger.error("请确保已安装Mono运行时和HslCommunication.dll")
    CLR_AVAILABLE = False
    
    # 定义占位符类以避免导入错误
    class OmronFinsNet: pass
    class OmronPlcType: pass
    class SiemensS7Net: pass
    class SiemensPLCS: pass
    class DataFormat: pass
    class PipeTcpNet: pass

from config import config
from database import db_manager
from models import Device, CollectLog
import json
import os

class PLCConnection:
    """PLC连接类"""
    
    def __init__(self, device: Device):
        self.device = device
        self.plc = None
        self.is_connected = False
        self.last_error = None
        self._lock = threading.Lock()
        
        # 根据PLC型号创建对应的连接对象
        self._create_plc_instance()
    
    def _create_plc_instance(self):
        """根据设备配置创建PLC实例"""
        try:
            if not globals().get('CLR_AVAILABLE', False):
                logger.error(f"CLR环境不可用，无法创建PLC实例: {self.device.name}")
                self.last_error = "CLR环境不可用"
                return
                
            plc_type_lower = self.device.plc_type.lower()
            
            if 'omron' in plc_type_lower or '欧姆龙' in plc_type_lower:
                self.plc = OmronFinsNet()
                self.plc.PlcType = OmronPlcType.CSCJ
                self.plc.DA2 = 0
                self.plc.ReceiveUntilEmpty = False
                self.plc.ByteTransform.DataFormat = DataFormat.CDAB
                self.plc.ByteTransform.IsStringReverseByteWord = True
                
            elif 'siemens' in plc_type_lower or '西门子' in plc_type_lower:
                self.plc = SiemensS7Net(SiemensPLCS.S1200)
                self.plc.ByteTransform.DataFormat = DataFormat.DCBA
                
            else:
                # 默认使用欧姆龙
                logger.warning(f"未知的PLC型号 {self.device.plc_type}，使用默认欧姆龙配置")
                self.plc = OmronFinsNet()
                self.plc.PlcType = OmronPlcType.CSCJ
            
            # 设置通信管道
            if self.device.protocol.lower() == 'tcp':
                pipe_tcp_net = PipeTcpNet(self.device.ip_address, self.device.port)
                # 使用默认配置，稍后会在PLCCollector中更新
                pipe_tcp_net.ConnectTimeOut = config.PLC_CONNECT_TIMEOUT
                pipe_tcp_net.ReceiveTimeOut = config.PLC_RECEIVE_TIMEOUT
                self.plc.CommunicationPipe = pipe_tcp_net
            
            logger.info(f"PLC实例创建成功: {self.device.name} ({self.device.plc_type})")
            
        except Exception as e:
            logger.error(f"创建PLC实例失败 {self.device.name}: {e}")
            self.last_error = str(e)
    
    def connect(self) -> bool:
        """连接PLC"""
        with self._lock:
            try:
                if not self.plc:
                    self.last_error = "PLC实例未创建"
                    return False
                
                connect_result = self.plc.ConnectServer()
                if connect_result.IsSuccess:
                    self.is_connected = True
                    self.last_error = None
                    logger.info(f"PLC连接成功: {self.device.name}")
                    return True
                else:
                    self.is_connected = False
                    self.last_error = connect_result.Message
                    logger.error(f"PLC连接失败 {self.device.name}: {connect_result.Message}")
                    # 记录通信异常到InfluxDB
                    from database import db_manager
                    db_manager.write_communication_error(self.device.id, self.device.name, connect_result.Message)
                    return False
                    
            except Exception as e:
                self.is_connected = False
                self.last_error = str(e)
                logger.error(f"PLC连接异常 {self.device.name}: {e}")
                # 记录通信异常到InfluxDB
                from database import db_manager
                db_manager.write_communication_error(self.device.id, self.device.name, str(e))
                return False
    
    def disconnect(self):
        """断开PLC连接"""
        with self._lock:
            try:
                if self.plc and self.is_connected:
                    self.plc.ConnectClose()
                    self.is_connected = False
                    logger.info(f"PLC断开连接: {self.device.name}")
            except Exception as e:
                logger.error(f"断开PLC连接失败 {self.device.name}: {e}")
    
    def update_timeouts(self, connect_timeout: int, receive_timeout: int):
        """更新连接和接收超时配置"""
        try:
            if self.plc and hasattr(self.plc, 'CommunicationPipe') and self.plc.CommunicationPipe:
                self.plc.CommunicationPipe.ConnectTimeOut = connect_timeout
                self.plc.CommunicationPipe.ReceiveTimeOut = receive_timeout
                logger.info(f"更新PLC超时配置 {self.device.name}: 连接超时={connect_timeout}ms, 接收超时={receive_timeout}ms")
        except Exception as e:
            logger.error(f"更新PLC超时配置失败 {self.device.name}: {e}")
    
    def read_addresses(self, addresses: List[str]) -> tuple[Dict[str, Optional[float]], bool]:
        """批量读取地址数据
        
        Returns:
            tuple: (数据字典, 是否在线)
                - 数据字典: {地址: 值}
                - 是否在线: True表示PLC在线，False表示PLC离线
        """
        if not self.is_connected:
            logger.warning(f"PLC未连接，无法读取数据: {self.device.name}")
            return {addr: None for addr in addresses}, False
        
        with self._lock:
            try:
                chunk_size = 10  # 每次读取的地址数量
                all_values = {}
                has_network_communication = False  # 是否有网络通信
                
                for i in range(0, len(addresses), chunk_size):
                    chunk_addresses = addresses[i:i + chunk_size]
                    
                    # 读取数据
                    read_result = self.plc.Read(chunk_addresses)
                    
                    if read_result.IsSuccess:
                        # 读取成功，说明网络通信正常，PLC在线
                        has_network_communication = True
                        try:
                            # 解析数据
                            values = self.plc.ByteTransform.TransInt16(
                                read_result.Content, 0, len(chunk_addresses)
                            )
                            
                            if values:
                                for idx, addr in enumerate(chunk_addresses):
                                    all_values[addr] = float(values[idx])
                            else:
                                for addr in chunk_addresses:
                                    all_values[addr] = None
                                    
                        except Exception as e:
                            logger.error(f"解析数据失败 {self.device.name}: {e}")
                            for addr in chunk_addresses:
                                all_values[addr] = None
                    else:
                        # 读取失败，需要判断是网络问题还是地址问题
                        error_msg = read_result.Message.lower() if read_result.Message else ""
                        
                        # 检查是否为网络相关错误
                        network_errors = [
                            'timeout', 'connection', 'network', 'socket', 
                            'unreachable', 'refused', 'reset', 'closed'
                        ]
                        
                        is_network_error = any(err in error_msg for err in network_errors)
                        
                        if is_network_error:
                            # 网络错误，认为PLC离线
                            logger.error(f"网络通信失败 {self.device.name}: {read_result.Message}")
                            for addr in chunk_addresses:
                                all_values[addr] = None
                        else:
                            # 非网络错误（如地址错误、权限问题等），认为PLC在线但数据读取失败
                            has_network_communication = True
                            logger.warning(f"数据读取失败但PLC在线 {self.device.name}: {read_result.Message}")
                            for addr in chunk_addresses:
                                all_values[addr] = None
                
                # 更新连接状态
                self.is_connected = has_network_communication
                if not has_network_communication:
                    self.last_error = "网络通信失败"
                
                return all_values, has_network_communication
                
            except Exception as e:
                # 异常情况，通常是网络问题，认为PLC离线
                logger.error(f"读取地址数据异常 {self.device.name}: {e}")
                self.is_connected = False
                self.last_error = str(e)
                return {addr: None for addr in addresses}, False

class PLCCollector:
    """PLC数据采集器"""
    
    def __init__(self):
        self.connections: Dict[int, PLCConnection] = {}
        self.scheduler = BackgroundScheduler()
        self.is_running = False
        self._lock = threading.Lock()
        self.current_settings = None
        
        # 检查CLR环境是否可用
        if not globals().get('CLR_AVAILABLE', False):
            logger.error("CLR环境不可用，PLC采集功能将被禁用")
            logger.error("请安装Mono运行时并确保HslCommunication.dll可用")
            logger.error("系统将继续运行，但PLC采集功能不可用")
            self.clr_available = False
        else:
            self.clr_available = True
            logger.info("CLR环境正常，PLC采集功能可用")
    
    def _load_system_settings(self) -> dict:
        """加载系统设置"""
        try:
            settings_file = "system_settings.json"
            if os.path.exists(settings_file):
                with open(settings_file, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                    return settings
            else:
                # 返回默认设置
                return {
                    "plc_collect_interval": config.PLC_COLLECT_INTERVAL,
                    "plc_connect_timeout": config.PLC_CONNECT_TIMEOUT,
                    "plc_receive_timeout": config.PLC_RECEIVE_TIMEOUT
                }
        except Exception as e:
            logger.error(f"加载系统设置失败: {e}")
            # 返回默认设置
            return {
                "plc_collect_interval": config.PLC_COLLECT_INTERVAL,
                "plc_connect_timeout": config.PLC_CONNECT_TIMEOUT,
                "plc_receive_timeout": config.PLC_RECEIVE_TIMEOUT
            }
    
    def start(self):
        """启动采集服务"""
        if self.is_running:
            logger.warning("PLC采集服务已在运行")
            return
        
        if not self.clr_available:
            logger.warning("CLR环境不可用，PLC采集服务无法启动")
            logger.warning("系统将继续运行，但PLC采集功能不可用")
            return
        
        logger.info("启动PLC采集服务")
        
        # 加载系统设置
        self.current_settings = self._load_system_settings()
        
        # 加载设备配置
        self._load_devices()
        
        # 启动数据采集定时任务
        collect_interval = self.current_settings.get('plc_collect_interval', config.PLC_COLLECT_INTERVAL)
        self.scheduler.add_job(
            func=self._collect_all_devices,
            trigger="interval",
            seconds=collect_interval,
            id='plc_collect_job'
        )
        
        # 启动数据清理定时任务（每天凌晨2点执行）
        self.scheduler.add_job(
            func=self._cleanup_old_data,
            trigger="cron",
            hour=2,
            minute=0,
            id='data_cleanup_job'
        )
        
        self.scheduler.start()
        self.is_running = True
        
        logger.info(f"PLC采集服务启动成功，采集间隔: {collect_interval}秒，数据清理任务已启动")
    
    def reload_settings(self):
        """重新加载系统设置并应用配置"""
        if not self.is_running:
            logger.warning("PLC采集服务未运行，无法重新加载设置")
            return
        
        logger.info("重新加载PLC采集配置")
        
        # 加载新的系统设置
        new_settings = self._load_system_settings()
        old_interval = self.current_settings.get('plc_collect_interval', config.PLC_COLLECT_INTERVAL) if self.current_settings else config.PLC_COLLECT_INTERVAL
        new_interval = new_settings.get('plc_collect_interval', config.PLC_COLLECT_INTERVAL)
        
        self.current_settings = new_settings
        
        # 更新所有连接的超时配置
        connect_timeout = new_settings.get('plc_connect_timeout', config.PLC_CONNECT_TIMEOUT)
        receive_timeout = new_settings.get('plc_receive_timeout', config.PLC_RECEIVE_TIMEOUT)
        
        logger.info(f"应用新的超时配置: 连接超时={connect_timeout}ms, 接收超时={receive_timeout}ms")
        
        with self._lock:
            for connection in self.connections.values():
                connection.update_timeouts(connect_timeout, receive_timeout)
        
        # 检查最大并发连接数是否发生变化
        old_max_connections = self.current_settings.get('max_concurrent_connections', 100) if hasattr(self, 'current_settings') and self.current_settings else 100
        new_max_connections = new_settings.get('max_concurrent_connections', 100)
        
        # 如果采集间隔发生变化，重新调度任务
        if old_interval != new_interval:
            logger.info(f"采集间隔从 {old_interval}秒 更改为 {new_interval}秒，重新调度任务")
            
            # 移除旧任务
            if self.scheduler.get_job('plc_collect_job'):
                self.scheduler.remove_job('plc_collect_job')
            
            # 添加新任务
            self.scheduler.add_job(
                func=self._collect_all_devices,
                trigger="interval",
                seconds=new_interval,
                id='plc_collect_job'
            )
        
        # 如果最大并发连接数发生变化，重新加载设备
        if old_max_connections != new_max_connections:
            logger.info(f"最大并发连接数从 {old_max_connections} 更改为 {new_max_connections}，重新加载设备")
            self._load_devices()
        
        logger.info(f"PLC采集配置重新加载完成，当前采集间隔: {new_interval}秒，最大并发连接数: {new_max_connections}")
    
    def stop(self):
        """停止采集服务"""
        if not self.is_running:
            return
        
        logger.info("停止PLC采集服务")
        
        # 停止定时任务
        if self.scheduler.running:
            self.scheduler.shutdown()
        
        # 断开所有连接
        with self._lock:
            for connection in self.connections.values():
                connection.disconnect()
            self.connections.clear()
        
        self.is_running = False
        logger.info("PLC采集服务已停止")
    
    def _load_devices(self):
        """加载设备配置（支持最大并发连接数限制）"""
        try:
            # 获取最大并发连接数配置
            max_connections = self.current_settings.get('max_concurrent_connections', 100) if self.current_settings else 100
            
            with db_manager.get_db() as db:
                devices = db.query(Device).filter(Device.is_active == True).all()
                
                # 在会话内完成所有数据访问，避免会话外访问对象属性
                device_data = []
                for device in devices:
                    device_data.append({
                        'id': device.id,
                        'name': device.name,
                        'plc_type': device.plc_type,
                        'protocol': device.protocol,
                        'ip_address': device.ip_address,
                        'port': device.port,
                        'addresses': device.addresses,
                        'group_id': device.group_id
                    })
                
                # 按组别和设备ID排序，确保连接的优先级
                device_data.sort(key=lambda d: (d['group_id'] or 999, d['id']))
                
                # 应用最大并发连接数限制
                if len(device_data) > max_connections:
                    logger.warning(f"设备数量({len(device_data)})超过最大并发连接数({max_connections})，只连接前{max_connections}个设备")
                    device_data = device_data[:max_connections]
                
                with self._lock:
                    # 清除旧连接
                    for connection in self.connections.values():
                        connection.disconnect()
                    self.connections.clear()
                    
                    # 创建新连接
                    for data in device_data:
                        # 重新创建Device对象，避免会话绑定问题
                        device_obj = Device(
                            id=data['id'],
                            name=data['name'],
                            plc_type=data['plc_type'],
                            protocol=data['protocol'],
                            ip_address=data['ip_address'],
                            port=data['port'],
                            addresses=data['addresses'],
                            group_id=data['group_id']
                        )
                        
                        connection = PLCConnection(device_obj)
                        
                        # 应用动态配置的超时参数
                        if self.current_settings:
                            connect_timeout = self.current_settings.get('plc_connect_timeout', config.PLC_CONNECT_TIMEOUT)
                            receive_timeout = self.current_settings.get('plc_receive_timeout', config.PLC_RECEIVE_TIMEOUT)
                            connection.update_timeouts(connect_timeout, receive_timeout)
                        
                        self.connections[data['id']] = connection
                        
                        # 尝试连接并更新数据库状态
                        is_connected = connection.connect()
                        
                        # 在新的会话中更新设备连接状态
                        with db_manager.get_db() as update_db:
                            db_device = update_db.query(Device).filter(Device.id == data['id']).first()
                            if db_device:
                                db_device.is_connected = is_connected
                                db_device.status = 'online' if is_connected else 'offline'
                                update_db.commit()
                
                logger.info(f"加载了 {len(device_data)} 个设备配置，最大并发连接数: {max_connections}")
                
        except Exception as e:
            logger.error(f"加载设备配置失败: {e}")
    
    def _collect_all_devices(self):
        """采集所有设备数据"""
        try:
            with db_manager.get_db() as db:
                devices = db.query(Device).filter(Device.is_active == True).all()
                
                # 在会话内获取设备数据，避免会话外访问
                device_data = []
                for device in devices:
                    device_data.append({
                        'id': device.id,
                        'name': device.name,
                        'addresses': device.addresses
                    })
            
            # 在会话外进行数据采集
            for data in device_data:
                # 重新创建简化的Device对象用于采集
                device_obj = Device(
                    id=data['id'],
                    name=data['name'],
                    addresses=data['addresses']
                )
                self._collect_device_data(device_obj)
                    
        except Exception as e:
            logger.error(f"采集设备数据失败: {e}")
    
    def _collect_device_data(self, device: Device):
        """采集单个设备数据"""
        try:
            # 获取设备基本信息，避免会话绑定问题
            device_id = device.id
            device_name = device.name
            
            connection = self.connections.get(device_id)
            if not connection:
                logger.warning(f"设备连接不存在: {device_name}")
                return
            
            # 如果连接断开，尝试重连
            if not connection.is_connected:
                if not connection.connect():
                    error_msg = f"连接失败: {connection.last_error}"
                    self._log_collect_result(device_id, "failed", error_msg)
                    # 将通信异常记录到InfluxDB
                    db_manager.write_communication_error(device_id, device_name, connection.last_error)
                    return
            
            # 获取采集地址
            addresses = device.get_addresses()
            if not addresses:
                logger.warning(f"设备 {device_name} 没有配置采集地址")
                return
            
            # 读取数据
            values, is_online = connection.read_addresses(addresses)
            
            # 存储数据到InfluxDB
            success_count = 0
            for address, value in values.items():
                if value is not None:
                    if db_manager.write_plc_data(
                        device_id=device_id,
                        device_name=device_name,
                        address=address,
                        value=value
                    ):
                        success_count += 1
            
            # 更新设备最后采集时间和在线状态
            with db_manager.get_db() as db:
                db_device = db.query(Device).filter(Device.id == device_id).first()
                if db_device:
                    db_device.last_collect_time = datetime.now()
                    # 使用基于网络通信的在线状态判断
                    db_device.is_connected = is_online
                    # 如果在线，清除错误信息；如果离线，记录错误信息
                    if is_online:
                        db_device.status = 'online'
                    else:
                        db_device.status = 'offline'
                    db.commit()
            
            # 记录采集日志
            if success_count > 0:
                self._log_collect_result(
                    device.id, 
                    "success", 
                    f"成功采集 {success_count}/{len(addresses)} 个地址"
                )
            else:
                self._log_collect_result(
                    device.id, 
                    "failed", 
                    "所有地址采集失败"
                )
            
            logger.debug(f"设备 {device.name} 数据采集完成: {success_count}/{len(addresses)}")
            
        except Exception as e:
            logger.error(f"采集设备 {device.name} 数据异常: {e}")
            self._log_collect_result(device.id, "error", str(e))
    
    def _log_collect_result(self, device_id: int, status: str, message: str):
        """记录采集结果"""
        try:
            with db_manager.get_db() as db:
                log = CollectLog(
                    device_id=device_id,
                    status=status,
                    message=message
                )
                db.add(log)
                db.commit()
        except Exception as e:
            logger.error(f"记录采集日志失败: {e}")
    
    def reload_devices(self):
        """重新加载设备配置"""
        logger.info("重新加载设备配置")
        self._load_devices()
    
    def get_device_status(self, device_id: int = None) -> Dict:
        """获取设备连接状态
        
        Args:
            device_id: 设备ID，如果为None则返回所有设备状态
            
        Returns:
            如果指定device_id，返回单个设备状态字典
            如果device_id为None，返回所有设备状态字典
        """
        with self._lock:
            if device_id is not None:
                # 返回单个设备状态
                connection = self.connections.get(device_id)
                if connection:
                    return {
                        'is_connected': connection.is_connected,
                        'last_error': connection.last_error,
                        'device_name': connection.device.name,
                        'status': 'online' if connection.is_connected else 'offline'
                    }
                else:
                    return {
                        'is_connected': False,
                        'last_error': '设备连接不存在',
                        'device_name': 'Unknown',
                        'status': 'offline'
                    }
            else:
                # 返回所有设备状态
                status = {}
                for dev_id, connection in self.connections.items():
                    status[dev_id] = {
                        'is_connected': connection.is_connected,
                        'last_error': connection.last_error,
                        'device_name': connection.device.name,
                        'status': 'online' if connection.is_connected else 'offline'
                    }
                return status
    
    def _cleanup_old_data(self):
        """清理过期的历史数据"""
        try:
            # 获取数据保留天数配置
            retention_days = self.current_settings.get('data_retention_days', 30) if self.current_settings else 30
            
            if retention_days <= 0:
                logger.info("数据保留天数设置为0或负数，跳过数据清理")
                return
            
            logger.info(f"开始清理{retention_days}天前的历史数据")
            
            # 计算截止时间
            from datetime import datetime, timedelta
            cutoff_time = datetime.utcnow() - timedelta(days=retention_days)
            cutoff_timestamp = cutoff_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            # 调用数据库管理器的清理方法
            deleted_count = db_manager.cleanup_old_data(cutoff_timestamp)
            
            if deleted_count > 0:
                logger.info(f"数据清理完成，删除了{deleted_count}条记录")
            else:
                logger.info("没有需要清理的过期数据")
                
        except Exception as e:
            logger.error(f"数据清理失败: {e}")