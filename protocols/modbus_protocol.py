# -*- coding: utf-8 -*-
"""
Modbus协议处理器
支持Modbus TCP、Modbus RTU和Modbus RTU over TCP协议
"""

from typing import Dict, List, Optional
from loguru import logger

from .base_protocol import BaseProtocolHandler
from models import Device

# 尝试导入HslCommunication相关类
try:
    import clr
    clr.AddReference(r'HslCommunication')
    from HslCommunication.ModBus import ModbusTcpNet, ModbusRtuOverTcp, ModbusRtu
    from HslCommunication.Core import DataFormat
    CLR_AVAILABLE = True
except Exception as e:
    logger.error(f"CLR或HslCommunication库加载失败: {e}")
    CLR_AVAILABLE = False

    # 定义占位符类以避免导入错误
    class ModbusTcpNet: pass
    class ModbusRtuOverTcp: pass
    class ModbusRtu: pass
    class DataFormat: pass


class ModbusProtocolHandler(BaseProtocolHandler):
    """Modbus协议处理器"""

    def __init__(self, device: Device):
        super().__init__(device)
        self.station_id = 1  # 默认站号

    def create_plc_instance(self) -> bool:
        """创建Modbus PLC实例"""
        try:
            if not CLR_AVAILABLE:
                logger.error(f"CLR环境不可用，无法创建Modbus PLC实例: {self.device.name}")
                self.last_error = "CLR环境不可用"
                return False

            plc_type_lower = self.device.plc_type.lower()

            if 'tcp' in plc_type_lower and 'rtu' in plc_type_lower:
                # Modbus RTU over TCP
                self.plc = ModbusRtuOverTcp()
                logger.info(f"创建Modbus RTU over TCP客户端: {self.device.name}")
            elif 'rtu' in plc_type_lower:
                # Modbus RTU (串口)
                self.plc = ModbusRtu()
                logger.info(f"创建Modbus RTU客户端: {self.device.name}")
            else:
                # Modbus TCP
                self.plc = ModbusTcpNet()
                logger.info(f"创建Modbus TCP客户端: {self.device.name}")

            # 设置站号（从设备配置中获取或使用默认值）
            if hasattr(self.device, 'station_id') and self.device.station_id:
                self.station_id = int(self.device.station_id)
            else:
                # 尝试从协议字符串中提取站号，例如 "mbtcp_s=2" 或 "modbus:2"
                protocol_parts = self.device.protocol.split(':')
                if len(protocol_parts) > 1:
                    try:
                        self.station_id = int(protocol_parts[1])
                    except (ValueError, IndexError):
                        pass

            self.plc.Station = self.station_id

            # Modbus设备直接设置IP和端口
            self.plc.IpAddress = self.device.ip_address
            self.plc.Port = self.device.port

            # 设置数据格式（默认使用CDAB，这是大多数设备的格式）
            try:
                self.plc.DataFormat = DataFormat.CDAB
                logger.debug(f"设置Modbus数据格式为CDAB: {self.device.name}")
            except Exception as e:
                logger.warning(f"设置数据格式失败 {self.device.name}: {e}")

            # 设置地址起始规则（地址从0开始）
            try:
                if hasattr(self.plc, 'AddressStartWithZero'):
                    self.plc.AddressStartWithZero = True
                    logger.debug(f"设置地址从0开始: {self.device.name}")
            except Exception as e:
                logger.warning(f"设置地址起始规则失败 {self.device.name}: {e}")

            logger.info(f"Modbus PLC实例创建成功: {self.device.name} (站号:{self.station_id})")
            return True

        except Exception as e:
            logger.error(f"创建Modbus PLC实例失败 {self.device.name}: {e}")
            self.last_error = str(e)
            return False

    
    def read_addresses(self, addresses: List[str], address_configs: Optional[List[dict]] = None) -> tuple[Dict[str, Optional[float]], bool]:
        """批量读取Modbus地址数据"""
        if not self.plc:
            return {addr: None for addr in addresses}, False

        try:
            all_values = {}
            has_network_communication = False

            # 确保PLC使用正确的站号
            if self.plc.Station != self.station_id:
                self.plc.Station = self.station_id
                logger.debug(f"设置站号为 {self.station_id}: {self.device.name}")

            # 如果没有提供地址配置，创建默认配置
            if address_configs is None:
                address_configs = []
                for addr in addresses:
                    addr_num = int(addr) if addr.isdigit() else 0
                    data_type = 'bool' if (1 <= addr_num <= 9999 or 10001 <= addr_num <= 19999) else 'int16'
                    address_configs.append({
                        'address': addr,
                        'type': data_type
                    })

            # 逐个读取地址
            for i, addr in enumerate(addresses):
                try:
                    config = address_configs[i] if i < len(address_configs) else {}
                    data_type = config.get('type', 'int16')
                    read_result = None
                    value = None

                    # 检查当前地址是否有独立的站号配置
                    address_station_id = config.get('stationId', self.station_id)
                    if self.plc.Station != address_station_id:
                        self.plc.Station = address_station_id
                        logger.debug(f"切换到站号 {address_station_id} 读取地址 {addr}: {self.device.name}")
                        # 对于485总线，站号切换后需要短暂延迟
                        import time
                        time.sleep(0.02)  # 20ms延迟，确保站号切换完成

                    # 根据数据类型选择读取方法
                    if data_type == 'bool':
                        read_result = self.plc.ReadBool(addr)
                        if read_result.IsSuccess:
                            value = float(1 if read_result.Content else 0)
                    elif data_type == 'int16':
                        read_result = self.plc.ReadInt16(addr)
                        if read_result.IsSuccess:
                            value = float(read_result.Content)
                    elif data_type == 'uint16':
                        read_result = self.plc.ReadUInt16(addr)
                        if read_result.IsSuccess:
                            value = float(read_result.Content)
                    elif data_type == 'int32':
                        read_result = self.plc.ReadInt32(addr)
                        if read_result.IsSuccess:
                            value = float(read_result.Content)
                    elif data_type == 'uint32':
                        read_result = self.plc.ReadUInt32(addr)
                        if read_result.IsSuccess:
                            value = float(read_result.Content)
                    elif data_type == 'float':
                        read_result = self.plc.ReadFloat(addr)
                        if read_result.IsSuccess:
                            value = float(read_result.Content)
                    elif data_type == 'string':
                        # 字符串读取需要长度参数，默认使用10
                        string_length = config.get('stringLength', 10)
                        read_result = self.plc.ReadString(addr, string_length)
                        if read_result.IsSuccess:
                            # 字符串转换为数值，这里可能需要特殊处理
                            try:
                                value = float(read_result.Content)
                            except (ValueError, TypeError):
                                # 如果不能转换为数值，记录日志并设为None
                                logger.warning(f"字符串值无法转换为数值 {self.device.name}: {addr} = {read_result.Content}")
                                value = None
                    else:
                        # 默认使用Int16
                        read_result = self.plc.ReadInt16(addr)
                        if read_result.IsSuccess:
                            value = float(read_result.Content)

                    if read_result and read_result.IsSuccess:
                        all_values[addr] = value
                        has_network_communication = True
                        logger.debug(f"读取成功 {self.device.name}: {addr} ({data_type}) = {value}")
                    else:
                        # 分析错误类型
                        error_msg = read_result.Message.lower() if read_result and read_result.Message else ""
                        network_errors = [
                            'timeout', 'connection', 'network', 'socket',
                            'unreachable', 'refused', 'reset', 'closed'
                        ]

                        is_network_error = any(err in error_msg for err in network_errors)

                        if is_network_error:
                            logger.error(f"Modbus网络通信失败 {self.device.name} (站号{self.station_id}): {read_result.Message if read_result else '未知错误'}")
                            all_values[addr] = None
                        else:
                            # 非网络错误，可能是地址错误或权限问题
                            has_network_communication = True
                            logger.warning(f"Modbus数据读取失败但PLC在线 {self.device.name} (站号{self.station_id}, 地址{addr}, 类型{data_type}): {read_result.Message if read_result else '未知错误'}")
                            all_values[addr] = None

                except Exception as e:
                    logger.error(f"读取地址{addr}时发生异常 {self.device.name}: {e}")
                    all_values[addr] = None

            return all_values, has_network_communication

        except Exception as e:
            logger.error(f"读取Modbus地址数据异常 {self.device.name}: {e}")
            return {addr: None for addr in addresses}, False

    
    def write_address(self, address: str, value: float) -> bool:
        """写入Modbus单个地址数据"""
        if not self.plc:
            logger.error(f"Modbus PLC未连接，无法写入数据: {self.device.name}")
            return False

        try:
            # 确保PLC使用正确的站号
            if self.plc.Station != self.station_id:
                self.plc.Station = self.station_id
                logger.debug(f"设置站号为 {self.station_id}: {self.device.name}")

            # 根据地址范围判断写入方法
            addr_num = int(address) if address.isdigit() else 0
            write_result = None

            if 1 <= addr_num <= 9999:  # 线圈地址
                # 转换float为bool
                bool_value = bool(value)
                write_result = self.plc.Write(address, bool_value)

                if write_result.IsSuccess:
                    logger.info(f"写入Modbus线圈成功 {self.device.name}: {address} = {bool_value}")
                    return True
                else:
                    self.last_error = write_result.Message
                    logger.error(f"写入Modbus线圈失败 {self.device.name}: {write_result.Message}")
                    return False

            elif 10001 <= addr_num <= 19999:  # 输入线圈 - 只读
                self.last_error = "输入线圈地址是只读的，无法写入"
                logger.error(f"Modbus写入失败 {self.device.name}: 输入线圈地址{address}是只读的")
                return False

            else:  # 寄存器地址
                # 转换float为short
                short_value = int(value)
                write_result = self.plc.Write(address, short_value)

                if write_result.IsSuccess:
                    logger.info(f"写入Modbus寄存器成功 {self.device.name}: {address} = {short_value}")
                    return True
                else:
                    self.last_error = write_result.Message
                    logger.error(f"写入Modbus寄存器失败 {self.device.name}: {write_result.Message}")
                    return False

        except Exception as e:
            self.last_error = str(e)
            logger.error(f"写入Modbus数据异常 {self.device.name}: {e}")
            return False

    def write_bit_in_register(self, address: str, bit_position: int, value: bool) -> bool:
        """写入寄存器中的位（功能码16或掩码写入）

        Args:
            address: 寄存器地址，如 "100" 或 "40001"
            bit_position: 位位置 (0-15)
            value: 位值

        Returns:
            是否写入成功
        """
        if not self.plc:
            logger.error(f"Modbus PLC未连接，无法写入位数据: {self.device.name}")
            return False

        try:
            # 确保PLC使用正确的站号
            if self.plc.Station != self.station_id:
                self.plc.Station = self.station_id
                logger.debug(f"设置站号为 {self.station_id}: {self.device.name}")

            # 构造位地址格式，如 "100.1" 表示地址100的第1位
            bit_address = f"{address}.{bit_position}"

            # 写入位数据（HslCommunication会自动选择掩码写入或读-改-写方式）
            write_result = self.plc.Write(bit_address, value)

            if write_result.IsSuccess:
                logger.info(f"写入Modbus寄存器位成功 {self.device.name}: {bit_address} = {value}")
                return True
            else:
                self.last_error = write_result.Message
                logger.error(f"写入Modbus寄存器位失败 {self.device.name}: {write_result.Message}")
                return False

        except Exception as e:
            self.last_error = str(e)
            logger.error(f"写入Modbus寄存器位异常 {self.device.name}: {e}")
            return False

    def read_write_multiple(self, read_addresses: List[str], write_address: str, write_value: bytes) -> tuple[Dict[str, Optional[float]], bool]:
        """同时读写操作（功能码17）

        Args:
            read_addresses: 要读取的地址列表
            write_address: 要写入的地址
            write_value: 要写入的字节数据

        Returns:
            (读取的数据字典, 是否在线)
        """
        if not self.plc:
            return {addr: None for addr in read_addresses}, False

        try:
            # 解析读取地址
            parsed_read_addresses = [self._parse_modbus_address(addr) for addr in read_addresses]
            parsed_write_address = self._parse_modbus_address(write_address)

            # 执行读写操作
            read_result = self.plc.ReadWrite(
                parsed_read_addresses[0],  # 读取起始地址
                len(parsed_read_addresses),  # 读取长度
                parsed_write_address,       # 写入地址
                list(write_value)           # 写入数据
            )

            if read_result.IsSuccess:
                # 解析读取的数据
                all_values = {}
                try:
                    # 假设都是寄存器数据读取
                    values = self.plc.ByteTransform.TransInt16(
                        read_result.Content, 0, len(parsed_read_addresses)
                    )

                    if values:
                        for idx, original_addr in enumerate(read_addresses):
                            all_values[original_addr] = float(values[idx])
                    else:
                        for original_addr in read_addresses:
                            all_values[original_addr] = None

                    logger.info(f"Modbus同时读写操作成功 {self.device.name}")
                    return all_values, True

                except Exception as e:
                    logger.error(f"解析Modbus同时读写数据失败 {self.device.name}: {e}")
                    return {addr: None for addr in read_addresses}, True
            else:
                self.last_error = read_result.Message
                logger.error(f"Modbus同时读写操作失败 {self.device.name}: {read_result.Message}")
                return {addr: None for addr in read_addresses}, False

        except Exception as e:
            self.last_error = str(e)
            logger.error(f"Modbus同时读写操作异常 {self.device.name}: {e}")
            return {addr: None for addr in read_addresses}, False

    def connect(self) -> bool:
        """连接Modbus PLC"""
        try:
            if not self.plc:
                self.last_error = "PLC实例未创建"
                return False

            # 对于串口设备，需要设置串口参数
            if hasattr(self.device, 'serial_params') and self.device.serial_params:
                try:
                    serial_params = self.device.serial_params
                    # 格式: "COM3-9600-8-N-1"
                    if hasattr(self.plc, 'SerialPortInni'):
                        self.plc.SerialPortInni(serial_params)
                        logger.info(f"设置串口参数 {self.device.name}: {serial_params}")
                except Exception as e:
                    logger.warning(f"设置串口参数失败 {self.device.name}: {e}")

            connect_result = self.plc.ConnectServer()
            if connect_result.IsSuccess:
                logger.info(f"Modbus PLC连接成功: {self.device.name} (站号:{self.station_id})")
                return True
            else:
                self.last_error = connect_result.Message
                logger.error(f"Modbus PLC连接失败 {self.device.name}: {connect_result.Message}")
                from database import db_manager
                db_manager.write_communication_error(self.device.id, self.device.name, connect_result.Message)
                return False
        except Exception as e:
            self.last_error = str(e)
            logger.error(f"Modbus PLC连接异常 {self.device.name}: {e}")
            from database import db_manager
            db_manager.write_communication_error(self.device.id, self.device.name, str(e))
            return False

    def disconnect(self):
        """断开Modbus PLC连接"""
        try:
            if self.plc:
                self.plc.ConnectClose()
                logger.info(f"Modbus PLC断开连接: {self.device.name}")
        except Exception as e:
            logger.error(f"断开Modbus PLC连接失败 {self.device.name}: {e}")

    def update_timeouts(self, connect_timeout: int, receive_timeout: int):
        """更新Modbus PLC连接和接收超时配置"""
        try:
            if hasattr(self.plc, 'ConnectTimeOut'):
                self.plc.ConnectTimeOut = connect_timeout
            if hasattr(self.plc, 'ReceiveTimeOut'):
                self.plc.ReceiveTimeOut = receive_timeout
            logger.info(f"更新Modbus PLC超时配置 {self.device.name}: 连接超时={connect_timeout}ms, 接收超时={receive_timeout}ms")
        except Exception as e:
            logger.error(f"更新Modbus PLC超时配置失败 {self.device.name}: {e}")

    def broadcast_write(self, address: str, value: float) -> bool:
        """广播写入数据（站号0，不等待响应）

        Args:
            address: 写入地址
            value: 写入值

        Returns:
            是否发送成功（发送即认为成功，不等待响应）
        """
        if not self.plc:
            logger.error(f"Modbus PLC未连接，无法广播写入: {self.device.name}")
            return False

        try:
            # 设置广播站号
            original_station = self.plc.Station
            self.plc.Station = 0  # 广播站号

            # 构造带站号的地址
            parsed_address = self._parse_modbus_address(address)
            broadcast_address = f"s=0;{parsed_address}"

            # 执行写入
            success = self.write_address(broadcast_address, value)

            # 恢复原站号
            self.plc.Station = original_station

            if success:
                logger.info(f"Modbus广播写入成功 {self.device.name}: {address} = {value}")
            else:
                logger.error(f"Modbus广播写入失败 {self.device.name}: {self.last_error}")

            return success

        except Exception as e:
            self.last_error = str(e)
            logger.error(f"Modbus广播写入异常 {self.device.name}: {e}")
            return False

    
    def get_protocol_info(self) -> dict:
        """获取协议信息"""
        return {
            'protocol': 'Modbus',
            'station_id': self.station_id,
            'ip_address': self.device.ip_address,
            'port': self.device.port,
            'plc_type': self.device.plc_type,
            'address_formats_supported': [
                '1-9999 (线圈地址)',
                '10001-19999 (输入线圈)',
                '30001-39999 (输入寄存器)',
                '40001-49999 (保持寄存器)',
                '其他地址 (默认按保持寄存器处理)'
            ],
            'write_methods': [
                'write_address - 写入单个地址',
                'write_bit_in_register - 写入寄存器中的位',
                'read_write_multiple - 同时读写操作',
                'broadcast_write - 广播写入'
            ],
            'usage_examples': {
                'coil_read': 'modbus.ReadBool("1")',
                'register_read': 'modbus.ReadInt16("40001")',
                'register_read_int32': 'modbus.ReadInt32("40001")',
                'register_read_float': 'modbus.ReadFloat("40001")',
                'string_read': 'modbus.ReadString("40001", 10)',
                'coil_write': 'modbus.Write("1", True)',
                'register_write': 'modbus.Write("40001", 123)'
            }
        }