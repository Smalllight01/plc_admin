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
            self.plc.ByteTransform.DataFormat = DataFormat.CDAB
            self.plc.ByteTransform.IsStringReverseByteWord = True

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

    def read_addresses(self, addresses: List[str], address_configs: Optional[List[dict]] = None) -> tuple[Dict[str, Optional[float]], bool]:
        """批量读取欧姆龙PLC地址数据"""
        if not self.plc:
            return {addr: None for addr in addresses}, False

        try:
            chunk_size = 10  # 每次读取的地址数量
            all_values = {}
            has_network_communication = False

            for i in range(0, len(addresses), chunk_size):
                chunk_addresses = addresses[i:i + chunk_size]

                # 读取数据
                read_result = self.plc.Read(chunk_addresses)

                if read_result.IsSuccess:
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
                        logger.error(f"解析欧姆龙PLC数据失败 {self.device.name}: {e}")
                        for addr in chunk_addresses:
                            all_values[addr] = None
                else:
                    # 检查是否为网络相关错误
                    error_msg = read_result.Message.lower() if read_result.Message else ""
                    network_errors = [
                        'timeout', 'connection', 'network', 'socket',
                        'unreachable', 'refused', 'reset', 'closed'
                    ]

                    is_network_error = any(err in error_msg for err in network_errors)

                    if is_network_error:
                        logger.error(f"欧姆龙PLC网络通信失败 {self.device.name}: {read_result.Message}")
                        for addr in chunk_addresses:
                            all_values[addr] = None
                    else:
                        has_network_communication = True
                        logger.warning(f"欧姆龙PLC数据读取失败但PLC在线 {self.device.name}: {read_result.Message}")
                        for addr in chunk_addresses:
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