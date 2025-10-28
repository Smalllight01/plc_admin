# PLC采集平台 Docker 部署指南

本文档介绍如何使用Docker快速部署PLC采集平台。

## 📋 前置要求

### 系统要求
- Windows 10/11 或 Windows Server 2019+
- 至少 4GB RAM
- 至少 10GB 可用磁盘空间

### 软件要求
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- 已配置的InfluxDB服务器（外部）
- 镜像加速器（建议配置国内镜像源以提高构建速度）

### 配置Docker镜像加速器（推荐）

为了解决镜像拉取慢或失败的问题，建议配置国内镜像源：

1. **Windows用户**：
   - 打开Docker Desktop
   - 进入 Settings → Docker Engine
   - 将以下配置添加到JSON配置中：
   ```json
   {
     "registry-mirrors": [
       "https://docker.mirrors.ustc.edu.cn",
       "https://hub-mirror.c.163.com",
       "https://mirror.baidubce.com",
       "https://dockerproxy.com",
       "https://mirror.ccs.tencentyun.com"
     ]
   }
   ```
   - 点击 "Apply & Restart"

2. **或者复制项目中的配置文件**：
   ```bash
   # 复制配置文件到Docker配置目录
   copy docker-daemon.json %USERPROFILE%\.docker\daemon.json
   ```
   然后重启Docker Desktop

## 🚀 快速部署

### 方法一：使用部署脚本（推荐）

1. **运行部署脚本**
   ```cmd
   docker-deploy.bat
   ```

2. **等待部署完成**
   - 脚本会自动检查环境
   - 创建必要的目录和配置文件
   - 构建并启动所有服务

### 方法二：手动部署

1. **准备环境配置**
   ```cmd
   copy .env.example .env
   ```
   
2. **编辑配置文件**
   ```cmd
   notepad .env
   ```
   
   重要配置项：
   ```env
   # InfluxDB配置（连接到外部InfluxDB）
   INFLUXDB_URL=http://your-influxdb-server:8086
   INFLUXDB_TOKEN=your-influxdb-token
   INFLUXDB_ORG=plc_org
   INFLUXDB_BUCKET=plc_data
   
   # JWT密钥（生产环境请修改）
   JWT_SECRET_KEY=your-secret-key
   
   # 管理员账户
   SUPER_ADMIN_USERNAME=admin
   SUPER_ADMIN_PASSWORD=your-secure-password
   ```

3. **创建必要目录**
   ```cmd
   mkdir data logs
   ```

4. **构建和启动服务**
   ```cmd
   docker compose up --build -d
   ```

## 🔧 服务配置

### 服务端口
- **前端**: http://localhost:3000
- **后端API**: http://localhost:8000
- **健康检查**: http://localhost:8000/health

### 数据持久化
- **SQLite数据库**: `./data/plc_admin.db`
- **应用日志**: `./logs/`
- **配置文件**: `./.env`

## 📊 服务管理

### 查看服务状态
```cmd
docker compose ps
```

### 查看服务日志
```cmd
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
```

### 重启服务
```cmd
# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart backend
```

### 停止服务
```cmd
docker compose down
```

### 完全清理（包括数据）
```cmd
docker compose down -v
```

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   - 确保端口3000和8000未被占用
   - 可在docker-compose.yml中修改端口映射

2. **InfluxDB连接失败**
   - 检查.env文件中的InfluxDB配置
   - 确保InfluxDB服务器可访问
   - 验证Token和组织名称

3. **权限问题**
   - 确保Docker Desktop有足够权限
   - 检查文件夹权限

4. **内存不足**
   - 增加Docker Desktop的内存限制
   - 关闭不必要的应用程序

### 调试命令

```cmd
# 进入后端容器
docker compose exec backend bash

# 进入前端容器
docker compose exec frontend sh

# 查看容器资源使用
docker stats

# 查看网络连接
docker network ls
docker network inspect plc-admin-network
```

## 🔒 安全建议

### 生产环境配置

1. **修改默认密码**
   ```env
   SUPER_ADMIN_PASSWORD=your-strong-password
   JWT_SECRET_KEY=your-random-secret-key
   ```

2. **网络安全**
   - 使用反向代理（Nginx）
   - 配置SSL证书
   - 限制访问IP

3. **数据备份**
   ```cmd
   # 备份SQLite数据库
   copy data\plc_admin.db backup\plc_admin_backup.db
   
   # 备份配置文件
   copy .env backup\.env.backup
   ```

## 📈 性能优化

### 资源配置

在docker-compose.yml中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 监控配置

建议添加监控服务：
- Prometheus + Grafana
- 日志聚合工具
- 健康检查告警

## 📞 技术支持

如遇到问题，请提供以下信息：
1. 操作系统版本
2. Docker版本
3. 错误日志
4. 配置文件（隐藏敏感信息）

---

**注意**: 本部署方案不包含InfluxDB服务，需要单独部署InfluxDB或使用云服务。