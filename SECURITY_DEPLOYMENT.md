# 安全部署指南

## 概述

本指南提供了一个安全的Docker部署方案，使用Nginx反向代理来统一前后端访问，避免直接暴露后端端口到外网。

## 安全优势

### 1. 端口隔离
- **后端端口不直接暴露**：8000端口只在Docker内部网络中可访问
- **前端端口不直接暴露**：3000端口只在Docker内部网络中可访问
- **统一入口**：只有80端口（和可选的443 HTTPS端口）对外开放

### 2. 访问控制
- **反向代理过滤**：所有请求都经过Nginx处理和验证
- **路径控制**：可以精确控制哪些API端点可以访问
- **请求限制**：可以配置访问频率限制，防止DDoS攻击

### 3. 安全头设置
- **X-Frame-Options**：防止点击劫持攻击
- **X-Content-Type-Options**：防止MIME类型嗅探攻击
- **X-XSS-Protection**：启用XSS保护
- **Strict-Transport-Security**：强制HTTPS访问（HTTPS模式下）

## 部署架构

```
外网用户
    ↓
   Nginx (80/443端口)
    ↓
┌─────────────────┐
│  Docker网络     │
│  ┌─────────────┐│
│  │  Frontend   ││  ← 3000端口（内部）
│  │  (Next.js)  ││
│  └─────────────┘│
│  ┌─────────────┐│
│  │  Backend    ││  ← 8000端口（内部）
│  │  (FastAPI)  ││
│  └─────────────┘│
└─────────────────┘
```

## 配置文件说明

### 1. Nginx配置 (`nginx.conf`)

```nginx
server {
    listen 80;
    server_name zyg.yunziheng.xyz;
    
    # 前端代理
    location / {
        proxy_pass http://frontend:3000;
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://backend:8000/api/;
    }
}
```

### 2. Docker Compose配置

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"  # 只暴露Nginx端口
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      
  backend:
    expose:
      - "8000"  # 只在内部网络暴露
    # 不使用 ports 映射
    
  frontend:
    expose:
      - "3000"  # 只在内部网络暴露
    # 不使用 ports 映射
```

## 部署步骤

### 1. 停止现有服务

```bash
docker-compose down
```

### 2. 清理旧容器和镜像（可选）

```bash
docker system prune -f
docker-compose build --no-cache
```

### 3. 启动新的安全配置

```bash
docker-compose up -d
```

### 4. 验证部署

```bash
# 检查服务状态
docker-compose ps

# 检查Nginx日志
docker-compose logs nginx

# 检查端口开放情况
netstat -tlnp | grep :80
netstat -tlnp | grep :8000  # 应该没有输出
netstat -tlnp | grep :3000  # 应该没有输出
```

## 安全检查清单

### ✅ 网络安全
- [ ] 后端8000端口不直接对外暴露
- [ ] 前端3000端口不直接对外暴露
- [ ] 只有Nginx的80端口对外开放
- [ ] Docker内部网络正常通信

### ✅ 访问控制
- [ ] 所有API请求都通过Nginx代理
- [ ] 敏感路径被正确隐藏
- [ ] CORS配置正确
- [ ] 请求大小限制已设置

### ✅ 安全头
- [ ] X-Frame-Options已设置
- [ ] X-Content-Type-Options已设置
- [ ] X-XSS-Protection已设置
- [ ] 缓存策略已配置

## HTTPS配置（推荐）

### 1. 获取SSL证书

使用Let's Encrypt免费证书：

```bash
# 安装certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --standalone -d zyg.yunziheng.xyz
```

### 2. 配置HTTPS

在`nginx.conf`中取消注释HTTPS配置部分，并更新证书路径。

### 3. 更新Docker Compose

```yaml
nginx:
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

## 监控和日志

### 1. 访问日志

```bash
# 实时查看访问日志
docker-compose logs -f nginx

# 查看错误日志
docker-compose logs nginx | grep error
```

### 2. 性能监控

```bash
# 检查容器资源使用
docker stats

# 检查网络连接
docker-compose exec nginx netstat -an
```

## 故障排除

### 1. 常见问题

**问题**：502 Bad Gateway
**解决**：检查后端服务是否正常运行

```bash
docker-compose logs backend
docker-compose exec nginx wget -O- http://backend:8000/health
```

**问题**：CORS错误
**解决**：检查后端CORS配置和Nginx代理头设置

### 2. 调试命令

```bash
# 进入Nginx容器调试
docker-compose exec nginx sh

# 测试Nginx配置
docker-compose exec nginx nginx -t

# 重新加载Nginx配置
docker-compose exec nginx nginx -s reload
```

## 安全最佳实践

1. **定期更新**：保持Docker镜像和依赖包最新
2. **最小权限**：容器以非root用户运行
3. **网络隔离**：使用自定义Docker网络
4. **日志监控**：定期检查访问和错误日志
5. **备份策略**：定期备份数据和配置文件
6. **防火墙**：在服务器级别配置防火墙规则

## 总结

这种反向代理部署方案提供了以下安全优势：

- **网络隔离**：后端服务不直接暴露到外网
- **统一入口**：所有请求都经过Nginx处理
- **访问控制**：可以精确控制API访问权限
- **安全头**：自动添加各种安全响应头
- **HTTPS支持**：易于配置SSL/TLS加密
- **监控友好**：集中的日志和监控点

相比直接暴露后端端口，这种方案大大提高了系统的安全性。