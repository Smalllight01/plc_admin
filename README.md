# PLC采集平台

一个基于Python和Next.js的现代化PLC数据采集平台，支持多种PLC设备的数据采集、存储和管理，提供美观的Web界面。

## 功能特性

### 核心功能
- **多PLC支持**: 支持西门子、欧姆龙等主流PLC设备
- **实时数据采集**: 定时采集PLC数据并存储到InfluxDB
- **分组管理**: 支持设备分组管理，便于组织和权限控制
- **用户管理**: 多级用户权限管理，支持管理员和普通用户
- **RESTful API**: 完整的API接口，便于前端集成
- **现代化界面**: 基于Next.js和Tailwind CSS的响应式Web界面
- **实时监控**: 实时数据展示和图表可视化
- **系统设置**: 灵活的系统配置管理

### 技术架构

#### 后端技术栈
- **后端框架**: Robyn (高性能Python Web框架)
- **时序数据库**: InfluxDB (存储PLC采集数据)
- **关系数据库**: SQLite (存储用户、设备、分组等元数据)
- **PLC通信**: HslCommunication (支持多种PLC协议)
- **认证授权**: JWT Token
- **日志系统**: Loguru

#### 前端技术栈
- **前端框架**: Next.js 14 (React框架)
- **UI组件**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **图表库**: Chart.js / Recharts
- **图标库**: Lucide React
- **类型检查**: TypeScript

## 项目结构

```
plc_admin/
├── main.py                 # 主程序入口
├── config.py              # 配置管理
├── database.py            # 数据库管理
├── models.py              # 数据模型
├── auth.py                # 认证授权
├── plc_collector.py       # PLC数据采集
├── requirements.txt       # 依赖包
├── .env.example          # 环境变量模板
├── README.md             # 项目说明
├── .gitignore            # Git忽略文件
├── api/                  # API路由
│   ├── __init__.py
│   ├── auth_routes.py     # 认证相关API
│   ├── group_routes.py    # 分组管理API
│   ├── device_routes.py   # 设备管理API
│   ├── user_routes.py     # 用户管理API
│   ├── data_routes.py     # 数据查询API
│   ├── dashboard_routes.py # 仪表板API
│   └── settings_routes.py  # 系统设置API
└── frontend/             # 前端应用
    ├── package.json       # Node.js依赖
    ├── next.config.js     # Next.js配置
    ├── tailwind.config.ts # Tailwind配置
    ├── tsconfig.json      # TypeScript配置
    ├── components.json    # shadcn/ui配置
    └── src/              # 源代码
        ├── app/          # Next.js App Router
        │   ├── dashboard/ # 仪表板页面
        │   ├── devices/   # 设备管理页面
        │   ├── groups/    # 分组管理页面
        │   ├── realtime/  # 实时数据页面
        │   ├── settings/  # 系统设置页面
        │   └── users/     # 用户管理页面
        ├── components/   # React组件
        │   ├── layout/   # 布局组件
        │   └── ui/       # UI组件
        ├── lib/          # 工具库
        ├── services/     # API服务
        └── store/        # 状态管理
```

## 快速开始

### 1. 环境准备

确保已安装以下软件：
- Python 3.8+
- Node.js 18+
- InfluxDB 2.0+
- .NET Framework (用于HslCommunication)

### 2. 安装后端依赖

```bash
cd plc_admin
pip install -r requirements.txt
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 配置环境

复制环境变量模板并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息：

```env
# 应用配置
APP_NAME=PLC采集平台
APP_VERSION=1.0.0
HOST=0.0.0.0
PORT=8000
DEBUG=true

# JWT配置
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# SQLite数据库
SQLITE_DATABASE=plc_admin.db

# InfluxDB配置
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-influxdb-token
INFLUXDB_ORG=your-org
INFLUXDB_BUCKET=plc_data

# PLC采集配置
COLLECT_INTERVAL=5
COLLECT_TIMEOUT=3000
MAX_BATCH_SIZE=50

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# 超级管理员
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=admin123
```

### 4. 启动服务

```bash
python main.py
```

服务启动后，可以通过以下地址访问：
- API服务: http://localhost:8000
- 健康检查: http://localhost:8000/health

## API文档

### 认证相关

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "admin123"
}
```

#### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### 修改密码
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
    "old_password": "old123",
    "new_password": "new123"
}
```

### 分组管理

#### 获取分组列表
```http
GET /api/groups
Authorization: Bearer <token>
```

#### 创建分组
```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "1号厂房",
    "description": "生产车间1"
}
```

#### 更新分组
```http
PUT /api/groups/{group_id}
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "1号厂房(更新)",
    "description": "生产车间1(更新)"
}
```

#### 删除分组
```http
DELETE /api/groups/{group_id}
Authorization: Bearer <token>
```

### 设备管理

#### 获取设备列表
```http
GET /api/devices?group_id=1&page=1&page_size=20
Authorization: Bearer <token>
```

#### 创建设备
```http
POST /api/devices
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "PLC-001",
    "plc_type": "欧姆龙",
    "protocol": "TCP",
    "ip_address": "192.168.1.100",
    "port": 9600,
    "group_id": 1,
    "addresses": ["D100", "D101", "D102"]
}
```

#### 获取设备状态
```http
GET /api/devices/{device_id}/status
Authorization: Bearer <token>
```

#### 获取设备采集日志
```http
GET /api/devices/{device_id}/logs?page=1&page_size=20
Authorization: Bearer <token>
```

### 用户管理

#### 获取用户列表
```http
GET /api/users?group_id=1&page=1&page_size=20
Authorization: Bearer <token>
```

#### 创建用户
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
    "username": "user001",
    "password": "password123",
    "group_id": 1,
    "is_admin": false
}
```

#### 重置用户密码
```http
PUT /api/users/{user_id}/reset-password
Authorization: Bearer <token>
Content-Type: application/json

{
    "new_password": "newpassword123"
}
```

### 数据查询

#### 获取实时数据
```http
GET /api/data/realtime?device_id=1
Authorization: Bearer <token>
```

#### 获取历史数据
```http
GET /api/data/history?device_id=1&start_time=2024-01-01T00:00:00&end_time=2024-01-02T00:00:00&address=D100&limit=1000
Authorization: Bearer <token>
```

#### 获取数据统计
```http
GET /api/data/statistics?device_id=1&time_range=24h
Authorization: Bearer <token>
```

#### 获取设备地址列表
```http
GET /api/data/addresses/{device_id}
Authorization: Bearer <token>
```

## 权限说明

### 用户角色

1. **超级管理员**: 拥有所有权限，可以管理所有分组、设备和用户
2. **分组管理员**: 可以管理自己分组内的设备和用户
3. **普通用户**: 只能查看自己分组内的设备和数据

### 权限矩阵

| 功能 | 超级管理员 | 分组管理员 | 普通用户 |
|------|------------|------------|----------|
| 分组管理 | ✅ | ❌ | ❌ |
| 设备管理 | ✅ | ✅(本分组) | ❌ |
| 用户管理 | ✅ | ❌ | ❌ |
| 数据查看 | ✅ | ✅(本分组) | ✅(本分组) |
| 修改密码 | ✅ | ✅ | ✅ |

## 支持的PLC类型

### 欧姆龙 (Omron)
- 协议: TCP
- 支持的地址类型: D, CIO, W, H, A, E
- 示例地址: D100, CIO200, W300

### 西门子 (Siemens)
- 协议: TCP
- 支持的地址类型: DB, M, I, Q, V
- 示例地址: DB1.DBW0, M0.0, VW100

## 数据存储

### SQLite (元数据)
- 用户信息
- 分组信息
- 设备配置
- 采集日志

### InfluxDB (时序数据)
- PLC采集的实时数据
- 支持高效的时间范围查询
- 自动数据压缩和过期清理

## 开发说明

### 添加新的PLC类型

1. 在 `plc_collector.py` 中的 `PLCConnection` 类添加新的PLC类型支持
2. 实现对应的连接和数据读取方法
3. 更新设备创建API中的PLC类型验证

### 扩展API功能

1. 在对应的路由文件中添加新的API端点
2. 实现相应的业务逻辑
3. 添加必要的权限检查
4. 更新API文档

## 故障排除

### 常见问题

1. **PLC连接失败**
   - 检查IP地址和端口是否正确
   - 确认PLC设备网络连接正常
   - 验证PLC协议设置

2. **InfluxDB连接失败**
   - 检查InfluxDB服务是否运行
   - 验证连接配置和Token
   - 确认Bucket是否存在

3. **权限错误**
   - 检查JWT Token是否有效
   - 验证用户权限设置
   - 确认分组关联关系

### 日志查看

日志文件位置: `logs/app.log`

```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
grep ERROR logs/app.log
```

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue: [项目Issues页面]
- 邮箱: [your-email@example.com]