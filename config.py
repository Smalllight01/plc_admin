# -*- coding: utf-8 -*-
"""
项目配置文件
管理数据库连接、应用设置等配置信息
"""

import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """应用配置类"""
    
    # 应用基础配置
    APP_NAME = "PLC采集平台"
    APP_VERSION = "1.0.0"
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 8000))
    
    # JWT配置
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRE_HOURS = 24
    
    # SQLite数据库配置
    SQLITE_DATABASE_URL = os.getenv('SQLITE_DATABASE_URL', 'sqlite:///./plc_admin.db')
    
    # InfluxDB配置
    INFLUXDB_URL = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
    INFLUXDB_TOKEN = os.getenv('INFLUXDB_TOKEN', '')
    INFLUXDB_ORG = os.getenv('INFLUXDB_ORG', 'plc_org')
    INFLUXDB_BUCKET = os.getenv('INFLUXDB_BUCKET', 'plc_data')
    
    # PLC采集配置
    PLC_COLLECT_INTERVAL = int(os.getenv('PLC_COLLECT_INTERVAL', 5))  # 秒
    PLC_CONNECT_TIMEOUT = int(os.getenv('PLC_CONNECT_TIMEOUT', 5000))  # 毫秒
    PLC_RECEIVE_TIMEOUT = int(os.getenv('PLC_RECEIVE_TIMEOUT', 10000))  # 毫秒
    
    # 日志配置
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/plc_admin.log')
    
    # 超级管理员配置
    SUPER_ADMIN_USERNAME = os.getenv('SUPER_ADMIN_USERNAME', 'admin')
    SUPER_ADMIN_PASSWORD = os.getenv('SUPER_ADMIN_PASSWORD', 'admin123')
    SUPER_ADMIN_EMAIL = os.getenv('SUPER_ADMIN_EMAIL', 'admin@plc.com')

# 创建配置实例
config = Config()