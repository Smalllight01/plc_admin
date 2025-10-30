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

# 尝试导入CLR（用于检查环境）
try:
    import clr
    # 确保 HslCommunication.dll 在 Python 的搜索路径中
    clr.AddReference(r'HslCommunication')
    CLR_AVAILABLE = True
    logger.info("CLR环境检查成功")
except Exception as e:
    logger.error(f"CLR环境检查失败: {e}")
    logger.error("请确保已安装Mono运行时和HslCommunication.dll")
    CLR_AVAILABLE = False

from config import config
from database import db_manager
from models import Device, CollectLog
import json
import os

# 导入协议处理器
from protocols import ProtocolFactory

# 不再使用新协议采集器
PROTOCOL_COLLECTOR_AVAILABLE = False
logger.info("使用协议独立的采集器（已重构为模块化架构）")

class PLCConnection:
    """PLC连接类（重构为协议独立）"""

    def __init__(self, device: Device):
        self.device = device
        self.is_connected = False
        self.last_error = None
        self._lock = threading.Lock()

        # 使用工厂模式创建协议处理器
        self.protocol_handler = ProtocolFactory.create_handler(device)

        # 创建PLC实例
        self._create_plc_instance()

    def _create_plc_instance(self):
        """使用协议处理器创建PLC实例"""
        try:
            success = self.protocol_handler.create_plc_instance()
            if success:
                logger.info(f"PLC实例创建成功: {self.device.name} ({self.device.plc_type})")
            else:
                self.last_error = self.protocol_handler.last_error
                logger.error(f"PLC实例创建失败 {self.device.name}: {self.last_error}")
        except Exception as e:
            logger.error(f"创建PLC实例失败 {self.device.name}: {e}")
            self.last_error = str(e)
    
    def connect(self) -> bool:
        """连接PLC（使用协议处理器）"""
        with self._lock:
            try:
                # 设置连接超时，避免长时间阻塞
                connect_thread = threading.Thread(target=self._connect_sync)
                connect_thread.daemon = True
                connect_thread.start()

                # 等待连接完成，最多等待10秒
                connect_thread.join(timeout=10)

                if connect_thread.is_alive():
                    self.is_connected = False
                    self.last_error = "连接超时"
                    logger.error(f"PLC连接超时 {self.device.name}")
                    return False

                return self.is_connected

            except Exception as e:
                self.is_connected = False
                self.last_error = str(e)
                logger.error(f"PLC连接异常 {self.device.name}: {e}")
                # 记录通信异常到InfluxDB
                from database import db_manager
                db_manager.write_communication_error(self.device.id, self.device.name, str(e))
                return False

    def _connect_sync(self):
        """同步连接方法（使用协议处理器）"""
        try:
            success = self.protocol_handler.connect()
            self.is_connected = success
            if success:
                self.last_error = None
                logger.info(f"PLC连接成功: {self.device.name}")
            else:
                self.last_error = self.protocol_handler.last_error
                logger.error(f"PLC连接失败 {self.device.name}: {self.last_error}")
        except Exception as e:
            self.is_connected = False
            self.last_error = str(e)
            logger.error(f"PLC连接异常 {self.device.name}: {e}")
            from database import db_manager
            db_manager.write_communication_error(self.device.id, self.device.name, str(e))

    def disconnect(self):
        """断开PLC连接（使用协议处理器）"""
        with self._lock:
            try:
                self.protocol_handler.disconnect()
                self.is_connected = False
                logger.info(f"PLC断开连接: {self.device.name}")
            except Exception as e:
                logger.error(f"断开PLC连接失败 {self.device.name}: {e}")

    def update_timeouts(self, connect_timeout: int, receive_timeout: int):
        """更新连接和接收超时配置（使用协议处理器）"""
        try:
            self.protocol_handler.update_timeouts(connect_timeout, receive_timeout)
            logger.info(f"更新PLC超时配置 {self.device.name}: 连接超时={connect_timeout}ms, 接收超时={receive_timeout}ms")
        except Exception as e:
            logger.error(f"更新PLC超时配置失败 {self.device.name}: {e}")

    def read_addresses(self, addresses: List[str], address_configs: Optional[List[dict]] = None) -> tuple[Dict[str, Optional[float]], bool]:
        """批量读取地址数据（使用协议处理器）

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
                # 使用协议处理器读取数据（传递地址配置以支持不同数据类型）
                values, is_online = self.protocol_handler.read_addresses(addresses, address_configs)

                # 更新连接状态
                self.is_connected = is_online
                if not is_online:
                    self.last_error = self.protocol_handler.last_error or "网络通信失败"

                return values, is_online

            except Exception as e:
                # 异常情况，通常是网络问题，认为PLC离线
                logger.error(f"读取地址数据异常 {self.device.name}: {e}")
                self.is_connected = False
                self.last_error = str(e)
                return {addr: None for addr in addresses}, False

    def write_address(self, address: str, value: float) -> bool:
        """写入单个地址数据（使用协议处理器）"""
        with self._lock:
            try:
                success = self.protocol_handler.write_address(address, value)
                if success:
                    logger.info(f"写入数据成功 {self.device.name}: {address} = {value}")
                else:
                    self.last_error = self.protocol_handler.last_error
                    logger.error(f"写入数据失败 {self.device.name}: {self.last_error}")
                return success
            except Exception as e:
                logger.error(f"写入地址数据异常 {self.device.name}: {e}")
                self.last_error = str(e)
                return False

class PLCCollector:
    """PLC数据采集器（兼容原有接口）"""

    def __init__(self):
        self.connections: Dict[int, PLCConnection] = {}
        # 配置调度器，明确设置线程池大小和其他选项
        job_defaults = {
            'coalesce': True,         # 合并多个任务为一个
            'max_instances': 1,      # 每个任务最多1个实例
            'misfire_grace_time': 30 # 允许30秒的延迟执行
        }
        self.scheduler = BackgroundScheduler(job_defaults=job_defaults)
        self.is_running = False
        self._lock = threading.Lock()
        self._collect_lock = threading.RLock()  # 使用可重入锁防止并发采集
        self.current_settings = None

        # 检查是否使用新的协议采集器
        self.use_new_protocol_collector = PROTOCOL_COLLECTOR_AVAILABLE

        if self.use_new_protocol_collector:
            # 使用新的协议采集器
            self.protocol_collector = ProtocolCollector()
            logger.info("使用新的统一协议采集器")
        else:
            # 使用原有的CLR采集器
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

        if self.use_new_protocol_collector:
            # 使用新的协议采集器
            logger.info("启动统一协议采集服务")
            self.protocol_collector.start()
            self.is_running = True
        else:
            # 使用原有的CLR采集器
            if not self.clr_available:
                logger.warning("CLR环境不可用，PLC采集服务无法启动")
                logger.warning("系统将继续运行，但PLC采集功能不可用")
                return

            logger.info("启动PLC采集服务（传统CLR方式）")

            # 加载系统设置
            self.current_settings = self._load_system_settings()

            # 加载设备配置
            self._load_devices()

            # 启动数据采集定时任务
            collect_interval = self.current_settings.get('plc_collect_interval', config.PLC_COLLECT_INTERVAL)
            logger.info(f"添加采集任务，间隔: {collect_interval}秒")
            self.scheduler.add_job(
                func=self._collect_all_devices,
                trigger="interval",
                seconds=collect_interval,
                id='plc_collect_job',
                max_instances=1,          # 最多同时运行1个实例
                coalesce=True,            # 合并错过的任务
                misfire_grace_time=30,    # 允许30秒的延迟执行
                jitter=5                  # 添加5秒随机抖动避免重复执行
            )

            # 启动数据清理定时任务（每天凌晨2点执行）
            self.scheduler.add_job(
                func=self._cleanup_old_data,
                trigger="cron",
                hour=2,
                minute=0,
                id='data_cleanup_job',
                max_instances=1,          # 最多同时运行1个实例
                coalesce=True,            # 合并错过的任务
                misfire_grace_time=300    # 允许5分钟的延迟执行
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
                id='plc_collect_job',
                max_instances=1,          # 最多同时运行1个实例
                coalesce=True,            # 合并错过的任务
                misfire_grace_time=30     # 允许30秒的延迟执行
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

        if self.use_new_protocol_collector:
            # 使用新的协议采集器
            logger.info("停止统一协议采集服务")
            self.protocol_collector.stop()
            self.is_running = False
        else:
            # 使用原有的CLR采集器
            logger.info("停止PLC采集服务（传统CLR方式）")

            # 停止定时任务
            try:
                if self.scheduler.running:
                    # 等待所有任务完成再关闭
                    self.scheduler.shutdown(wait=True)
            except Exception as e:
                logger.error(f"停止调度器时出错: {e}")
                try:
                    self.scheduler.shutdown(wait=False)
                except:
                    pass

            # 断开所有连接
            with self._lock:
                for connection in self.connections.values():
                    try:
                        connection.disconnect()
                    except Exception as e:
                        logger.error(f"断开连接时出错: {e}")
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
        start_time = time.time()

        # 使用锁防止并发执行
        logger.debug("尝试获取采集锁")
        if not self._collect_lock.acquire(blocking=False):
            logger.warning("采集任务正在执行，跳过本次采集")
            return

        try:
            logger.info("开始采集所有设备数据")

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

            if not device_data:
                logger.debug("没有活跃设备需要采集")
                return

            # 在会话外进行数据采集
            success_count = 0
            for data in device_data:
                try:
                    # 检查任务执行时间，防止运行时间过长
                    if time.time() - start_time > 300:  # 5分钟超时
                        logger.warning("采集任务执行时间过长，强制结束")
                        break

                    # 重新创建简化的Device对象用于采集
                    device_obj = Device(
                        id=data['id'],
                        name=data['name'],
                        addresses=data['addresses']
                    )
                    self._collect_device_data(device_obj)
                    success_count += 1

                except Exception as e:
                    logger.error(f"采集设备 {data['name']} 失败: {e}")
                    continue

            logger.debug(f"采集任务完成，成功处理 {success_count}/{len(device_data)} 个设备")

        except Exception as e:
            logger.error(f"采集设备数据失败: {e}")
        finally:
            # 确保锁被释放
            try:
                self._collect_lock.release()
                logger.debug("采集锁已释放")
            except RuntimeError as e:
                logger.error(f"释放采集锁失败: {e}")
            except:
                logger.error("释放采集锁时发生未知错误")

            execution_time = time.time() - start_time
            logger.info(f"采集任务完成，执行时间: {execution_time:.2f}秒")
    
    def _collect_device_data(self, device: Device):
        """采集单个设备数据（支持增强的地址配置）"""
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

            # 获取地址配置
            address_configs = device.get_address_configs()
            if not address_configs:
                logger.warning(f"设备 {device_name} 没有配置采集地址")
                return

            # 构建地址列表用于读取
            addresses = [config['address'] for config in address_configs]

            # 记录采集开始时间
            start_time = datetime.now()

            # 读取数据（传递地址配置以支持不同数据类型）
            values, is_online = connection.read_addresses(addresses, address_configs)

            # 存储数据到InfluxDB
            success_count = 0
            batch_data_points = []

            for config in address_configs:
                address = config['address']
                raw_value = values.get(address)

                if raw_value is not None:
                    try:
                        # 应用数据缩放（如果配置了缩放）
                        scaled_value = raw_value
                        if config.get('scaling', {}).get('enabled', False):
                            scaling = config['scaling']
                            input_min = scaling.get('inputMin', 0)
                            input_max = scaling.get('inputMax', 100)
                            output_min = scaling.get('outputMin', 0)
                            output_max = scaling.get('outputMax', 10)

                            # 线性缩放计算
                            if input_max != input_min:
                                scaled_value = output_min + (raw_value - input_min) * (output_max - output_min) / (input_max - input_min)
                            else:
                                scaled_value = raw_value

                        # 计算响应时间
                        response_time = (datetime.now() - start_time).total_seconds() * 1000  # 转换为毫秒

                        # 准备元数据
                        metadata = {
                            'stationId': config.get('stationId', 1),
                            'registerType': config.get('registerType', 'holding'),
                            'functionCode': config.get('functionCode', 3),
                            'dataType': config.get('type', 'int16'),
                            'unit': config.get('unit', ''),
                            'rawValue': raw_value,
                            'scaledValue': scaled_value,
                            'scanRate': config.get('scanRate', 1000),
                            'byteOrder': config.get('byteOrder', 'CDAB'),
                            'wordSwap': config.get('wordSwap', False),
                            'quality': 'good',
                            'responseTime': response_time,
                            'addressName': config.get('name', ''),
                            'description': config.get('description', '')
                        }

                        # 使用增强的写入方法
                        if db_manager.write_enhanced_plc_data(
                            device_id=device_id,
                            device_name=device_name,
                            address_config=config,
                            raw_value=raw_value,
                            scaled_value=scaled_value,
                            timestamp=start_time,
                            response_time=response_time
                        ):
                            success_count += 1

                        # 如果是批量数据量大的设备，可以考虑批量写入
                        if len(address_configs) <= 10:  # 少量数据直接写入
                            pass  # 已经在上面写入
                        else:  # 大量数据准备批量写入
                            batch_data_points.append({
                                'address': address,
                                'value': scaled_value,
                                'timestamp': start_time,
                                'metadata': metadata
                            })

                    except Exception as e:
                        logger.error(f"处理地址 {address} 数据失败: {e}")
                        continue
                else:
                    logger.warning(f"地址 {address} 读取失败，值为None")

            # 如果有批量数据，执行批量写入
            if batch_data_points and len(address_configs) > 10:
                if db_manager.write_batch_plc_data(
                    device_id=device_id,
                    device_name=device_name,
                    data_points=batch_data_points
                ):
                    success_count += len(batch_data_points)

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
            total_addresses = len(address_configs)
            if success_count > 0:
                self._log_collect_result(
                    device.id,
                    "success",
                    f"成功采集 {success_count}/{total_addresses} 个地址"
                )
            else:
                self._log_collect_result(
                    device.id,
                    "failed",
                    f"所有{total_addresses}个地址采集失败"
                )

            # 记录采集统计信息
            collect_time = (datetime.now() - start_time).total_seconds()
            logger.debug(f"设备 {device.name} 数据采集完成: {success_count}/{total_addresses} 个地址，耗时 {collect_time:.2f}秒")

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
        if self.use_new_protocol_collector:
            self.protocol_collector.reload_devices()
        else:
            self._load_devices()
    
    def get_device_status(self, device_id: int = None) -> Dict:
        """获取设备连接状态

        Args:
            device_id: 设备ID，如果为None则返回所有设备状态

        Returns:
            如果指定device_id，返回单个设备状态字典
            如果device_id为None，返回所有设备状态字典
        """
        if self.use_new_protocol_collector:
            # 使用新的协议采集器
            return self.protocol_collector.get_device_status(device_id)
        else:
            # 使用原有的CLR采集器
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

    def get_protocol_info(self) -> Dict:
        """获取协议库信息"""
        if self.use_new_protocol_collector:
            return self.protocol_collector.get_protocol_info()
        else:
            return {
                'protocol_type': 'Traditional CLR',
                'clr_available': self.clr_available,
                'supported_protocols': ['OmronFins', 'SiemensS7'] if self.clr_available else []
            }

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