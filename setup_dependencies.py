# -*- coding: utf-8 -*-
"""
PLC采集平台依赖处理脚本
处理pythonnet、mono等复杂依赖的安装和配置
"""

import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path
import urllib.request
import zipfile

def check_system_requirements():
    """
    检查系统要求
    """
    print("检查系统要求...")
    
    # 检查操作系统
    if platform.system() != 'Windows':
        print("✗ 此脚本仅支持Windows系统")
        return False
    
    # 检查Python版本
    python_version = sys.version_info
    if python_version < (3, 8):
        print(f"✗ Python版本过低: {python_version.major}.{python_version.minor}")
        print("请升级到Python 3.8或更高版本")
        return False
    
    print(f"✓ Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
    print(f"✓ 操作系统: {platform.system()} {platform.release()}")
    return True

def install_python_packages():
    """
    安装Python包依赖
    """
    print("\n安装Python包依赖...")
    
    # 升级pip
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], check=True)
    
    # 安装基础依赖
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    
    # 安装PyInstaller
    subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    print("✓ Python包依赖安装完成")

def setup_pythonnet():
    """
    设置pythonnet环境
    """
    print("\n配置pythonnet环境...")
    
    try:
        import pythonnet
        print(f"✓ pythonnet已安装: {pythonnet.__version__}")
    except ImportError:
        print("安装pythonnet...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pythonnet"], check=True)
        print("✓ pythonnet安装完成")
    
    # 检查.NET Framework
    dotnet_versions = []
    dotnet_path = Path("C:/Windows/Microsoft.NET/Framework64")
    if dotnet_path.exists():
        for version_dir in dotnet_path.iterdir():
            if version_dir.is_dir() and version_dir.name.startswith('v'):
                dotnet_versions.append(version_dir.name)
    
    if dotnet_versions:
        print(f"✓ 检测到.NET Framework版本: {', '.join(dotnet_versions)}")
    else:
        print("⚠ 未检测到.NET Framework，可能需要手动安装")
    
    return True

def create_runtime_hook():
    """
    创建PyInstaller运行时钩子
    """
    print("\n创建运行时钩子...")
    
    # 创建hooks目录
    hooks_dir = Path("hooks")
    hooks_dir.mkdir(exist_ok=True)
    
    # 创建pythonnet钩子
    pythonnet_hook = """
# PyInstaller hook for pythonnet
import os
import sys
from pathlib import Path

# 设置pythonnet运行时
os.environ['PYTHONNET_RUNTIME'] = 'netfx'

# 添加.NET程序集搜索路径
if hasattr(sys, '_MEIPASS'):
    # PyInstaller临时目录
    assembly_path = Path(sys._MEIPASS) / 'assemblies'
    if assembly_path.exists():
        os.environ['PYTHONNET_ASSEMBLY_PATH'] = str(assembly_path)
"""
    
    with open(hooks_dir / "hook-pythonnet.py", "w", encoding="utf-8") as f:
        f.write(pythonnet_hook)
    
    # 创建运行时钩子
    runtime_hook = """
# PyInstaller运行时钩子
import os
import sys

# 设置环境变量
os.environ['PYTHONNET_RUNTIME'] = 'netfx'

# 如果是打包后的环境
if hasattr(sys, '_MEIPASS'):
    # 添加临时目录到PATH
    temp_path = sys._MEIPASS
    if temp_path not in os.environ.get('PATH', ''):
        os.environ['PATH'] = temp_path + os.pathsep + os.environ.get('PATH', '')
"""
    
    with open("runtime_hook.py", "w", encoding="utf-8") as f:
        f.write(runtime_hook)
    
    print("✓ 运行时钩子创建完成")

def create_env_template():
    """
    创建环境变量配置模板
    """
    print("\n创建环境配置模板...")
    
    env_template = """
# PLC采集平台环境配置文件
# 复制此文件为.env并根据实际情况修改配置

# 应用配置
DEBUG=False
HOST=0.0.0.0
PORT=8000

# JWT配置
JWT_SECRET_KEY=your-secret-key-change-in-production

# 数据库配置
SQLITE_DATABASE_URL=sqlite:///./data/plc_admin.db

# InfluxDB配置
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-influxdb-token
INFLUXDB_ORG=plc_org
INFLUXDB_BUCKET=plc_data

# PLC采集配置
PLC_COLLECT_INTERVAL=5
PLC_CONNECT_TIMEOUT=5000
PLC_RECEIVE_TIMEOUT=10000

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/plc_admin.log

# 超级管理员配置
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=admin123
SUPER_ADMIN_EMAIL=admin@plc.com

# PythonNET配置
PYTHONNET_RUNTIME=netfx
"""
    
    with open(".env.production", "w", encoding="utf-8") as f:
        f.write(env_template)
    
    print("✓ 环境配置模板创建完成: .env.production")

def update_spec_file():
    """
    更新spec文件以包含运行时钩子
    """
    print("\n更新PyInstaller配置...")
    
    spec_content = Path("build.spec").read_text(encoding="utf-8")
    
    # 添加运行时钩子
    if "runtime_hooks=['runtime_hook.py']" not in spec_content:
        spec_content = spec_content.replace(
            "runtime_hooks=[],",
            "runtime_hooks=['runtime_hook.py'],"
        )
    
    # 添加hooks路径
    if "hookspath=['hooks']" not in spec_content:
        spec_content = spec_content.replace(
            "hookspath=[],",
            "hookspath=['hooks'],"
        )
    
    Path("build.spec").write_text(spec_content, encoding="utf-8")
    print("✓ PyInstaller配置更新完成")

def create_installer_script():
    """
    创建安装脚本
    """
    print("\n创建安装脚本...")
    
    installer_script = """
@echo off
chcp 65001 >nul
echo PLC采集平台安装脚本
echo ========================
echo.

REM 创建必要目录
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "config" mkdir config

REM 复制配置文件
if not exist ".env" (
    if exist ".env.production" (
        copy ".env.production" ".env"
        echo ✓ 配置文件已创建，请编辑.env文件
    ) else (
        echo ⚠ 请手动创建.env配置文件
    )
)

REM 检查端口占用
netstat -an | find ":8000" >nul
if %errorlevel% == 0 (
    echo ⚠ 警告: 端口8000已被占用
)

echo.
echo 安装完成！
echo 运行 start_plc_admin.bat 启动服务
echo 访问 http://localhost:8000 查看API文档
echo.
pause
"""
    
    with open("install.bat", "w", encoding="utf-8") as f:
        f.write(installer_script)
    
    print("✓ 安装脚本创建完成: install.bat")

def main():
    """
    主函数
    """
    print("="*50)
    print("PLC采集平台依赖配置工具")
    print("="*50)
    
    if not check_system_requirements():
        sys.exit(1)
    
    try:
        install_python_packages()
        setup_pythonnet()
        create_runtime_hook()
        create_env_template()
        update_spec_file()
        create_installer_script()
        
        print("\n" + "="*50)
        print("✓ 依赖配置完成！")
        print("="*50)
        print("\n下一步:")
        print("1. 运行 build.bat 进行打包")
        print("2. 或运行 python pyinstaller_build.py")
        
    except Exception as e:
        print(f"\n✗ 配置失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()