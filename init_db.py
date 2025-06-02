#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库初始化脚本
用于创建数据库表和初始化数据
"""

import os
import sys
from loguru import logger

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import config
from database import db_manager
from models import Base

def init_database():
    """初始化数据库"""
    try:
        logger.info("开始初始化数据库...")
        
        # 初始化数据库管理器
        db_manager.init_sqlite()
        db_manager.init_influxdb()
        
        logger.info("数据库初始化完成")
        
        # 显示超级管理员信息
        logger.info(f"超级管理员账户: {config.SUPER_ADMIN_USERNAME}")
        logger.info(f"超级管理员密码: {config.SUPER_ADMIN_PASSWORD}")
        logger.info("请及时修改超级管理员密码！")
        
        return True
        
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        return False

def reset_database():
    """重置数据库（危险操作）"""
    try:
        logger.warning("开始重置数据库...")
        
        # 删除SQLite数据库文件
        if os.path.exists(config.SQLITE_DATABASE):
            os.remove(config.SQLITE_DATABASE)
            logger.info(f"已删除数据库文件: {config.SQLITE_DATABASE}")
        
        # 重新初始化
        return init_database()
        
    except Exception as e:
        logger.error(f"数据库重置失败: {e}")
        return False

def check_database():
    """检查数据库状态"""
    try:
        logger.info("检查数据库状态...")
        
        # 检查SQLite数据库
        if os.path.exists(config.SQLITE_DATABASE):
            logger.info(f"SQLite数据库存在: {config.SQLITE_DATABASE}")
            
            # 检查表是否存在
            with db_manager.get_db() as db:
                from models import User, Group, Device, CollectLog
                
                # 检查各个表
                tables = {
                    'users': User,
                    'groups': Group,
                    'devices': Device,
                    'collect_logs': CollectLog
                }
                
                for table_name, model in tables.items():
                    try:
                        count = db.query(model).count()
                        logger.info(f"表 {table_name}: {count} 条记录")
                    except Exception as e:
                        logger.error(f"表 {table_name} 检查失败: {e}")
        else:
            logger.warning(f"SQLite数据库不存在: {config.SQLITE_DATABASE}")
        
        # 检查InfluxDB连接
        try:
            db_manager.init_influxdb()
            logger.info("InfluxDB连接正常")
        except Exception as e:
            logger.error(f"InfluxDB连接失败: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"数据库检查失败: {e}")
        return False

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='数据库管理工具')
    parser.add_argument('action', choices=['init', 'reset', 'check'], 
                       help='操作类型: init(初始化), reset(重置), check(检查)')
    parser.add_argument('--force', action='store_true', 
                       help='强制执行（用于reset操作）')
    
    args = parser.parse_args()
    
    # 配置日志
    logger.remove()
    logger.add(sys.stdout, level="INFO", 
              format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}")
    
    if args.action == 'init':
        success = init_database()
    elif args.action == 'reset':
        if not args.force:
            confirm = input("警告：此操作将删除所有数据！确认继续？(yes/no): ")
            if confirm.lower() != 'yes':
                logger.info("操作已取消")
                return
        success = reset_database()
    elif args.action == 'check':
        success = check_database()
    else:
        logger.error("未知操作")
        return
    
    if success:
        logger.info("操作完成")
    else:
        logger.error("操作失败")
        sys.exit(1)

if __name__ == "__main__":
    main()