#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
添加response_time列到collect_logs表
"""

import sqlite3
import os
from loguru import logger

def add_response_time_column():
    """添加response_time列到collect_logs表"""
    db_path = "plc_admin.db"
    
    if not os.path.exists(db_path):
        logger.error(f"数据库文件不存在: {db_path}")
        return False
    
    try:
        # 连接数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查列是否已存在
        cursor.execute("PRAGMA table_info(collect_logs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'response_time' in columns:
            logger.info("response_time列已存在")
            return True
        
        # 添加response_time列
        cursor.execute("ALTER TABLE collect_logs ADD COLUMN response_time REAL")
        conn.commit()
        
        logger.info("成功添加response_time列到collect_logs表")
        return True
        
    except Exception as e:
        logger.error(f"添加列失败: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = add_response_time_column()
    if success:
        print("数据库列添加成功")
    else:
        print("数据库列添加失败")