# -*- coding: utf-8 -*-
"""
Modbus设备配置示例
展示如何配置不同类型的Modbus设备
"""

# ModbusTCP设备配置示例
MODBUS_TCP_CONFIG = {
    "name": "ModbusTCP设备1",
    "plc_type": "ModbusTCP",  # 或者 "mb_tcp"
    "protocol": "tcp",
    "ip_address": "192.168.1.100",
    "port": 502,
    "addresses": ["100", "101", "102", "103", "104"],
    "is_active": True,
    "group_id": 1
}

# ModbusRTU设备配置示例
MODBUS_RTU_CONFIG = {
    "name": "ModbusRTU设备1",
    "plc_type": "ModbusRTU",  # 或者 "mb_rtu"
    "protocol": "rtu",
    "ip_address": "",  # RTU设备通常不使用IP地址
    "port": None,
    "addresses": ["100", "101", "102"],
    "is_active": True,
    "group_id": 2,
    # RTU特有配置（需要在Device模型中添加相应字段）
    "com_name": "COM1",
    "baud_rate": 9600,
    "data_bits": 8,
    "parity": "N",
    "stop_bits": 1
}

# ModbusRtuOverTCP设备配置示例
MODBUS_RTU_OVER_TCP_CONFIG = {
    "name": "ModbusRTUOverTCP设备1",
    "plc_type": "ModbusRtuOverTCP",  # 或者 "mb_rtu_over_tcp"
    "protocol": "tcp",
    "ip_address": "192.168.1.101",
    "port": 502,
    "addresses": ["100", "101", "102"],
    "is_active": True,
    "group_id": 3
}

# 高级Modbus配置示例
ADVANCED_MODBUS_CONFIG = {
    "name": "高级Modbus设备",
    "plc_type": "ModbusTCP",
    "protocol": "tcp",
    "ip_address": "192.168.1.102",
    "port": 502,
    # 使用不同的功能码和站号
    "addresses": [
        "100",                    # 默认保持寄存器
        "s=1;101",               # 站号1的保持寄存器
        "s=2;102",               # 站号2的保持寄存器
        "x=1;200",               # 读取线圈（功能码01）
        "x=2;300",               # 读取输入线圈（功能码02）
        "x=4;400",               # 读取输入寄存器（功能码04）
    ],
    "is_active": True,
    "group_id": 4
}

# 不同的地址格式示例
MODBUS_ADDRESS_EXAMPLES = {
    "holding_registers": {
        "description": "保持寄存器（功能码03）",
        "addresses": [
            "100",           # 简单地址
            "400101",        # Modbus标准格式（4开头表示保持寄存器）
            "x=3;100",       # 明确指定功能码03
        ]
    },
    "input_registers": {
        "description": "输入寄存器（功能码04）",
        "addresses": [
            "x=4;100",       # 明确指定功能码04
            "300101",        # Modbus标准格式（3开头表示输入寄存器）
        ]
    },
    "coils": {
        "description": "线圈（功能码01）",
        "addresses": [
            "x=1;100",       # 明确指定功能码01
            "000101",        # Modbus标准格式（0开头表示线圈）
        ]
    },
    "discrete_inputs": {
        "description": "输入线圈（功能码02）",
        "addresses": [
            "x=2;100",       # 明确指定功能码02
            "100101",        # Modbus标准格式（1开头表示输入线圈）
        ]
    },
    "multi_station": {
        "description": "多站号配置",
        "addresses": [
            "s=1;100",       # 站号1
            "s=2;100",       # 站号2
            "s=3;100",       # 站号3
        ]
    }
}

def create_modbus_device_configs():
    """创建Modbus设备配置列表"""
    return [
        MODBUS_TCP_CONFIG,
        MODBUS_RTU_CONFIG,
        MODBUS_RTU_OVER_TCP_CONFIG,
        ADVANCED_MODBUS_CONFIG
    ]

def get_address_explanation():
    """获取Modbus地址说明"""
    return """
Modbus地址格式说明：

1. 基本格式：
   - "100" - 简单地址，默认为保持寄存器

2. 功能码格式：
   - "x=1;100" - 功能码01，读取线圈
   - "x=2;100" - 功能码02，读取输入线圈
   - "x=3;100" - 功能码03，读取保持寄存器
   - "x=4;100" - 功能码04，读取输入寄存器

3. 站号格式：
   - "s=1;100" - 站号1的地址100
   - "s=2;100" - 站号2的地址100

4. 组合格式：
   - "s=2;x=1;100" - 站号2，功能码01，地址100

5. Modbus标准格式：
   - "000101" - 线圈地址（功能码01）
   - "100101" - 输入线圈地址（功能码02）
   - "400101" - 保持寄存器地址（功能码03）
   - "300101" - 输入寄存器地址（功能码04）

注意：地址是否从0开始取决于设备配置，通常工业设备地址从1开始
"""

if __name__ == "__main__":
    print("Modbus设备配置示例")
    print("=" * 50)

    configs = create_modbus_device_configs()
    for i, config in enumerate(configs, 1):
        print(f"\n配置 {i}: {config['name']}")
        print(f"协议类型: {config['plc_type']}")
        print(f"地址: {config['ip_address']}:{config.get('port', 'N/A')}")
        print(f"采集地址: {', '.join(config['addresses'])}")

    print("\n" + "=" * 50)
    print(get_address_explanation())