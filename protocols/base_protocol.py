# -*- coding: utf-8 -*-
"""
协议处理器基类
定义所有PLC协议处理器的通用接口
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from models import Device


class BaseProtocolHandler(ABC):
    """协议处理器基类"""

    def __init__(self, device: Device):
        self.device = device
        self.plc = None
        self.last_error = None

    @abstractmethod
    def create_plc_instance(self) -> bool:
        """创建PLC实例"""
        pass

    @abstractmethod
    def read_addresses(self, addresses: List[str], address_configs: Optional[List[dict]] = None) -> tuple[Dict[str, Optional[float]], bool]:
        """批量读取地址数据"""
        pass

    @abstractmethod
    def write_address(self, address: str, value: float) -> bool:
        """写入单个地址数据"""
        pass

    @abstractmethod
    def connect(self) -> bool:
        """连接PLC"""
        pass

    @abstractmethod
    def disconnect(self):
        """断开PLC连接"""
        pass

    def update_timeouts(self, connect_timeout: int, receive_timeout: int):
        """更新连接和接收超时配置（默认实现）"""
        if self.plc:
            if hasattr(self.plc, 'ConnectTimeOut'):
                self.plc.ConnectTimeOut = connect_timeout
            if hasattr(self.plc, 'ReceiveTimeOut'):
                self.plc.ReceiveTimeOut = receive_timeout