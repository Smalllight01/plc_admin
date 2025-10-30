# -*- coding: utf-8 -*-
"""
数据库连接和会话管理
提供SQLite和InfluxDB的连接管理
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from contextlib import contextmanager
from typing import Generator
import os
from datetime import datetime
import pytz
from loguru import logger

from config import config
from models import Base, User, Group, Device

class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self):
        # SQLite数据库引擎
        self.engine = create_engine(
            config.SQLITE_DATABASE_URL,
            connect_args={"check_same_thread": False},
            echo=config.DEBUG
        )
        
        # 创建会话工厂
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # InfluxDB客户端
        self.influx_client = None
        self.influx_write_api = None
        self.influx_query_api = None
        self.bucket = config.INFLUXDB_BUCKET  # 添加bucket属性
        
        # 初始化数据库
        self.init_database()
        self.init_influxdb()
    
    def init_database(self):
        """初始化SQLite数据库"""
        try:
            # 创建所有表
            Base.metadata.create_all(bind=self.engine)
            logger.info("SQLite数据库初始化成功")
            
            # 创建超级管理员
            self.create_super_admin()
            
        except Exception as e:
            logger.error(f"SQLite数据库初始化失败: {e}")
            raise
    
    def init_influxdb(self):
        """初始化InfluxDB连接"""
        try:
            if config.INFLUXDB_TOKEN:
                self.influx_client = InfluxDBClient(
                    url=config.INFLUXDB_URL,
                    token=config.INFLUXDB_TOKEN,
                    org=config.INFLUXDB_ORG
                )
                self.influx_write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
                self.influx_query_api = self.influx_client.query_api()
                logger.info("InfluxDB连接初始化成功")
            else:
                logger.warning("InfluxDB Token未配置，跳过InfluxDB初始化")
        except Exception as e:
            logger.error(f"InfluxDB初始化失败: {e}")
    
    def create_super_admin(self):
        """创建超级管理员"""
        with self.get_db() as db:
            # 检查是否已存在超级管理员
            existing_admin = db.query(User).filter(User.role == 'super_admin').first()
            if existing_admin:
                logger.info("超级管理员已存在")
                return
            
            # 创建默认分组
            default_group = db.query(Group).filter(Group.name == "默认分组").first()
            if not default_group:
                default_group = Group(
                    name="默认分组",
                    description="系统默认分组"
                )
                db.add(default_group)
                db.commit()
                db.refresh(default_group)
            
            # 创建超级管理员
            super_admin = User(
                username=config.SUPER_ADMIN_USERNAME,
                email=config.SUPER_ADMIN_EMAIL,
                role='super_admin',
                group_id=default_group.id
            )
            super_admin.set_password(config.SUPER_ADMIN_PASSWORD)
            
            db.add(super_admin)
            db.commit()
            logger.info(f"超级管理员创建成功: {config.SUPER_ADMIN_USERNAME}")
    
    @contextmanager
    def get_db(self) -> Generator[Session, None, None]:
        """获取数据库会话"""
        db = self.SessionLocal()
        try:
            yield db
        except Exception as e:
            db.rollback()
            logger.error(f"数据库操作失败: {e}")
            raise
        finally:
            db.close()
    
    def write_plc_data(self, device_id: int, device_name: str, address: str, value: float,
                       timestamp=None, metadata=None):
        """写入PLC数据到InfluxDB

        Args:
            device_id: 设备ID
            device_name: 设备名称
            address: 地址
            value: 数值
            timestamp: 时间戳，如果为None则使用当前时间
            metadata: 额外的元数据字典

        Returns:
            bool: 写入是否成功
        """
        if not self.influx_write_api:
            logger.warning("InfluxDB未初始化，无法写入数据")
            return False

        try:
            # 构建存储信息用于日志记录
            storage_info = {
                'device_id': device_id,
                'device_name': device_name,
                'address': address,
                'value': value
            }

            # 基础Point配置（确保所有数值字段都是float类型）
            point = Point("plc_data") \
                .tag("device_id", str(device_id)) \
                .tag("device_name", device_name) \
                .tag("address", address) \
                .field("value", float(value))

            # 添加元数据作为tags和fields
            if metadata:
                # 添加tags（用于查询和分组，存储字符串和枚举类型的数据）
                if 'stationId' in metadata:
                    point = point.tag("station_id", str(metadata['stationId']))
                    storage_info['station_id'] = metadata['stationId']
                if 'registerType' in metadata:
                    point = point.tag("register_type", metadata['registerType'])
                    storage_info['register_type'] = metadata['registerType']
                if 'functionCode' in metadata:
                    point = point.tag("function_code", str(metadata['functionCode']))
                    storage_info['function_code'] = metadata['functionCode']
                if 'dataType' in metadata:
                    point = point.tag("data_type", metadata['dataType'])
                    storage_info['data_type'] = metadata['dataType']
                if 'unit' in metadata and metadata['unit']:
                    point = point.tag("unit", metadata['unit'])
                    storage_info['unit'] = metadata['unit']
                if 'quality' in metadata:
                    point = point.tag("quality", str(metadata['quality']))
                    storage_info['quality'] = metadata['quality']
                if 'byteOrder' in metadata:
                    point = point.tag("byte_order", metadata['byteOrder'])
                    storage_info['byte_order'] = metadata['byteOrder']

                # 添加fields（统一转换为float类型，避免schema collision）
                if 'rawValue' in metadata and isinstance(metadata['rawValue'], (int, float)):
                    point = point.field("raw_value", float(metadata['rawValue']))
                    storage_info['raw_value'] = float(metadata['rawValue'])
                if 'scaledValue' in metadata and isinstance(metadata['scaledValue'], (int, float)):
                    point = point.field("scaled_value", float(metadata['scaledValue']))
                    storage_info['scaled_value'] = float(metadata['scaledValue'])
                # scan_rate字段已存在为integer类型，需要保持兼容
                if 'scanRate' in metadata and isinstance(metadata['scanRate'], (int, float)):
                    point = point.field("scan_rate", int(metadata['scanRate']))
                    storage_info['scan_rate'] = int(metadata['scanRate'])
                if 'wordSwap' in metadata and isinstance(metadata['wordSwap'], bool):
                    point = point.field("word_swap", float(int(metadata['wordSwap'])))
                    storage_info['word_swap'] = metadata['wordSwap']
                if 'responseTime' in metadata and isinstance(metadata['responseTime'], (int, float)):
                    point = point.field("response_time", float(metadata['responseTime']))
                    storage_info['response_time'] = float(metadata['responseTime'])

                # 注意：byteOrder, quality, unit 这些字符串类型的数据已经在上面作为tags存储，不需要作为fields重复存储

            # 设置时间戳为上海时区
            if timestamp:
                # 如果传入的时间戳没有时区信息，假设为本地时间并转换为上海时区
                if timestamp.tzinfo is None:
                    shanghai_tz = pytz.timezone('Asia/Shanghai')
                    timestamp = shanghai_tz.localize(timestamp)
                else:
                    # 如果有时区信息，转换为上海时区
                    shanghai_tz = pytz.timezone('Asia/Shanghai')
                    timestamp = timestamp.astimezone(shanghai_tz)
                point = point.time(timestamp)
                storage_info['timestamp'] = timestamp.strftime('%Y-%m-%d %H:%M:%S')
            else:
                # 如果没有传入时间戳，使用当前上海时区时间
                shanghai_tz = pytz.timezone('Asia/Shanghai')
                current_time = datetime.now(shanghai_tz)
                point = point.time(current_time)
                storage_info['timestamp'] = current_time.strftime('%Y-%m-%d %H:%M:%S')

            # 记录详细的存储日志
            log_msg = f"InfluxDB存储数据: {storage_info['device_name']}(ID:{storage_info['device_id']})"
            log_msg += f" 地址:{storage_info['address']} 值:{storage_info['value']}"

            if 'raw_value' in storage_info and 'scaled_value' in storage_info:
                log_msg += f" 原始值:{storage_info['raw_value']} 缩放值:{storage_info['scaled_value']}"

            if 'data_type' in storage_info:
                log_msg += f" 类型:{storage_info['data_type']}"

            if 'unit' in storage_info:
                log_msg += f" 单位:{storage_info['unit']}"

            if 'station_id' in storage_info:
                log_msg += f" 站号:{storage_info['station_id']}"

            if 'response_time' in storage_info:
                log_msg += f" 响应时间:{storage_info['response_time']}ms"

            log_msg += f" 时间:{storage_info['timestamp']}"

            logger.info(log_msg)

            self.influx_write_api.write(
                bucket=config.INFLUXDB_BUCKET,
                org=config.INFLUXDB_ORG,
                record=point
            )
            return True
        except Exception as e:
            logger.error(f"写入InfluxDB失败: {e}")
            return False

    def write_enhanced_plc_data(self, device_id: int, device_name: str, address_config: dict,
                                 raw_value: float, scaled_value: float, timestamp=None,
                                 response_time=None):
        """写入增强的PLC数据（包含完整地址配置信息）

        Args:
            device_id: 设备ID
            device_name: 设备名称
            address_config: 地址配置字典
            raw_value: 原始数值
            scaled_value: 缩放后的数值
            timestamp: 时间戳
            response_time: 响应时间（毫秒）

        Returns:
            bool: 写入是否成功
        """
        if not self.influx_write_api:
            logger.warning("InfluxDB未初始化，无法写入数据")
            return False

        try:
            # 构建元数据
            metadata = {
                'stationId': address_config.get('stationId', 1),
                'registerType': address_config.get('registerType', 'holding'),
                'functionCode': address_config.get('functionCode', 3),
                'dataType': address_config.get('type', 'int16'),
                'unit': address_config.get('unit', ''),
                'rawValue': raw_value,
                'scaledValue': scaled_value,
                'scanRate': address_config.get('scanRate', 1000),
                'byteOrder': address_config.get('byteOrder', 'CDAB'),
                'wordSwap': address_config.get('wordSwap', False),
                'quality': 'good' if scaled_value is not None else 'bad'
            }

            if response_time is not None:
                metadata['responseTime'] = response_time

            # 使用增强的写入方法
            return self.write_plc_data(
                device_id=device_id,
                device_name=device_name,
                address=address_config.get('address', ''),
                value=scaled_value,
                timestamp=timestamp,
                metadata=metadata
            )

        except Exception as e:
            logger.error(f"写入增强PLC数据失败: {e}")
            return False

    def write_batch_plc_data(self, device_id: int, device_name: str, data_points: list):
        """批量写入PLC数据到InfluxDB

        Args:
            device_id: 设备ID
            device_name: 设备名称
            data_points: 数据点列表，每个点包含address, value, timestamp, metadata等

        Returns:
            bool: 写入是否成功
        """
        if not self.influx_write_api:
            logger.warning("InfluxDB未初始化，无法写入数据")
            return False

        try:
            points = []
            shanghai_tz = pytz.timezone('Asia/Shanghai')
            current_time = datetime.now(shanghai_tz)

            # 记录批量存储的概要信息
            batch_summary = {
                'device_id': device_id,
                'device_name': device_name,
                'total_points': len(data_points),
                'timestamp': current_time.strftime('%Y-%m-%d %H:%M:%S'),
                'addresses': []
            }

            for data_point in data_points:
                address = data_point.get('address', '')
                value = data_point.get('value', 0.0)
                timestamp = data_point.get('timestamp', current_time)
                metadata = data_point.get('metadata', {})

                # 收集地址信息用于日志
                address_info = {
                    'address': address,
                    'value': value
                }

                if metadata:
                    if 'rawValue' in metadata:
                        address_info['raw_value'] = metadata['rawValue']
                    if 'scaledValue' in metadata:
                        address_info['scaled_value'] = metadata['scaledValue']
                    if 'dataType' in metadata:
                        address_info['data_type'] = metadata['dataType']
                    if 'unit' in metadata:
                        address_info['unit'] = metadata['unit']
                    if 'stationId' in metadata:
                        address_info['station_id'] = metadata['stationId']

                batch_summary['addresses'].append(address_info)

                # 创建Point（确保所有数值字段都是float类型）
                point = Point("plc_data") \
                    .tag("device_id", str(device_id)) \
                    .tag("device_name", device_name) \
                    .tag("address", address) \
                    .field("value", float(value))

                # 添加元数据
                if metadata:
                    if 'stationId' in metadata:
                        point = point.tag("station_id", str(metadata['stationId']))
                    if 'registerType' in metadata:
                        point = point.tag("register_type", metadata['registerType'])
                    if 'functionCode' in metadata:
                        point = point.tag("function_code", str(metadata['functionCode']))
                    if 'dataType' in metadata:
                        point = point.tag("data_type", metadata['dataType'])
                    if 'unit' in metadata and metadata['unit']:
                        point = point.tag("unit", metadata['unit'])
                    if 'quality' in metadata:
                        point = point.tag("quality", str(metadata['quality']))
                    if 'byteOrder' in metadata:
                        point = point.tag("byte_order", metadata['byteOrder'])

                    # 添加fields（统一转换为float类型，避免schema collision）
                    if 'rawValue' in metadata and isinstance(metadata['rawValue'], (int, float)):
                        point = point.field("raw_value", float(metadata['rawValue']))
                    if 'scaledValue' in metadata and isinstance(metadata['scaledValue'], (int, float)):
                        point = point.field("scaled_value", float(metadata['scaledValue']))
                    if 'responseTime' in metadata and isinstance(metadata['responseTime'], (int, float)):
                        point = point.field("response_time", float(metadata['responseTime']))

                # 处理时间戳
                if timestamp.tzinfo is None:
                    timestamp = shanghai_tz.localize(timestamp)
                else:
                    timestamp = timestamp.astimezone(shanghai_tz)

                point = point.time(timestamp)
                points.append(point)

            # 记录批量存储的详细信息
            log_msg = f"InfluxDB批量存储数据: {batch_summary['device_name']}(ID:{batch_summary['device_id']})"
            log_msg += f" 共{batch_summary['total_points']}个数据点"
            log_msg += f" 时间:{batch_summary['timestamp']}"

            # 添加前几个数据点的详细信息
            if len(batch_summary['addresses']) <= 5:
                # 如果数据点不多，显示全部
                for addr_info in batch_summary['addresses']:
                    log_msg += f"\n  - 地址:{addr_info['address']} 值:{addr_info['value']}"
                    if 'raw_value' in addr_info and 'scaled_value' in addr_info:
                        log_msg += f" (原始:{addr_info['raw_value']} 缩放:{addr_info['scaled_value']})"
                    if 'data_type' in addr_info:
                        log_msg += f" 类型:{addr_info['data_type']}"
                    if 'unit' in addr_info:
                        log_msg += f" 单位:{addr_info['unit']}"
            else:
                # 如果数据点很多，只显示前3个和总数
                for i, addr_info in enumerate(batch_summary['addresses'][:3]):
                    log_msg += f"\n  - 地址:{addr_info['address']} 值:{addr_info['value']}"
                    if 'data_type' in addr_info:
                        log_msg += f" 类型:{addr_info['data_type']}"
                log_msg += f"\n  ... 还有{len(batch_summary['addresses']) - 3}个数据点"

            logger.info(log_msg)

            # 批量写入
            self.influx_write_api.write(
                bucket=config.INFLUXDB_BUCKET,
                org=config.INFLUXDB_ORG,
                record=points
            )

            logger.debug(f"批量写入{len(points)}个PLC数据点到InfluxDB成功")
            return True

        except Exception as e:
            logger.error(f"批量写入InfluxDB失败: {e}")
            return False
    
    def write_communication_error(self, device_id: int, device_name: str, error_message: str, timestamp=None):
        """写入通信异常数据到InfluxDB
        
        Args:
            device_id: 设备ID
            device_name: 设备名称
            error_message: 错误信息
            timestamp: 时间戳，如果为None则使用当前时间
        
        Returns:
            bool: 写入是否成功
        """
        if not self.influx_write_api:
            logger.warning("InfluxDB未初始化，无法写入通信异常数据")
            return False
        
        try:
            point = Point("communication_errors") \
                .tag("device_id", str(device_id)) \
                .tag("device_name", device_name) \
                .tag("error_type", "connection_failed") \
                .field("error_message", error_message) \
                .field("severity", "high")
            
            # 设置时间戳为上海时区
            if timestamp:
                # 如果传入的时间戳没有时区信息，假设为本地时间并转换为上海时区
                if timestamp.tzinfo is None:
                    shanghai_tz = pytz.timezone('Asia/Shanghai')
                    timestamp = shanghai_tz.localize(timestamp)
                else:
                    # 如果有时区信息，转换为上海时区
                    shanghai_tz = pytz.timezone('Asia/Shanghai')
                    timestamp = timestamp.astimezone(shanghai_tz)
                point = point.time(timestamp)
            else:
                # 如果没有传入时间戳，使用当前上海时区时间
                shanghai_tz = pytz.timezone('Asia/Shanghai')
                current_time = datetime.now(shanghai_tz)
                point = point.time(current_time)
            
            self.influx_write_api.write(
                bucket=config.INFLUXDB_BUCKET,
                org=config.INFLUXDB_ORG,
                record=point
            )
            logger.info(f"通信异常已记录到InfluxDB: 设备{device_name}({device_id}) - {error_message}")
            return True
        except Exception as e:
            logger.error(f"写入通信异常到InfluxDB失败: {e}")
            return False
    
    def query_plc_data(self, device_id: int = None, start_time: str = "-1h", stop_time: str = "now()"):
        """查询PLC数据"""
        if not self.influx_query_api:
            logger.warning("InfluxDB未初始化，无法查询数据")
            return []
        
        try:
            query = f'''
            from(bucket: "{config.INFLUXDB_BUCKET}")
            |> range(start: {start_time}, stop: {stop_time})
            |> filter(fn: (r) => r._measurement == "plc_data")
            |> filter(fn: (r) => r._field == "value")
            '''
            
            if device_id:
                query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            
            result = self.influx_query_api.query(org=config.INFLUXDB_ORG, query=query)
            
            data = []
            for table in result:
                for record in table.records:
                    data.append({
                        'time': record.get_time(),
                        'device_id': record.values.get('device_id'),
                        'device_name': record.values.get('device_name'),
                        'address': record.values.get('address'),
                        'value': record.get_value()
                    })
            
            return data
        except Exception as e:
            logger.error(f"查询InfluxDB失败: {e}")
            return []
    
    def query_latest_data(self, device_id: int, limit: int = 1):
        """查询设备最新数据
        
        Args:
            device_id: 设备ID
            limit: 限制返回数量
            
        Returns:
            list: 最新数据列表，如果数据过期或设备离线则返回空列表
        """
        if not self.influx_query_api:
            logger.warning("InfluxDB未初始化，无法查询数据")
            return []
        
        # 检查设备状态
        try:
            with self.get_db() as db:
                device = db.query(Device).filter(Device.id == device_id).first()
                if not device or not device.is_active or not device.is_connected or device.status != 'online':
                    logger.info(f"设备 {device_id} 不在线或未激活，跳过数据查询")
                    return []
        except Exception as e:
            logger.error(f"检查设备状态失败: {e}")
            return []
        
        try:
            # 缩短查询时间范围到5分钟，确保数据的实时性
            # 只查询主value字段，避免类型冲突
            query = f'''
            from(bucket: "{config.INFLUXDB_BUCKET}")
            |> range(start: -5m)
            |> filter(fn: (r) => r._measurement == "plc_data")
            |> filter(fn: (r) => r.device_id == "{device_id}")
            |> filter(fn: (r) => r._field == "value")
            |> group(columns: ["address"])
            |> last()
            |> limit(n: {limit * 100})
            '''
            
            result = self.influx_query_api.query(org=config.INFLUXDB_ORG, query=query)
            
            data = []
            shanghai_tz = pytz.timezone('Asia/Shanghai')
            current_time = datetime.now(shanghai_tz)
            
            for table in result:
                for record in table.records:
                    # 将时间转换为上海时区
                    time_utc = record.get_time()
                    time_shanghai = time_utc.astimezone(shanghai_tz) if time_utc else None
                    
                    # 检查数据时间有效性（最近3分钟内的数据才认为是有效的实时数据）
                    if time_shanghai:
                        time_diff = current_time - time_shanghai
                        if time_diff.total_seconds() > 180:  # 超过3分钟的数据不返回
                            logger.debug(f"数据过期，跳过: 设备{device_id}, 时间差{time_diff.total_seconds()}秒")
                            continue
                    
                    data.append({
                        'time': time_shanghai,
                        'device_id': record.values.get('device_id'),
                        'device_name': record.values.get('device_name'),
                        'address': record.values.get('address'),
                        'value': record.get_value()
                    })
            
            return data
        except Exception as e:
            logger.error(f"查询最新数据失败: {e}")
            return []
    
    def query_history_data(self, device_id: int, start_time: datetime, end_time: datetime, address: str = None, limit: int = 1000, offset: int = 0):
        """查询历史数据"""
        if not self.influx_query_api:
            logger.warning("InfluxDB未初始化，无法查询数据")
            return []
        
        try:
            # 确保时间为上海时区
            shanghai_tz = pytz.timezone('Asia/Shanghai')
            if start_time.tzinfo is None:
                start_time = shanghai_tz.localize(start_time)
            else:
                start_time = start_time.astimezone(shanghai_tz)
            
            if end_time.tzinfo is None:
                end_time = shanghai_tz.localize(end_time)
            else:
                end_time = end_time.astimezone(shanghai_tz)
            
            # 转换为UTC时间用于查询
            start_time_utc = start_time.astimezone(pytz.UTC)
            end_time_utc = end_time.astimezone(pytz.UTC)
            
            query = f'''
            from(bucket: "{config.INFLUXDB_BUCKET}")
            |> range(start: {start_time_utc.isoformat()}, stop: {end_time_utc.isoformat()})
            |> filter(fn: (r) => r._measurement == "plc_data")
            |> filter(fn: (r) => r.device_id == "{device_id}")
            |> filter(fn: (r) => r._field == "value")
            '''
            
            if address:
                query += f'|> filter(fn: (r) => r.address == "{address}")'
            
            # 添加排序以确保分页的一致性
            query += '|> sort(columns: ["_time"])'
            
            # 添加偏移和限制
            if offset > 0:
                query += f'|> limit(n: {limit + offset}) |> tail(n: {limit})'
            else:
                query += f'|> limit(n: {limit})'
            
            result = self.influx_query_api.query(org=config.INFLUXDB_ORG, query=query)
            
            data = []
            for table in result:
                for record in table.records:
                    # 将时间转换为上海时区
                    time_utc = record.get_time()
                    time_shanghai = time_utc.astimezone(shanghai_tz) if time_utc else None
                    
                    data.append({
                        'time': time_shanghai,
                        'device_id': record.values.get('device_id'),
                        'device_name': record.values.get('device_name'),
                        'address': record.values.get('address'),
                        'value': record.get_value()
                    })
            
            return data
        except Exception as e:
            logger.error(f"查询历史数据失败: {e}")
            return []
    
    def query_statistics(self, device_id: int, start_time: datetime, end_time: datetime):
        """查询统计数据"""
        if not self.influx_query_api:
            logger.warning("InfluxDB未初始化，无法查询数据")
            return {}
        
        try:
            # 确保时间为上海时区
            shanghai_tz = pytz.timezone('Asia/Shanghai')
            if start_time.tzinfo is None:
                start_time = shanghai_tz.localize(start_time)
            else:
                start_time = start_time.astimezone(shanghai_tz)
            
            if end_time.tzinfo is None:
                end_time = shanghai_tz.localize(end_time)
            else:
                end_time = end_time.astimezone(shanghai_tz)
            
            # 转换为UTC时间用于查询
            start_time_utc = start_time.astimezone(pytz.UTC)
            end_time_utc = end_time.astimezone(pytz.UTC)
            
            # 构建Flux查询语句
            query = f'''
            from(bucket: "{self.bucket}")
              |> range(start: {start_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ")}, stop: {end_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ")})
              |> filter(fn: (r) => r._measurement == "plc_data")
              |> filter(fn: (r) => r.device_id == "{device_id}")
            '''
            
            logger.info(f"执行统计查询: {query}")
            
            # 执行查询
            result = self.influx_query_api.query(query)
            
            # 处理查询结果
            data_points = []
            addresses = {}
            
            for table in result:
                for record in table.records:
                    data_point = {
                        'timestamp': record.get_time(),
                        'device_id': record.values.get('device_id'),
                        'address': record.values.get('address'),
                        'value': record.get_value()
                    }
                    data_points.append(data_point)
                    
                    # 统计每个地址的数据点数量
                    address = record.values.get('address')
                    if address not in addresses:
                        addresses[address] = 0
                    addresses[address] += 1
            
            # 计算统计信息
            total_points = len(data_points)
            
            statistics = {
                'total_points': total_points,
                'addresses': addresses,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat()
            }
            
            logger.info(f"设备 {device_id} 统计数据: 总数据点={total_points}, 地址数量={len(addresses)}")
            
            return statistics
            
        except Exception as e:
            logger.error(f"查询统计数据失败: {e}")
            # 返回空的统计数据结构，确保前端能正常处理
            return {
                'total_points': 0,
                'addresses': {},
                'start_time': start_time.isoformat() if start_time else None,
                'end_time': end_time.isoformat() if end_time else None,
                'success_rate': 0.0,
                'error': str(e)
            }
    
    def query_anomalies(self, device_id: int = None, group_id: int = None, start_time: datetime = None, end_time: datetime = None):
        """查询异常数据
        
        Args:
            device_id: 设备ID，可选
            group_id: 分组ID，可选
            start_time: 开始时间
            end_time: 结束时间
            
        Returns:
            dict: 异常数据统计
        """
        if not self.influx_query_api:
            logger.warning("InfluxDB未初始化，无法查询数据")
            return {'anomalies': [], 'summary': {}}
        
        try:
            # 设置默认时间范围（最近24小时）
            if not end_time:
                end_time = datetime.now()
            if not start_time:
                start_time = end_time - timedelta(hours=24)
            
            # 确保时间为上海时区
            shanghai_tz = pytz.timezone('Asia/Shanghai')
            if start_time.tzinfo is None:
                start_time = shanghai_tz.localize(start_time)
            else:
                start_time = start_time.astimezone(shanghai_tz)
            
            if end_time.tzinfo is None:
                end_time = shanghai_tz.localize(end_time)
            else:
                end_time = end_time.astimezone(shanghai_tz)
            
            # 转换为UTC时间用于查询
            start_time_utc = start_time.astimezone(pytz.UTC)
            end_time_utc = end_time.astimezone(pytz.UTC)
            
            # 构建查询条件
            device_filter = ""
            if device_id:
                device_filter = f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            elif group_id:
                # 如果指定了分组，需要先获取该分组下的设备列表
                with self.get_db() as db:
                    from models import Device
                    devices = db.query(Device).filter(Device.group_id == group_id, Device.is_active == True).all()
                    if devices:
                        device_ids = [str(d.id) for d in devices]
                        device_ids_str = '", "'.join(device_ids)
                        device_filter = f'|> filter(fn: (r) => contains(value: r.device_id, set: ["{device_ids_str}"]))'  
                    else:
                        return {'anomalies': [], 'summary': {'total_anomalies': 0, 'anomaly_types': {}}}
            
            # 查询数据
            query = f'''
            from(bucket: "{config.INFLUXDB_BUCKET}")
            |> range(start: {start_time_utc.isoformat()}, stop: {end_time_utc.isoformat()})
            |> filter(fn: (r) => r._measurement == "plc_data")
            {device_filter}
            |> sort(columns: ["_time"])
            '''
            
            result = self.influx_query_api.query(org=config.INFLUXDB_ORG, query=query)
            
            anomalies = []
            anomaly_summary = {
                'total_anomalies': 0,
                'anomaly_types': {
                    'value_spike': 0,      # 数值突变
                    'data_interruption': 0, # 数据中断
                    'out_of_range': 0,     # 数值超范围
                    'communication_error': 0 # 通信异常
                }
            }
            
            # 按设备和地址分组处理数据
            device_address_data = {}
            
            for table in result:
                for record in table.records:
                    device_id_str = record.values.get('device_id')
                    address = record.values.get('address')
                    value = record.get_value()
                    timestamp = record.get_time().astimezone(shanghai_tz)
                    
                    key = f"{device_id_str}_{address}"
                    if key not in device_address_data:
                        device_address_data[key] = []
                    
                    device_address_data[key].append({
                        'device_id': device_id_str,
                        'address': address,
                        'value': value,
                        'timestamp': timestamp
                    })
            
            # 分析每个设备地址的异常
            for key, data_points in device_address_data.items():
                if len(data_points) < 2:
                    continue
                
                # 按时间排序
                data_points.sort(key=lambda x: x['timestamp'])
                
                device_id_str = data_points[0]['device_id']
                address = data_points[0]['address']
                
                # 获取设备信息
                with self.get_db() as db:
                    from models import Device
                    device = db.query(Device).filter(Device.id == int(device_id_str)).first()
                    device_name = device.name if device else f"设备{device_id_str}"
                
                # 检测数据中断异常
                for i in range(1, len(data_points)):
                    time_diff = (data_points[i]['timestamp'] - data_points[i-1]['timestamp']).total_seconds()
                    
                    # 如果数据间隔超过5分钟，认为是数据中断
                    if time_diff > 300:  # 5分钟
                        anomalies.append({
                            'device_id': int(device_id_str),
                            'device_name': device_name,
                            'address': address,
                            'anomaly_type': 'data_interruption',
                            'anomaly_description': f'数据中断{time_diff/60:.1f}分钟',
                            'timestamp': data_points[i-1]['timestamp'].isoformat(),
                            'value': data_points[i-1]['value'],
                            'severity': 'medium' if time_diff < 1800 else 'high'  # 30分钟以上为高严重性
                        })
                        anomaly_summary['anomaly_types']['data_interruption'] += 1
                        anomaly_summary['total_anomalies'] += 1
                
                # 检测数值突变异常
                numeric_values = [p['value'] for p in data_points if isinstance(p['value'], (int, float))]
                if len(numeric_values) >= 3:
                    # 计算移动平均和标准差
                    import statistics
                    mean_val = statistics.mean(numeric_values)
                    stdev_val = statistics.stdev(numeric_values) if len(numeric_values) > 1 else 0
                    
                    for i, point in enumerate(data_points):
                        if isinstance(point['value'], (int, float)):
                            # 如果数值偏离平均值超过3个标准差，认为是突变
                            if stdev_val > 0 and abs(point['value'] - mean_val) > 3 * stdev_val:
                                anomalies.append({
                                    'device_id': int(device_id_str),
                                    'device_name': device_name,
                                    'address': address,
                                    'anomaly_type': 'value_spike',
                                    'anomaly_description': f'数值突变: {point["value"]} (平均值: {mean_val:.2f})',
                                    'timestamp': point['timestamp'].isoformat(),
                                    'value': point['value'],
                                    'severity': 'high'
                                })
                                anomaly_summary['anomaly_types']['value_spike'] += 1
                                anomaly_summary['total_anomalies'] += 1
                
                # 检测数值超范围异常（假设正常范围为0-1000）
                for point in data_points:
                    if isinstance(point['value'], (int, float)):
                        if point['value'] < 0 or point['value'] > 1000:
                            anomalies.append({
                                'device_id': int(device_id_str),
                                'device_name': device_name,
                                'address': address,
                                'anomaly_type': 'out_of_range',
                                'anomaly_description': f'数值超范围: {point["value"]} (正常范围: 0-1000)',
                                'timestamp': point['timestamp'].isoformat(),
                                'value': point['value'],
                                'severity': 'medium'
                            })
                            anomaly_summary['anomaly_types']['out_of_range'] += 1
                            anomaly_summary['total_anomalies'] += 1
            
            # 查询通信异常数据
            comm_device_filter = ""
            if device_id:
                comm_device_filter = f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            elif group_id:
                # 如果指定了分组，需要先获取该分组下的设备列表
                with self.get_db() as db:
                    from models import Device
                    devices = db.query(Device).filter(Device.group_id == group_id, Device.is_active == True).all()
                    if devices:
                        device_ids = [str(d.id) for d in devices]
                        device_ids_str = '", "'.join(device_ids)
                        comm_device_filter = f'|> filter(fn: (r) => contains(value: r.device_id, set: ["{device_ids_str}"]))'  
            
            comm_query = f'''
            from(bucket: "{config.INFLUXDB_BUCKET}")
            |> range(start: {start_time_utc.isoformat()}, stop: {end_time_utc.isoformat()})
            |> filter(fn: (r) => r._measurement == "communication_errors")
            {comm_device_filter}
            |> sort(columns: ["_time"])
            '''
            
            comm_result = self.influx_query_api.query(org=config.INFLUXDB_ORG, query=comm_query)
            
            # 处理通信异常数据
            for table in comm_result:
                for record in table.records:
                    device_id_str = record.values.get('device_id')
                    device_name = record.values.get('device_name')
                    # error_message是field，需要使用get_field()或检查_field
                    error_message = record.values.get('_value') if record.values.get('_field') == 'error_message' else None
                    if not error_message:
                        # 如果当前记录不是error_message字段，跳过
                        continue
                    timestamp = record.get_time().astimezone(shanghai_tz)
                    severity = record.values.get('severity', 'high')
                    
                    anomalies.append({
                        'device_id': int(device_id_str),
                        'device_name': device_name,
                        'address': 'communication',
                        'anomaly_type': 'communication_error',
                        'anomaly_description': f'通信异常: {error_message}',
                        'timestamp': timestamp.isoformat(),
                        'value': None,
                        'severity': severity
                    })
                    anomaly_summary['anomaly_types']['communication_error'] += 1
                    anomaly_summary['total_anomalies'] += 1
            
            # 按时间倒序排列异常
            anomalies.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return {
                'anomalies': anomalies,
                'summary': anomaly_summary,
                'time_range': {
                    'start': start_time.isoformat(),
                    'end': end_time.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"查询异常数据失败: {e}")
            # 返回空的异常数据结构，确保前端能正常处理
            return {
                'anomalies': [], 
                'summary': {
                    'total_anomalies': 0, 
                    'anomaly_types': {
                        'data_interruption': 0,
                        'value_spike': 0,
                        'out_of_range': 0,
                        'communication_error': 0
                    }
                },
                'time_range': {
                    'start': start_time.isoformat() if start_time else None,
                    'end': end_time.isoformat() if end_time else None
                },
                'error': str(e)
            }
        
        try:
            # 确保时间为上海时区
            shanghai_tz = pytz.timezone('Asia/Shanghai')
            if start_time.tzinfo is None:
                start_time = shanghai_tz.localize(start_time)
            else:
                start_time = start_time.astimezone(shanghai_tz)
            
            if end_time.tzinfo is None:
                end_time = shanghai_tz.localize(end_time)
            else:
                end_time = end_time.astimezone(shanghai_tz)
            
            # 转换为UTC时间用于查询
            start_time_utc = start_time.astimezone(pytz.UTC)
            end_time_utc = end_time.astimezone(pytz.UTC)
            
            query = f'''
            from(bucket: "{config.INFLUXDB_BUCKET}")
            |> range(start: {start_time_utc.isoformat()}, stop: {end_time_utc.isoformat()})
            |> filter(fn: (r) => r._measurement == "plc_data")
            |> filter(fn: (r) => r.device_id == "{device_id}")
            |> filter(fn: (r) => r._field == "value")
            |> group(columns: ["address"])
            '''
            
            result = self.influx_query_api.query(org=config.INFLUXDB_ORG, query=query)
            
            stats = {
                'total_points': 0,
                'addresses': {},
                'time_range': {
                    'start': start_time,
                    'end': end_time
                }
            }
            
            shanghai_tz = pytz.timezone('Asia/Shanghai')
            for table in result:
                address = None
                count = 0
                total_value = 0
                last_time = None
                
                for record in table.records:
                    address = record.values.get('address')
                    count += 1
                    total_value += record.get_value() if record.get_value() is not None else 0
                    
                    # 记录最新时间
                    time_utc = record.get_time()
                    if time_utc:
                        time_shanghai = time_utc.astimezone(shanghai_tz)
                        if last_time is None or time_shanghai > last_time:
                            last_time = time_shanghai
                
                # 为每个地址汇总统计信息
                if address and count > 0:
                    stats['addresses'][address] = {
                        'count': count,
                        'avg_value': total_value / count if count > 0 else 0,
                        'last_time': last_time
                    }
                    stats['total_points'] += count
            
            return stats
        except Exception as e:
            logger.error(f"查询统计数据失败: {e}")
            return {}
    
    def cleanup_old_data(self, cutoff_timestamp: str) -> int:
        """清理过期的历史数据
        
        Args:
            cutoff_timestamp: 截止时间戳，格式为 'YYYY-MM-DDTHH:MM:SSZ'
            
        Returns:
            删除的记录数量
        """
        try:
            if not self.influx_query_api:
                logger.error("InfluxDB查询API未初始化")
                return 0
            
            # 构建删除查询
            delete_query = f'''
            from(bucket: "{self.bucket}")
            |> range(start: 1970-01-01T00:00:00Z, stop: {cutoff_timestamp})
            |> drop(columns: ["_start", "_stop"])
            '''
            
            # 先查询要删除的数据数量
            count_query = f'''
            from(bucket: "{self.bucket}")
            |> range(start: 1970-01-01T00:00:00Z, stop: {cutoff_timestamp})
            |> count()
            '''
            
            # 查询要删除的记录数
            count_result = self.influx_query_api.query(count_query)
            deleted_count = 0
            
            for table in count_result:
                for record in table.records:
                    deleted_count += record.get_value()
            
            if deleted_count > 0:
                # 执行删除操作
                from influxdb_client.client.delete_api import DeleteApi
                delete_api = self.influx_client.delete_api()
                
                # 删除指定时间范围内的数据
                delete_api.delete(
                    start="1970-01-01T00:00:00Z",
                    stop=cutoff_timestamp,
                    bucket=self.bucket
                )
                
                logger.info(f"成功删除{deleted_count}条过期数据")
            else:
                logger.info("没有找到需要删除的过期数据")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")
            return 0
    
    def close(self):
        """关闭数据库连接"""
        if self.influx_client:
            self.influx_client.close()
        logger.info("数据库连接已关闭")

# 创建全局数据库管理器实例
db_manager = DatabaseManager()