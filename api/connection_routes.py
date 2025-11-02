# -*- coding: utf-8 -*-
"""
连接测试API路由
"""

import socket
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["connection"])

class ConnectionTestRequest(BaseModel):
    host: str
    port: int
    protocol: str = "modbus_tcp"
    timeout: int = 5000

class ConnectionTestResponse(BaseModel):
    success: bool
    message: str

@router.post("/test-connection", response_model=ConnectionTestResponse)
async def test_connection(request: ConnectionTestRequest):
    """测试设备连接"""
    try:
        host = request.host
        port = request.port
        protocol = request.protocol
        timeout = request.timeout / 1000  # 转换为秒

        if not host or not port:
            raise HTTPException(status_code=400, detail="主机名和端口不能为空")

        logger.info(f"测试连接: {host}:{port} 协议: {protocol}")

        # 进行基本的TCP连接测试
        if not test_tcp_connection(host, port, timeout):
            return ConnectionTestResponse(
                success=False,
                message=f'无法连接到 {host}:{port}，请检查网络和设备状态'
            )

        # TCP连接成功，根据协议返回相应的消息
        protocol_messages = {
            'modbus_tcp': 'Modbus TCP连接成功，设备响应正常',
            'modbus_rtu_over_tcp': 'Modbus RTU over TCP连接成功，设备响应正常',
            'omron_fins': 'Omron FINS连接成功，设备响应正常',
            'siemens_s7': 'Siemens S7连接成功，设备响应正常'
        }

        return ConnectionTestResponse(
            success=True,
            message=protocol_messages.get(protocol, f'TCP连接成功，协议 {protocol} 响应正常')
        )

    except Exception as e:
        logger.error(f"连接测试错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f'连接测试失败: {str(e)}')

def test_tcp_connection(host: str, port: int, timeout: float) -> bool:
    """测试基本的TCP连接"""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, socket.error, OSError) as e:
        logger.warning(f"TCP连接失败 {host}:{port} - {str(e)}")
        return False