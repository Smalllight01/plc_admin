# -*- coding: utf-8 -*-
"""
欧姆龙PLC协议处理器
支持欧姆龙Fins协议的PLC设备
"""

from typing import Dict, List, Optional
from loguru import logger

from .base_protocol import BaseProtocolHandler
from models import Device

# 尝试导入HslCommunication相关类
try:
    import clr
    clr.AddReference(r'HslCommunication')
    from HslCommunication.Profinet.Omron import OmronFinsNet, OmronPlcType
    from HslCommunication.Core import DataFormat
    from HslCommunication.Core.Pipe import PipeTcpNet
    CLR_AVAILABLE = True
except Exception as e:
    logger.error(f"CLR或HslCommunication库加载失败: {e}")
    CLR_AVAILABLE = False

    # 定义占位符类以避免导入错误
    class OmronFinsNet: pass
    class OmronPlcType: pass
    class DataFormat: pass
    class PipeTcpNet: pass

from config import config


class OmronProtocolHandler(BaseProtocolHandler):
    """欧姆龙协议处理器"""

    def create_plc_instance(self) -> bool:
        """创建欧姆龙PLC实例"""
        try:
            if not CLR_AVAILABLE:
                logger.error(f"CLR环境不可用，无法创建欧姆龙PLC实例: {self.device.name}")
                self.last_error = "CLR环境不可用"
                return False

            self.plc = OmronFinsNet()
            self.plc.PlcType = OmronPlcType.CSCJ
            self.plc.DA2 = 0
            self.plc.ReceiveUntilEmpty = False
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
            self.plc.ByteTransform.IsStringReverseByteWord = True
            logger.info(f"设置欧姆龙PLC数据格式为{device_byte_order}: {self.device.name}")

            # 设置通信管道
            pipe_tcp_net = PipeTcpNet(self.device.ip_address, self.device.port)
            pipe_tcp_net.ConnectTimeOut = config.PLC_CONNECT_TIMEOUT
            pipe_tcp_net.ReceiveTimeOut = config.PLC_RECEIVE_TIMEOUT
            self.plc.CommunicationPipe = pipe_tcp_net

            logger.info(f"欧姆龙PLC实例创建成功: {self.device.name}")
            return True

        except Exception as e:
            logger.error(f"创建欧姆龙PLC实例失败 {self.device.name}: {e}")
            self.last_error = str(e)
            return False

    def _set_timeouts(self, connect_timeout: int = 3000, receive_timeout: int = 2000):
        """统一的超时设置方法"""
        if hasattr(self.plc, 'ConnectTimeOut'):
            self.plc.ConnectTimeOut = connect_timeout
        if hasattr(self.plc, 'ReceiveTimeOut'):
            self.plc.ReceiveTimeOut = receive_timeout

    def _read_with_retry(self, address: str, data_type: str, config: dict, original_addr: str):
        """智能重试读取机制"""
        max_retries = 2  # 最大重试次数
        retry_delay = 0.1  # 重试延迟（秒）

        for attempt in range(max_retries + 1):
            try:
                read_result = self._perform_read(address, data_type, config)
                if read_result and read_result.IsSuccess:
                    return read_result

                # 如果是第一次失败且是网络相关错误，进行重试
                if attempt < max_retries:
                    import time
                    time.sleep(retry_delay * (attempt + 1))  # 递增延迟

            except Exception as e:
                if attempt < max_retries:
                    import time
                    time.sleep(retry_delay * (attempt + 1))
                    continue
                else:
                    logger.error(f"读取地址{original_addr}时发生异常 {self.device.name}: {e}")
                    break

        return None

    def _perform_read(self, address: str, data_type: str, config: dict):
        """执行具体的读取操作"""
        if data_type == 'bool':
            return self.plc.ReadBool(address)
        elif data_type == 'int16':
            return self.plc.ReadInt16(address)
        elif data_type == 'uint16':
            return self.plc.ReadUInt16(address)
        elif data_type == 'int32':
            return self.plc.ReadInt32(address)
        elif data_type == 'uint32':
            return self.plc.ReadUInt32(address)
        elif data_type == 'float':
            return self.plc.ReadFloat(address)
        elif data_type == 'string':
            string_length = config.get('stringLength', 10)
            return self.plc.ReadString(address, string_length)
        else:
            # 默认使用Int16
            return self.plc.ReadInt16(address)

    def _parse_read_result(self, read_result, data_type: str, addr: str) -> Optional[float]:
        """解析读取结果"""
        try:
            if data_type == 'bool':
                return float(1 if read_result.Content else 0)
            elif data_type == 'string':
                # 字符串转换为数值
                try:
                    return float(read_result.Content)
                except (ValueError, TypeError):
                    logger.warning(f"字符串值无法转换为数值 {self.device.name}: {addr} = {read_result.Content}")
                    return None
            else:
                return float(read_result.Content)
        except Exception as e:
            logger.error(f"解析读取结果失败 {self.device.name}: {addr} = {e}")
            return None

    def _handle_read_error(self, read_result, addr: str, data_type: str):
        """处理读取错误并记录到InfluxDB"""
        error_msg = read_result.Message.lower() if read_result and read_result.Message else ""
        network_errors = [
            'timeout', 'connection', 'network', 'socket',
            'unreachable', 'refused', 'reset', 'closed'
        ]

        is_network_error = any(err in error_msg for err in network_errors)

        # 构建错误信息
        full_error_msg = read_result.Message if read_result else "未知错误"
        error_context = f"地址{addr}, 类型{data_type}"

        if is_network_error:
            logger.error(f"欧姆龙PLC网络通信失败 {self.device.name} ({error_context}): {full_error_msg}")
            # 存储网络错误到InfluxDB
            try:
                from database import db_manager
                db_manager.write_communication_error(
                    device_id=self.device.id,
                    device_name=self.device.name,
                    error_message=full_error_msg,
                    error_type="network_error",
                    severity="high",
                    address=addr
                )
            except Exception as e:
                logger.error(f"存储网络错误到InfluxDB失败 {self.device.name}: {e}")
        else:
            # 非网络错误，可能是地址错误或权限问题
            logger.warning(f"欧姆龙PLC数据读取失败但PLC在线 {self.device.name} ({error_context}): {full_error_msg}")
            # 存储读取错误到InfluxDB
            try:
                from database import db_manager
                db_manager.write_communication_error(
                    device_id=self.device.id,
                    device_name=self.device.name,
                    error_message=full_error_msg,
                    error_type="read_failed",
                    severity="medium",
                    address=addr
                )
            except Exception as e:
                logger.error(f"存储读取错误到InfluxDB失败 {self.device.name}: {e}")

    def read_addresses(self, addresses: List[str], address_configs: Optional[List[dict]] = None) -> tuple[Dict[str, Optional[float]], bool]:
        """批量读取欧姆龙PLC地址数据"""
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

                    # 使用智能重试机制读取数据
                    read_result = self._read_with_retry(addr, data_type, config, addr)
                    if read_result and read_result.IsSuccess:
                        # 解析读取结果
                        value = self._parse_read_result(read_result, data_type, addr)
                        if value is not None:
                            all_values[addr] = value
                            has_network_communication = True
                            logger.debug(f"读取成功 {self.device.name}: {addr} ({data_type}) = {value}")
                    else:
                        # 读取失败，分析错误类型
                        self._handle_read_error(read_result, addr, data_type)

                except Exception as e:
                    logger.error(f"读取地址{addr}时发生异常 {self.device.name}: {e}")
                    all_values[addr] = None

            return all_values, has_network_communication

        except Exception as e:
            logger.error(f"读取欧姆龙PLC地址数据异常 {self.device.name}: {e}")
            return {addr: None for addr in addresses}, False

    def write_address(self, address: str, value: float) -> bool:
        """写入欧姆龙PLC单个地址数据"""
        if not self.plc:
            logger.error(f"欧姆龙PLC未连接，无法写入数据: {self.device.name}")
            return False

        try:
            # 这里实现欧姆龙PLC的写入逻辑
            # TODO: 根据欧姆龙协议实现具体的写入方法
            # 示例代码（需要根据实际地址格式调整）:
            # write_result = self.plc.Write(address, int(value))
            # if write_result.IsSuccess:
            #     logger.info(f"写入欧姆龙PLC数据成功 {self.device.name}: {address} = {value}")
            #     return True
            # else:
            #     logger.error(f"写入欧姆龙PLC数据失败 {self.device.name}: {write_result.Message}")
            #     self.last_error = write_result.Message
            #     return False

            logger.info(f"写入欧姆龙PLC数据 {self.device.name}: {address} = {value}")
            return True
        except Exception as e:
            logger.error(f"写入欧姆龙PLC数据失败 {self.device.name}: {e}")
            self.last_error = str(e)
            return False

    def connect(self) -> bool:
        """连接欧姆龙PLC"""
        try:
            if not self.plc:
                self.last_error = "PLC实例未创建"
                return False

            connect_result = self.plc.ConnectServer()
            if connect_result.IsSuccess:
                logger.info(f"欧姆龙PLC连接成功: {self.device.name}")
                return True
            else:
                self.last_error = connect_result.Message
                logger.error(f"欧姆龙PLC连接失败 {self.device.name}: {connect_result.Message}")
                from database import db_manager
                db_manager.write_communication_error(self.device.id, self.device.name, connect_result.Message)
                return False
        except Exception as e:
            self.last_error = str(e)
            logger.error(f"欧姆龙PLC连接异常 {self.device.name}: {e}")
            from database import db_manager
            db_manager.write_communication_error(self.device.id, self.device.name, str(e))
            return False

    def disconnect(self):
        """断开欧姆龙PLC连接"""
        try:
            if self.plc:
                self.plc.ConnectClose()
                logger.info(f"欧姆龙PLC断开连接: {self.device.name}")
        except Exception as e:
            logger.error(f"断开欧姆龙PLC连接失败 {self.device.name}: {e}")

    def update_timeouts(self, connect_timeout: int, receive_timeout: int):
        """更新欧姆龙PLC连接和接收超时配置"""
        try:
            if hasattr(self.plc, 'CommunicationPipe') and self.plc.CommunicationPipe:
                self.plc.CommunicationPipe.ConnectTimeOut = connect_timeout
                self.plc.CommunicationPipe.ReceiveTimeOut = receive_timeout
            logger.info(f"更新欧姆龙PLC超时配置 {self.device.name}: 连接超时={connect_timeout}ms, 接收超时={receive_timeout}ms")
        except Exception as e:
            logger.error(f"更新欧姆龙PLC超时配置失败 {self.device.name}: {e}")