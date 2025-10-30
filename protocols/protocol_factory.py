# -*- coding: utf-8 -*-
"""
协议处理器工厂类
根据设备类型创建对应的协议处理器
"""

from loguru import logger

from .base_protocol import BaseProtocolHandler
from .omron_protocol import OmronProtocolHandler
from .modbus_protocol import ModbusProtocolHandler
from .siemens_protocol import SiemensProtocolHandler
from models import Device


class ProtocolFactory:
    """协议处理器工厂类"""

    @staticmethod
    def create_handler(device: Device) -> BaseProtocolHandler:
        """根据设备类型创建对应的协议处理器"""
        plc_type_lower = device.plc_type.lower()

        # Modbus协议判断
        if any(modbus_type in plc_type_lower for modbus_type in [
            'modbus', 'mb_', 'mbtcp', 'mbrtu', 'mb-rtu'
        ]):
            logger.info(f"为设备 {device.name} 创建Modbus协议处理器")
            return ModbusProtocolHandler(device)

        # 欧姆龙协议判断
        elif 'omron' in plc_type_lower or '欧姆龙' in plc_type_lower:
            logger.info(f"为设备 {device.name} 创建欧姆龙协议处理器")
            return OmronProtocolHandler(device)

        # 西门子协议判断
        elif 'siemens' in plc_type_lower or '西门子' in plc_type_lower:
            logger.info(f"为设备 {device.name} 创建西门子协议处理器")
            return SiemensProtocolHandler(device)

        # 默认使用Modbus协议
        else:
            logger.warning(f"未知的PLC型号 {device.plc_type}，使用默认Modbus协议处理器")
            return ModbusProtocolHandler(device)

    @staticmethod
    def get_supported_protocols() -> list:
        """获取支持的协议列表"""
        return [
            {
                'name': 'Modbus',
                'variants': ['Modbus TCP', 'Modbus RTU', 'Modbus RTU over TCP'],
                'keywords': ['modbus', 'mb_', 'mbtcp', 'mbrtu', 'mb-rtu'],
                'handler_class': ModbusProtocolHandler
            },
            {
                'name': 'Omron',
                'variants': ['Omron Fins'],
                'keywords': ['omron', '欧姆龙'],
                'handler_class': OmronProtocolHandler
            },
            {
                'name': 'Siemens',
                'variants': ['Siemens S7'],
                'keywords': ['siemens', '西门子'],
                'handler_class': SiemensProtocolHandler
            }
        ]

    @staticmethod
    def detect_protocol_type(plc_type: str) -> str:
        """检测PLC类型对应的协议类型"""
        plc_type_lower = plc_type.lower()

        if any(modbus_type in plc_type_lower for modbus_type in [
            'modbus', 'mb_', 'mbtcp', 'mbrtu', 'mb-rtu'
        ]):
            return 'Modbus'
        elif 'omron' in plc_type_lower or '欧姆龙' in plc_type_lower:
            return 'Omron'
        elif 'siemens' in plc_type_lower or '西门子' in plc_type_lower:
            return 'Siemens'
        else:
            return 'Unknown'