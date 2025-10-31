# -*- coding: utf-8 -*-
"""
西门子PLC协议处理器
支持西门子S7协议的PLC设备
"""

from typing import Dict, List, Optional
from loguru import logger

from .base_protocol import BaseProtocolHandler
from models import Device

# 尝试导入HslCommunication相关类
try:
    import clr
    clr.AddReference(r'HslCommunication')
    from HslCommunication.Profinet.Siemens import SiemensS7Net, SiemensPLCS
    from HslCommunication.Core import DataFormat
    CLR_AVAILABLE = True
except Exception as e:
    logger.error(f"CLR或HslCommunication库加载失败: {e}")
    CLR_AVAILABLE = False

    # 定义占位符类以避免导入错误
    class SiemensS7Net: pass
    class SiemensPLCS: pass
    class DataFormat: pass


class SiemensProtocolHandler(BaseProtocolHandler):
    """西门子协议处理器"""

    def create_plc_instance(self) -> bool:
        """创建西门子PLC实例"""
        try:
            if not CLR_AVAILABLE:
                logger.error(f"CLR环境不可用，无法创建西门子PLC实例: {self.device.name}")
                self.last_error = "CLR环境不可用"
                return False

            self.plc = SiemensS7Net(SiemensPLCS.S1200)
            # 设置数据格式（从设备配置中获取字节顺序）
            device_byte_order = getattr(self.device, 'byte_order', 'CDAB')

            # 映射字节顺序到DataFormat
            byte_order_mapping = {
                'ABCD': DataFormat.ABCD,
                'BADC': DataFormat.BADC,
                'CDAB': DataFormat.CDAB,
                'DCBA': DataFormat.DCBA
            }

            data_format = byte_order_mapping.get(device_byte_order, DataFormat.CDAB)
            self.plc.ByteTransform.DataFormat = data_format
            logger.info(f"设置西门子PLC数据格式为{device_byte_order}: {self.device.name}")

            # 西门子S7直接设置IP和端口
            self.plc.IpAddress = self.device.ip_address
            self.plc.Port = self.device.port

            logger.info(f"西门子PLC实例创建成功: {self.device.name}")
            return True

        except Exception as e:
            logger.error(f"创建西门子PLC实例失败 {self.device.name}: {e}")
            self.last_error = str(e)
            return False

    def read_addresses(self, addresses: List[str], address_configs: Optional[List[dict]] = None) -> tuple[Dict[str, Optional[float]], bool]:
        """批量读取西门子PLC地址数据"""
        if not self.plc:
            return {addr: None for addr in addresses}, False

        try:
            all_values = {}
            has_network_communication = False

            # 如果没有提供地址配置，创建默认配置
            if address_configs is None:
                address_configs = []
                for addr in addresses:
                    address_configs.append({
                        'address': addr,
                        'type': 'int16'
                    })

            # 逐个读取地址
            for i, addr in enumerate(addresses):
                try:
                    config = address_configs[i] if i < len(address_configs) else {}
                    data_type = config.get('type', 'int16')
                    read_result = None
                    value = None

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
                            logger.error(f"西门子PLC网络通信失败 {self.device.name}: {read_result.Message if read_result else '未知错误'}")
                            all_values[addr] = None
                        else:
                            # 非网络错误，可能是地址错误或权限问题
                            has_network_communication = True
                            logger.warning(f"西门子PLC数据读取失败但PLC在线 {self.device.name} (地址{addr}, 类型{data_type}): {read_result.Message if read_result else '未知错误'}")
                            all_values[addr] = None

                except Exception as e:
                    logger.error(f"读取地址{addr}时发生异常 {self.device.name}: {e}")
                    all_values[addr] = None

            return all_values, has_network_communication

        except Exception as e:
            logger.error(f"读取西门子PLC地址数据异常 {self.device.name}: {e}")
            return {addr: None for addr in addresses}, False

    def write_address(self, address: str, value: float) -> bool:
        """写入西门子PLC单个地址数据"""
        if not self.plc:
            logger.error(f"西门子PLC未连接，无法写入数据: {self.device.name}")
            return False

        try:
            # 这里实现西门子PLC的写入逻辑
            # TODO: 根据西门子协议实现具体的写入方法
            # 示例代码（需要根据实际地址格式调整）:
            # write_result = self.plc.Write(address, int(value))
            # if write_result.IsSuccess:
            #     logger.info(f"写入西门子PLC数据成功 {self.device.name}: {address} = {value}")
            #     return True
            # else:
            #     logger.error(f"写入西门子PLC数据失败 {self.device.name}: {write_result.Message}")
            #     self.last_error = write_result.Message
            #     return False

            logger.info(f"写入西门子PLC数据 {self.device.name}: {address} = {value}")
            return True
        except Exception as e:
            logger.error(f"写入西门子PLC数据失败 {self.device.name}: {e}")
            self.last_error = str(e)
            return False

    def connect(self) -> bool:
        """连接西门子PLC"""
        try:
            if not self.plc:
                self.last_error = "PLC实例未创建"
                return False

            connect_result = self.plc.ConnectServer()
            if connect_result.IsSuccess:
                logger.info(f"西门子PLC连接成功: {self.device.name}")
                return True
            else:
                self.last_error = connect_result.Message
                logger.error(f"西门子PLC连接失败 {self.device.name}: {connect_result.Message}")
                from database import db_manager
                db_manager.write_communication_error(self.device.id, self.device.name, connect_result.Message)
                return False
        except Exception as e:
            self.last_error = str(e)
            logger.error(f"西门子PLC连接异常 {self.device.name}: {e}")
            from database import db_manager
            db_manager.write_communication_error(self.device.id, self.device.name, str(e))
            return False

    def disconnect(self):
        """断开西门子PLC连接"""
        try:
            if self.plc:
                self.plc.ConnectClose()
                logger.info(f"西门子PLC断开连接: {self.device.name}")
        except Exception as e:
            logger.error(f"断开西门子PLC连接失败 {self.device.name}: {e}")