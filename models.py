# -*- coding: utf-8 -*-
"""
数据库模型定义
定义用户、分组、设备等实体模型
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import bcrypt
import json

Base = declarative_base()

class Group(Base):
    """分组模型"""
    __tablename__ = 'groups'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, comment='分组名称')
    description = Column(Text, comment='分组描述')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    # 关联关系
    users = relationship("User", back_populates="group")
    devices = relationship("Device", back_populates="group")
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'device_count': len(self.devices) if self.devices else 0,
            'user_count': len(self.users) if self.users else 0
        }

class User(Base):
    """用户模型"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, comment='用户名')
    email = Column(String(100), unique=True, nullable=True, comment='邮箱')
    password_hash = Column(String(255), nullable=False, comment='密码哈希')
    role = Column(String(20), default='user', nullable=False, comment='用户角色: super_admin/admin/user')
    is_active = Column(Boolean, default=True, comment='是否激活')
    group_id = Column(Integer, ForeignKey('groups.id'), nullable=True, comment='所属分组ID')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    # 关联关系
    group = relationship("Group", back_populates="users")
    
    def set_password(self, password: str):
        """设置密码"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'group_id': self.group_id,
            'group_name': self.group.name if self.group else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @property
    def is_super_admin(self) -> bool:
        """是否为超级管理员"""
        return self.role == 'super_admin'
    
    @property
    def is_admin(self) -> bool:
        """是否为管理员（包括超级管理员）"""
        return self.role in ['admin', 'super_admin']
    
    @property
    def is_user(self) -> bool:
        """是否为普通用户"""
        return self.role == 'user'

class Device(Base):
    """设备模型"""
    __tablename__ = 'devices'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment='设备名称')
    plc_type = Column(String(50), nullable=False, comment='PLC型号')
    protocol = Column(String(20), nullable=False, comment='通信协议')
    ip_address = Column(String(15), nullable=False, comment='IP地址')
    port = Column(Integer, nullable=False, comment='端口号')
    addresses = Column(Text, nullable=False, comment='采集地址列表(JSON格式)')
    description = Column(Text, comment='设备描述')
    is_active = Column(Boolean, default=True, comment='是否启用')
    is_connected = Column(Boolean, default=False, comment='是否已连接')
    status = Column(String(20), default='offline', comment='设备状态(online/offline)')
    last_collect_time = Column(DateTime, comment='最后采集时间')
    group_id = Column(Integer, ForeignKey('groups.id'), nullable=False, comment='所属分组ID')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    # 关联关系
    group = relationship("Group", back_populates="devices")
    
    def get_addresses(self):
        """获取采集地址列表（返回地址字符串列表）"""
        try:
            addresses_data = json.loads(self.addresses) if self.addresses else []
            # 如果是字典列表，提取address字段；如果是字符串列表，直接返回
            if addresses_data and isinstance(addresses_data[0], dict):
                return [addr_info.get('address', '') for addr_info in addresses_data if addr_info.get('address')]
            else:
                return addresses_data
        except (json.JSONDecodeError, IndexError, TypeError):
            return []
    
    def set_addresses(self, addresses_list):
        """设置采集地址列表"""
        self.addresses = json.dumps(addresses_list)
    
    def to_dict(self):
        """转换为字典"""
        # 获取完整的地址配置对象数组
        try:
            addresses_data = json.loads(self.addresses) if self.addresses else []
        except (json.JSONDecodeError, TypeError):
            addresses_data = []
            
        return {
            'id': self.id,
            'name': self.name,
            'plc_type': self.plc_type,
            'protocol': self.protocol,
            'ip_address': self.ip_address,
            'port': self.port,
            'addresses': addresses_data,  # 返回完整的地址配置对象数组
            'description': self.description,
            'is_active': self.is_active,
            'is_connected': self.is_connected,
            'status': self.status or 'offline',  # 设备状态
            'last_collect_time': self.last_collect_time.isoformat() if self.last_collect_time else None,
            'group_id': self.group_id,
            'group_name': self.group.name if self.group else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class CollectLog(Base):
    """采集日志模型"""
    __tablename__ = 'collect_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey('devices.id'), nullable=False, comment='设备ID')
    status = Column(String(20), nullable=False, comment='采集状态')
    message = Column(Text, comment='采集信息')
    collect_time = Column(DateTime, default=datetime.utcnow, comment='采集时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'device_id': self.device_id,
            'status': self.status,
            'message': self.message,
            'collect_time': self.collect_time.isoformat() if self.collect_time else None
        }