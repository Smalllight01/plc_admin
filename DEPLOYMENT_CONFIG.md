# 部署配置说明

## API URL 配置指南

### 1. 本地开发环境

在 `frontend/.env.local` 文件中配置：

```bash
# 本地开发使用localhost
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Docker 部署环境

#### 方案一：Nginx反向代理（推荐 - 最安全）

使用Nginx作为反向代理，统一前后端访问，避免直接暴露后端端口：

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
    environment:
      - CORS_ORIGINS=http://your-domain.com,https://your-domain.com
      
  frontend:
    expose:
      - "3000"  # 只在内部网络暴露
    environment:
      - NEXT_PUBLIC_API_URL=http://your-domain.com
```

**安全优势**：
- 后端端口不直接暴露到外网
- 统一入口，便于访问控制
- 支持HTTPS和安全头设置
- 详细配置请参考 `SECURITY_DEPLOYMENT.md`

#### 方案二：直接端口映射（不推荐 - 安全风险）

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=http://your-domain.com:8000
    
backend:
  environment:
    - CORS_ORIGINS=http://your-domain.com:3000,https://your-domain.com:3000
  ports:
    - "8000:8000"  # 直接暴露后端端口
```

**安全风险**：直接暴露后端端口到外网，存在安全隐患。

#### 方案二：使用 Docker 内部网络（仅限容器内访问）

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=http://backend:8000
```

这种方式前端通过 Docker 内部网络访问后端，但浏览器无法直接访问，需要配合反向代理使用。

#### 方案二：使用服务器公网 IP

如果需要前端直接访问外网后端，修改 `docker-compose.yml`：

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000
```

或者使用域名：

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=https://your-domain.com
```

### 3. 生产环境配置

#### 选项 1：反向代理（推荐）

使用 Nginx 等反向代理服务器，将前后端统一到同一域名下：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        proxy_pass http://localhost:3000;
    }
    
    # 后端API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
    }
}
```

配置环境变量：
```bash
NEXT_PUBLIC_API_URL=https://your-domain.com
```

#### 选项 2：CORS 配置

如果前后端分离部署，确保后端正确配置 CORS：

```python
# 后端 CORS 配置
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. 环境变量优先级

1. `docker-compose.yml` 中的 environment 配置（Docker 部署时）
2. `.env.production` 文件（生产构建时）
3. `.env.local` 文件（本地开发时）
4. `next.config.js` 中的默认值

### 5. 常见问题解决

#### 问题：外网无法访问 API

**原因**：使用了内网 IP 地址（如 192.168.1.16）

**解决方案**：
- Docker 部署：使用服务名 `http://backend:8000`
- 生产环境：使用公网 IP 或域名

#### 问题：CORS 错误

**解决方案**：
1. 检查后端 CORS 配置
2. 确保前端请求的域名在后端允许列表中
3. 使用反向代理统一域名

#### 问题：Docker 容器间无法通信

**解决方案**：
1. 确保容器在同一网络中
2. 使用服务名而不是 localhost
3. 检查端口映射配置

### 6. 部署命令

```bash
# 重新构建并启动服务
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 查看服务状态
docker-compose ps
docker-compose logs frontend
docker-compose logs backend
```