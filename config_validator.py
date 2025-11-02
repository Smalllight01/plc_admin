# -*- coding: utf-8 -*-
"""
配置验证器
用于验证系统设置和配置的合法性
"""

from typing import Dict, Any, List, Tuple
from loguru import logger


class ConfigValidator:
    """配置验证器类"""

    @staticmethod
    def validate_system_settings(settings: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """验证系统设置

        Args:
            settings: 系统设置字典

        Returns:
            tuple: (是否有效, 错误信息列表)
        """
        errors = []

        # 验证采集间隔
        collect_interval = settings.get('plc_collect_interval')
        if collect_interval is not None:
            if not isinstance(collect_interval, (int, float)):
                errors.append("采集间隔必须是数字")
            elif collect_interval < 1:
                errors.append("采集间隔不能小于1秒")
            elif collect_interval > 3600:
                errors.append("采集间隔不能大于3600秒")

        # 验证连接超时
        connect_timeout = settings.get('plc_connect_timeout')
        if connect_timeout is not None:
            if not isinstance(connect_timeout, int):
                errors.append("连接超时必须是整数")
            elif connect_timeout < 100:
                errors.append("连接超时不能小于100毫秒")
            elif connect_timeout > 30000:
                errors.append("连接超时不能大于30000毫秒")

        # 验证接收超时
        receive_timeout = settings.get('plc_receive_timeout')
        if receive_timeout is not None:
            if not isinstance(receive_timeout, int):
                errors.append("接收超时必须是整数")
            elif receive_timeout < 100:
                errors.append("接收超时不能小于100毫秒")
            elif receive_timeout > 60000:
                errors.append("接收超时不能大于60000毫秒")

        # 验证最大并发连接数
        max_connections = settings.get('max_concurrent_connections')
        if max_connections is not None:
            if not isinstance(max_connections, int):
                errors.append("最大并发连接数必须是整数")
            elif max_connections < 1:
                errors.append("最大并发连接数不能小于1")
            elif max_connections > 1000:
                errors.append("最大并发连接数不能大于1000")

        # 验证数据保留天数
        retention_days = settings.get('data_retention_days')
        if retention_days is not None:
            if not isinstance(retention_days, int):
                errors.append("数据保留天数必须是整数")
            elif retention_days < 0:
                errors.append("数据保留天数不能为负数")
            elif retention_days > 3650:
                errors.append("数据保留天数不能大于3650天")

        return len(errors) == 0, errors

    @staticmethod
    def validate_device_config(device_config: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """验证设备配置

        Args:
            device_config: 设备配置字典

        Returns:
            tuple: (是否有效, 错误信息列表)
        """
        errors = []

        # 验证设备名称
        name = device_config.get('name')
        if not name or not isinstance(name, str):
            errors.append("设备名称不能为空")
        elif len(name) > 100:
            errors.append("设备名称不能超过100个字符")

        # 验证PLC类型
        plc_type = device_config.get('plc_type')
        if not plc_type or not isinstance(plc_type, str):
            errors.append("PLC类型不能为空")

        # 验证IP地址
        ip_address = device_config.get('ip_address')
        if ip_address and not isinstance(ip_address, str):
            errors.append("IP地址格式错误")

        # 验证端口
        port = device_config.get('port')
        if port is not None:
            if not isinstance(port, int):
                errors.append("端口必须是整数")
            elif port < 1 or port > 65535:
                errors.append("端口必须在1-65535范围内")

        return len(errors) == 0, errors

    @staticmethod
    def validate_address_config(address_config: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """验证地址配置

        Args:
            address_config: 地址配置字典

        Returns:
            tuple: (是否有效, 错误信息列表)
        """
        errors = []

        # 验证地址
        address = address_config.get('address')
        if not address or not isinstance(address, str):
            errors.append("地址不能为空")

        # 验证数据类型
        data_type = address_config.get('type')
        if data_type and data_type not in ['int16', 'int32', 'float', 'double', 'bool']:
            errors.append(f"不支持的数据类型: {data_type}")

        # 验证缩放配置
        scaling = address_config.get('scaling', {})
        if scaling.get('enabled', False):
            input_min = scaling.get('inputMin')
            input_max = scaling.get('inputMax')
            output_min = scaling.get('outputMin')
            output_max = scaling.get('outputMax')

            if input_min is not None and input_max is not None:
                if input_min >= input_max:
                    errors.append("缩放输入范围最小值必须小于最大值")

            if output_min is not None and output_max is not None:
                if output_min >= output_max:
                    errors.append("缩放输出范围最小值必须小于最大值")

        return len(errors) == 0, errors

    @staticmethod
    def sanitize_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
        """清理和标准化设置

        Args:
            settings: 原始设置字典

        Returns:
            清理后的设置字典
        """
        sanitized = settings.copy()

        # 确保数值类型正确
        if 'plc_collect_interval' in sanitized:
            try:
                sanitized['plc_collect_interval'] = float(sanitized['plc_collect_interval'])
            except (ValueError, TypeError):
                del sanitized['plc_collect_interval']

        if 'plc_connect_timeout' in sanitized:
            try:
                sanitized['plc_connect_timeout'] = int(sanitized['plc_connect_timeout'])
            except (ValueError, TypeError):
                del sanitized['plc_connect_timeout']

        if 'plc_receive_timeout' in sanitized:
            try:
                sanitized['plc_receive_timeout'] = int(sanitized['plc_receive_timeout'])
            except (ValueError, TypeError):
                del sanitized['plc_receive_timeout']

        if 'max_concurrent_connections' in sanitized:
            try:
                sanitized['max_concurrent_connections'] = int(sanitized['max_concurrent_connections'])
            except (ValueError, TypeError):
                del sanitized['max_concurrent_connections']

        if 'data_retention_days' in sanitized:
            try:
                sanitized['data_retention_days'] = int(sanitized['data_retention_days'])
            except (ValueError, TypeError):
                del sanitized['data_retention_days']

        return sanitized