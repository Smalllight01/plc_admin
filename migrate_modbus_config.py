#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Modbus地址配置迁移脚本
将现有的地址配置格式迁移到新的增强格式，确保向下兼容
"""

import sys
import json
import os
from datetime import datetime
from loguru import logger

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from models import Device, Base
from config import config
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class ModbusConfigMigrator:
    """Modbus配置迁移器"""

    def __init__(self):
        self.engine = create_engine(
            config.SQLITE_DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.migration_log = []

    def log(self, level: str, device_id: int, device_name: str, message: str):
        """记录迁移日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'device_id': device_id,
            'device_name': device_name,
            'message': message
        }
        self.migration_log.append(log_entry)

        if level == 'INFO':
            logger.info(f"[设备:{device_name}] {message}")
        elif level == 'WARNING':
            logger.warning(f"[设备:{device_name}] {message}")
        elif level == 'ERROR':
            logger.error(f"[设备:{device_name}] {message}")

    def backup_database(self):
        """备份数据库"""
        try:
            # 获取数据库文件路径
            db_path = config.SQLITE_DATABASE_URL.replace('sqlite:///', '').replace('sqlite:///./', '')
            if not db_path.startswith('/') and not db_path.startswith('\\'):
                db_path = os.path.join(os.path.dirname(__file__), db_path)

            backup_path = f"plc_admin_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            import shutil
            shutil.copy2(db_path, backup_path)
            self.log('INFO', 0, '系统', f"数据库已备份到: {backup_path}")
            return backup_path
        except Exception as e:
            self.log('ERROR', 0, '系统', f"数据库备份失败: {e}")
            return None

    def is_modbus_device(self, device: Device) -> bool:
        """判断是否为Modbus设备"""
        return device.plc_type.lower().startswith('modbus')

    def parse_address_config(self, addresses_str: str, device: Device) -> list:
        """解析地址配置"""
        try:
            if not addresses_str or addresses_str.strip() == '':
                return []

            addresses_data = json.loads(addresses_str)

            # 如果已经是新格式（对象列表），直接返回
            if addresses_data and isinstance(addresses_data[0], dict):
                return addresses_data

            # 如果是旧格式（字符串列表），转换为新格式
            if isinstance(addresses_data, list):
                normalized_addresses = []
                for i, addr_str in enumerate(addresses_data):
                    if addr_str:  # 确保地址不为空
                        # 解析地址以确定功能码
                        function_code = 3
                        register_type = 'holding'

                        try:
                            addr_num = int(addr_str)
                            if 40001 <= addr_num <= 49999:
                                function_code = 3
                                register_type = 'holding'
                            elif 30001 <= addr_num <= 39999:
                                function_code = 4
                                register_type = 'input'
                            elif 10001 <= addr_num <= 19999:
                                function_code = 2
                                register_type = 'discrete'
                            elif 1 <= addr_num <= 9999:
                                function_code = 1
                                register_type = 'coil'
                        except ValueError:
                            # 如果不是数字，保持默认值
                            pass

                        normalized_addr = {
                            'id': f'migrated_{device.id}_{i}',
                            'name': f'迁移地址{i+1}',
                            'address': addr_str,
                            'type': 'int16',
                            'unit': '',
                            'description': f'从旧格式迁移的地址',
                            # Modbus特定字段
                            'stationId': 1,
                            'functionCode': function_code,
                            'registerType': register_type,
                            'byteOrder': 'CDAB',
                            'wordSwap': False,
                            'scanRate': 1000,
                            'scaling': {
                                'enabled': False,
                                'inputMin': 0,
                                'inputMax': 100,
                                'outputMin': 0,
                                'outputMax': 10
                            }
                        }
                        normalized_addresses.append(normalized_addr)

                return normalized_addresses

            return []

        except (json.JSONDecodeError, TypeError, IndexError) as e:
            self.log('ERROR', device.id, device.name, f"解析地址配置失败: {e}")
            return []

    def migrate_device_config(self, device: Device) -> bool:
        """迁移单个设备的配置"""
        try:
            # 检查是否需要迁移
            if device.is_modbus_device():
                current_configs = device.get_address_configs()

                # 检查是否已经是新格式
                if current_configs and 'stationId' in current_configs[0]:
                    self.log('INFO', device.id, device.name, "已经是新格式，跳过迁移")
                    return True

                # 执行迁移
                new_configs = self.parse_address_config(device.addresses, device)

                if new_configs:
                    # 更新设备配置
                    device.addresses = json.dumps(new_configs)
                    return True
                else:
                    self.log('WARNING', device.id, device.name, "没有需要迁移的地址配置")
                    return True
            else:
                self.log('INFO', device.id, device.name, "非Modbus设备，跳过迁移")
                return True

        except Exception as e:
            self.log('ERROR', device.id, device.name, f"迁移失败: {e}")
            return False

    def run_migration(self) -> dict:
        """执行完整迁移"""
        results = {
            'total_devices': 0,
            'modbus_devices': 0,
            'migrated_devices': 0,
            'failed_devices': 0,
            'skipped_devices': 0,
            'errors': []
        }

        try:
            # 备份数据库
            backup_path = self.backup_database()
            if not backup_path:
                raise Exception("数据库备份失败，迁移终止")

            # 获取所有设备
            with self.SessionLocal() as session:
                devices = session.query(Device).all()
                results['total_devices'] = len(devices)

                self.log('INFO', 0, '系统', f"开始迁移 {len(devices)} 个设备")

                for device in devices:
                    try:
                        if self.is_modbus_device(device):
                            results['modbus_devices'] += 1

                            if self.migrate_device_config(device):
                                results['migrated_devices'] += 1
                                session.commit()
                            else:
                                results['failed_devices'] += 1
                        else:
                            results['skipped_devices'] += 1

                    except Exception as e:
                        results['failed_devices'] += 1
                        error_msg = f"设备 {device.name} 迁移失败: {e}"
                        results['errors'].append(error_msg)
                        self.log('ERROR', device.id, device.name, error_msg)
                        session.rollback()

            # 生成迁移报告
            self.generate_migration_report(results)

            return results

        except Exception as e:
            error_msg = f"迁移过程中发生严重错误: {e}"
            self.log('ERROR', 0, '系统', error_msg)
            results['errors'].append(error_msg)
            return results

    def generate_migration_report(self, results: dict):
        """生成迁移报告"""
        report = f"""
Modbus地址配置迁移报告
====================
迁移时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

统计信息:
- 总设备数: {results['total_devices']}
- Modbus设备数: {results['modbus_devices']}
- 成功迁移设备数: {results['migrated_devices']}
- 迁移失败设备数: {results['failed_devices']}
- 跳过设备数: {results['skipped_devices']}

详细日志:
"""

        for log_entry in self.migration_log:
            report += f"[{log_entry['timestamp']}] {log_entry['level']} [设备:{log_entry['device_name']}] {log_entry['message']}\n"

        if results['errors']:
            report += "\n错误详情:\n"
            for error in results['errors']:
                report += f"- {error}\n"

        # 保存报告
        report_path = f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report)
            logger.info(f"迁移报告已保存到: {report_path}")
        except Exception as e:
            logger.error(f"保存迁移报告失败: {e}")

        # 打印摘要
        print(report)

    def rollback_migration(self, backup_path: str):
        """回滚迁移（从备份恢复）"""
        try:
            # 获取目标数据库路径
            db_path = config.SQLITE_DATABASE_URL.replace('sqlite:///', '').replace('sqlite:///./', '')
            if not db_path.startswith('/') and not db_path.startswith('\\'):
                db_path = os.path.join(os.path.dirname(__file__), db_path)

            import shutil
            shutil.copy2(backup_path, db_path)
            logger.info(f"已从备份恢复数据库: {backup_path}")
            return True
        except Exception as e:
            logger.error(f"回滚失败: {e}")
            return False


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='Modbus地址配置迁移工具')
    parser.add_argument('--action', choices=['migrate', 'rollback'], default='migrate',
                       help='执行操作: migrate（迁移）或 rollback（回滚）')
    parser.add_argument('--backup', help='备份文件路径（用于回滚）')

    args = parser.parse_args()

    migrator = ModbusConfigMigrator()

    if args.action == 'migrate':
        print("开始Modbus地址配置迁移...")
        results = migrator.run_migration()

        if results['failed_devices'] == 0:
            print("✅ 迁移成功完成！")
        else:
            print(f"⚠️ 迁移完成，但有 {results['failed_devices']} 个设备迁移失败")
            print("请查看迁移报告了解详情")

    elif args.action == 'rollback':
        if not args.backup:
            print("❌ 回滚操作需要指定备份文件路径")
            sys.exit(1)

        print(f"开始从备份回滚: {args.backup}")
        if migrator.rollback_migration(args.backup):
            print("✅ 回滚成功完成！")
        else:
            print("❌ 回滚失败")
            sys.exit(1)


if __name__ == '__main__':
    main()