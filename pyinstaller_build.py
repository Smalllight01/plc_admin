# -*- coding: utf-8 -*-
"""
PLC采集平台后端PyInstaller打包脚本
自动化构建exe文件的完整流程
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def check_dependencies():
    """
    检查打包所需的依赖是否已安装
    """
    print("检查打包依赖...")
    
    try:
        import PyInstaller
        print(f"✓ PyInstaller 已安装: {PyInstaller.__version__}")
    except ImportError:
        print("✗ PyInstaller 未安装，正在安装...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
        print("✓ PyInstaller 安装完成")
    
    # 检查其他必要依赖
    required_packages = ['fastapi', 'uvicorn', 'sqlalchemy', 'influxdb-client']
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package} 已安装")
        except ImportError:
            print(f"✗ {package} 未安装，请运行: pip install -r requirements.txt")
            return False
    
    return True

def clean_build_dirs():
    """
    清理之前的构建目录
    """
    print("清理构建目录...")
    
    dirs_to_clean = ['build', 'dist', '__pycache__']
    for dir_name in dirs_to_clean:
        if os.path.exists(dir_name):
            try:
                shutil.rmtree(dir_name)
                print(f"✓ 已清理 {dir_name} 目录")
            except Exception as e:
                print(f"⚠ 清理 {dir_name} 目录时出现警告: {e}")
    
    # 清理.pyc文件
    try:
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith('.pyc'):
                    try:
                        os.remove(os.path.join(root, file))
                    except Exception:
                        pass  # 忽略无法删除的.pyc文件
    except Exception as e:
        print(f"⚠ 清理.pyc文件时出现警告: {e}")
    
    return True

def create_data_dirs():
    """
    创建必要的数据目录
    """
    print("创建数据目录...")
    
    dirs_to_create = ['data', 'logs', 'config']
    for dir_name in dirs_to_create:
        try:
            os.makedirs(dir_name, exist_ok=True)
            print(f"✓ 创建目录: {dir_name}")
        except Exception as e:
            print(f"⚠ 创建目录 {dir_name} 时出现警告: {e}")
    
    return True

def copy_additional_files():
    """
    复制额外需要的文件到dist目录
    """
    print("复制额外文件...")
    
    files_to_copy = [
        'requirements.txt',
        '.env.example',
        'README.md'
    ]
    
    dist_dir = Path('dist/plc_admin')
    if not dist_dir.exists():
        dist_dir = Path('dist')
    
    for file_name in files_to_copy:
        if os.path.exists(file_name):
            try:
                shutil.copy2(file_name, dist_dir)
                print(f"✓ 复制文件: {file_name}")
            except Exception as e:
                print(f"⚠ 复制文件 {file_name} 时出现警告: {e}")
    
    return True

def build_executable():
    """
    执行PyInstaller构建
    """
    print("开始构建可执行文件...")
    
    # PyInstaller命令参数
    cmd = [
        'pyinstaller',
        '--clean',
        '--noconfirm',
        'build.spec'
    ]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✓ 构建成功!")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ 构建失败: {e}")
        print(f"错误输出: {e.stderr}")
        return False

def create_startup_script():
    """
    创建启动脚本
    """
    print("创建启动脚本...")
    
    startup_script = """
@echo off
chcp 65001 >nul
echo PLC采集平台后端服务启动中...
echo.

REM 检查端口是否被占用
netstat -an | find ":8000" >nul
if %errorlevel% == 0 (
    echo 警告: 端口8000已被占用，请检查是否有其他服务在运行
    echo.
)

REM 启动服务
echo 启动PLC采集平台后端服务...
plc_admin.exe

if %errorlevel% neq 0 (
    echo.
    echo 服务启动失败，请检查配置文件和日志
    pause
)
"""
    
    try:
        with open('dist/start_plc_admin.bat', 'w', encoding='utf-8') as f:
            f.write(startup_script)
        print("✓ 启动脚本创建完成: dist/start_plc_admin.bat")
    except Exception as e:
        print(f"⚠ 创建启动脚本时出现警告: {e}")
    
    return True

def main():
    """
    主函数：执行完整的打包流程
    """
    print("="*50)
    print("PLC采集平台后端PyInstaller打包工具")
    print("="*50)
    
    # 检查当前目录
    if not os.path.exists('main.py'):
        print("✗ 错误: 请在项目根目录运行此脚本")
        sys.exit(1)
    
    # 执行打包流程
    steps = [
        ("检查依赖", check_dependencies),
        ("清理构建目录", clean_build_dirs),
        ("创建数据目录", create_data_dirs),
        ("构建可执行文件", build_executable),
        ("复制额外文件", copy_additional_files),
        ("创建启动脚本", create_startup_script)
    ]
    
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"✗ {step_name}失败，停止构建")
            sys.exit(1)
    
    print("\n" + "="*50)
    print("✓ 打包完成!")
    print("可执行文件位置: dist/plc_admin.exe")
    print("启动脚本位置: dist/start_plc_admin.bat")
    print("="*50)
    
    # 显示文件大小信息
    exe_path = Path('dist/plc_admin.exe')
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"可执行文件大小: {size_mb:.1f} MB")
    
    print("\n使用说明:")
    print("1. 将dist目录复制到目标机器")
    print("2. 配置.env文件（参考.env.example）")
    print("3. 运行start_plc_admin.bat启动服务")
    print("4. 访问 http://localhost:8000 查看API文档")

if __name__ == '__main__':
    main()