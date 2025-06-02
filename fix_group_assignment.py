#!/usr/bin/env python3
"""
修复用户和设备的分组分配问题
"""

import sqlite3
import os

def fix_group_assignment():
    """修复用户和设备的分组分配"""
    db_path = 'plc_admin.db'
    
    if not os.path.exists(db_path):
        print(f"数据库文件 {db_path} 不存在")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("开始修复分组分配...")
        
        # 方案1：将所有用户的group_id更新为2（与设备保持一致）
        print("将用户分组更新为与设备相同的分组ID 2...")
        cursor.execute('UPDATE users SET group_id = 2 WHERE group_id = 1')
        affected_users = cursor.rowcount
        print(f"已更新 {affected_users} 个用户的分组")
        
        conn.commit()
        
        # 验证修复结果
        print("\n验证修复结果...")
        cursor.execute('SELECT id, username, role, group_id FROM users')
        users = cursor.fetchall()
        print("=== 用户信息 ===")
        for user in users:
            print(f'用户ID: {user[0]}, 用户名: {user[1]}, 角色: {user[2]}, 分组ID: {user[3]}')
        
        cursor.execute('SELECT id, name, group_id FROM devices')
        devices = cursor.fetchall()
        print("\n=== 设备信息 ===")
        for device in devices:
            print(f'设备ID: {device[0]}, 设备名: {device[1]}, 分组ID: {device[2]}')
        
        # 检查是否还有分组不匹配的问题
        cursor.execute('SELECT DISTINCT group_id FROM users WHERE group_id IS NOT NULL')
        user_groups = [row[0] for row in cursor.fetchall()]
        
        cursor.execute('SELECT DISTINCT group_id FROM devices WHERE group_id IS NOT NULL')
        device_groups = [row[0] for row in cursor.fetchall()]
        
        common_groups = set(user_groups) & set(device_groups)
        if common_groups:
            print(f"\n✅ 修复成功！用户和设备现在有共同的分组: {common_groups}")
        else:
            print(f"\n❌ 仍然存在问题：用户分组 {user_groups}, 设备分组 {device_groups}")
        
        conn.close()
        
    except Exception as e:
        print(f"修复分组分配失败: {e}")

if __name__ == "__main__":
    fix_group_assignment()