#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动脚本
用于快速启动PLC采集平台服务
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("错误: 需要Python 3.8或更高版本")
        print(f"当前版本: {sys.version}")
        return False
    return True

def check_dependencies():
    """检查依赖包"""
    print("检查依赖包...")
    
    required_packages = [
        'robyn',
        'sqlalchemy',
        'influxdb-client',
        'loguru',
        'bcrypt',
        'PyJWT',
        'python-dotenv',
        'pydantic',
        'pythonnet'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package}")
        except ImportError:
            print(f"✗ {package} (缺失)")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n缺失的依赖包: {', '.join(missing_packages)}")
        print("请运行以下命令安装依赖:")
        print("pip install -r requirements.txt")
        return False
    
    print("所有依赖包已安装")
    return True

def check_env_file():
    """检查环境变量文件"""
    env_file = Path('.env')
    env_example = Path('.env.example')
    
    if not env_file.exists():
        if env_example.exists():
            print("未找到.env文件，正在从.env.example创建...")
            try:
                import shutil
                shutil.copy(env_example, env_file)
                print("已创建.env文件，请根据需要修改配置")
                return True
            except Exception as e:
                print(f"创建.env文件失败: {e}")
                return False
        else:
            print("错误: 未找到.env或.env.example文件")
            return False
    
    print("环境配置文件存在")
    return True

def check_database():
    """检查数据库状态"""
    print("检查数据库状态...")
    
    try:
        # 添加项目路径
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from config import config
        from database import db_manager
        
        # 检查SQLite数据库
        if not os.path.exists(config.SQLITE_DATABASE):
            print("数据库未初始化，正在初始化...")
            try:
                db_manager.init_sqlite()
                print("数据库初始化完成")
            except Exception as e:
                print(f"数据库初始化失败: {e}")
                return False
        else:
            print("SQLite数据库存在")
        
        # 检查InfluxDB连接
        try:
            db_manager.init_influxdb()
            print("InfluxDB连接正常")
        except Exception as e:
            print(f"InfluxDB连接失败: {e}")
            print("请检查InfluxDB配置和服务状态")
            return False
        
        return True
        
    except Exception as e:
        print(f"数据库检查失败: {e}")
        return False

def start_service():
    """启动服务"""
    print("\n启动PLC采集平台服务...")
    
    try:
        # 启动主程序
        subprocess.run([sys.executable, 'main.py'], check=True)
    except KeyboardInterrupt:
        print("\n收到停止信号，正在关闭服务...")
    except subprocess.CalledProcessError as e:
        print(f"服务启动失败: {e}")
        return False
    except Exception as e:
        print(f"启动异常: {e}")
        return False
    
    return True

def show_info():
    """显示服务信息"""
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from config import config
        
        print("\n" + "="*50)
        print(f"PLC采集平台 v{config.APP_VERSION}")
        print("="*50)
        print(f"服务地址: http://{config.HOST}:{config.PORT}")
        print(f"健康检查: http://{config.HOST}:{config.PORT}/health")
        print(f"超级管理员: {config.SUPER_ADMIN_USERNAME}")
        print(f"默认密码: {config.SUPER_ADMIN_PASSWORD}")
        print("="*50)
        print("\n按 Ctrl+C 停止服务")
        print()
        
    except Exception as e:
        print(f"获取配置信息失败: {e}")

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='PLC采集平台启动脚本')
    parser.add_argument('--skip-checks', action='store_true', 
                       help='跳过环境检查')
    parser.add_argument('--init-db', action='store_true', 
                       help='强制重新初始化数据库')
    
    args = parser.parse_args()
    
    print("PLC采集平台启动脚本")
    print("=" * 30)
    
    # 检查Python版本
    if not check_python_version():
        sys.exit(1)
    
    if not args.skip_checks:
        # 检查依赖包
        if not check_dependencies():
            sys.exit(1)
        
        # 检查环境文件
        if not check_env_file():
            sys.exit(1)
        
        # 检查数据库
        if not check_database():
            sys.exit(1)
    
    # 强制初始化数据库
    if args.init_db:
        print("强制重新初始化数据库...")
        try:
            subprocess.run([sys.executable, 'init_db.py', 'reset', '--force'], check=True)
        except subprocess.CalledProcessError as e:
            print(f"数据库初始化失败: {e}")
            sys.exit(1)
    
    # 显示服务信息
    show_info()
    
    # 启动服务
    if not start_service():
        sys.exit(1)

if __name__ == "__main__":
    main()