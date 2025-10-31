#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
字节顺序配置迁移脚本
为现有设备添加byte_order字段
"""

import os
import sys
from loguru import logger

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import config
from database import db_manager

def migrate_byte_order():
    """迁移字节顺序配置"""
    try:
        logger.info("开始迁移字节顺序配置...")

        with db_manager.get_db() as db:
            # 检查devices表是否存在byte_order列
            from sqlalchemy import text

            # 检查SQLite数据库中是否已有byte_order列
            result = db.execute(text("PRAGMA table_info(devices)"))
            columns = [row[1] for row in result]

            if 'byte_order' in columns:
                logger.info("byte_order列已存在，无需迁移")
                return True

            # 添加byte_order列
            logger.info("添加byte_order列到devices表...")
            db.execute(text("ALTER TABLE devices ADD COLUMN byte_order VARCHAR(10) DEFAULT 'CDAB'"))
            db.commit()

            logger.info("字节顺序配置迁移完成")
            return True

    except Exception as e:
        logger.error(f"字节顺序配置迁移失败: {e}")
        return False

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='字节顺序配置迁移工具')
    parser.add_argument('--force', action='store_true',
                       help='强制执行迁移')

    args = parser.parse_args()

    # 配置日志
    logger.remove()
    logger.add(sys.stdout, level="INFO",
              format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}")

    if not args.force:
        confirm = input("确认执行字节顺序配置迁移？(yes/no): ")
        if confirm.lower() != 'yes':
            logger.info("操作已取消")
            return

    success = migrate_byte_order()

    if success:
        logger.info("字节顺序配置迁移完成")
    else:
        logger.error("字节顺序配置迁移失败")
        sys.exit(1)

if __name__ == "__main__":
    main()