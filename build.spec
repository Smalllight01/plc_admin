# -*- mode: python ; coding: utf-8 -*-
"""
PLC采集平台后端PyInstaller构建配置文件
定义了打包的详细参数和依赖关系
"""

import os
import sys
from pathlib import Path

# 获取项目根目录
project_root = os.path.abspath('.')

# 定义需要包含的数据文件
datas = [
    # API路由模块
    ('api', 'api'),
    # 配置文件
    ('config.py', '.'),
    # 数据库模型
    ('models.py', '.'),
    # 认证模块
    ('auth.py', '.'),
    # 数据库模块
    ('database.py', '.'),
    # PLC采集器
    ('plc_collector.py', '.'),
    # 环境变量示例文件
    ('.env.example', '.'),
    # 需求文件
    ('requirements.txt', '.'),
]

# 定义需要包含的二进制文件
binaries = []

# 定义隐藏导入（PyInstaller可能无法自动检测的模块）
hiddenimports = [
    # FastAPI相关
    'fastapi',
    'fastapi.applications',
    'fastapi.routing',
    'fastapi.middleware',
    'fastapi.middleware.cors',
    'fastapi.security',
    'fastapi.security.http',
    'fastapi.security.oauth2',
    
    # Uvicorn相关
    'uvicorn',
    'uvicorn.main',
    'uvicorn.config',
    'uvicorn.server',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.websockets',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    
    # SQLAlchemy相关
    'sqlalchemy',
    'sqlalchemy.ext',
    'sqlalchemy.ext.declarative',
    'sqlalchemy.orm',
    'sqlalchemy.sql',
    'sqlalchemy.engine',
    'sqlalchemy.dialects',
    'sqlalchemy.dialects.sqlite',
    
    # InfluxDB相关
    'influxdb_client',
    'influxdb_client.client',
    'influxdb_client.client.write_api',
    'influxdb_client.client.query_api',
    
    # Pydantic相关
    'pydantic',
    'pydantic.fields',
    'pydantic.main',
    'pydantic.types',
    'pydantic.validators',
    
    # 其他依赖
    'passlib',
    'passlib.context',
    'passlib.hash',
    'python_jose',
    'python_jose.jwt',
    'python_multipart',
    'python_dotenv',
    
    # PythonNET相关（如果使用）
    'pythonnet',
    'clr',
    
    # 标准库模块
    'asyncio',
    'threading',
    'multiprocessing',
    'concurrent',
    'concurrent.futures',
    'json',
    'datetime',
    'logging',
    'logging.handlers',
    'sqlite3',
    'hashlib',
    'secrets',
    'typing',
    'typing_extensions',
    
    # API路由模块
    'api.auth_routes',
    'api.dashboard_routes',
    'api.data_routes',
    'api.device_routes',
    'api.group_routes',
    'api.performance_routes',
    'api.settings_routes',
    'api.user_routes',
]

# 定义需要排除的模块
excludes = [
    'tkinter',
    'matplotlib',
    'numpy',
    'pandas',
    'scipy',
    'PIL',
    'cv2',
    'torch',
    'tensorflow',
]

# 分析配置
a = Analysis(
    ['main.py'],  # 入口文件
    pathex=[project_root],  # 搜索路径
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# PYZ配置（Python字节码归档）
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# EXE配置（可执行文件）
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='plc_admin',  # 可执行文件名
    debug=False,  # 调试模式
    bootloader_ignore_signals=False,
    strip=False,  # 是否去除符号表
    upx=True,  # 是否使用UPX压缩
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # 显示控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # 可以添加图标文件路径
    version_file=None,  # 可以添加版本信息文件
)

# 如果需要创建目录结构（onedir模式）
# coll = COLLECT(
#     exe,
#     a.binaries,
#     a.zipfiles,
#     a.datas,
#     strip=False,
#     upx=True,
#     upx_exclude=[],
#     name='plc_admin'
# )