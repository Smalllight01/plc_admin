# PLC管理系统前端打包部署指南

## 概述

本指南介绍如何将PLC管理系统前端打包为Windows可执行文件，实现独立部署。

## 打包方案

使用 `pkg` 工具将Next.js应用打包为独立的Windows可执行文件，无需安装Node.js环境即可运行。

## 系统要求

- Windows 10/11 或 Windows Server 2016+
- Node.js 18+ (仅打包时需要)
- npm 或 yarn
- 至少 2GB 可用磁盘空间

## 打包步骤

### 方法一：使用批处理脚本（推荐）

1. 打开命令提示符，进入前端目录：
   ```cmd
   cd d:\vsproject\plc_admin\frontend
   ```

2. 运行打包脚本：
   ```cmd
   build_frontend.bat
   ```

3. 等待打包完成，可执行文件将生成在 `dist` 目录中。

### 方法二：使用PowerShell脚本

1. 以管理员身份打开PowerShell

2. 设置执行策略（如果需要）：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. 进入前端目录并运行脚本：
   ```powershell
   cd d:\vsproject\plc_admin\frontend
   .\build_frontend.ps1
   ```

### 方法三：手动打包

1. 安装依赖：
   ```cmd
   npm install
   npm install pkg rimraf --save-dev
   ```

2. 构建Next.js应用：
   ```cmd
   npm run build
   ```

3. 打包为可执行文件：
   ```cmd
   npx pkg server.js --targets node18-win-x64 --out-path dist
   ```

## 部署和运行

### 启动应用

1. 使用启动脚本（推荐）：
   ```cmd
   start_frontend.bat
   ```

2. 或直接运行可执行文件：
   ```cmd
   dist\server.exe
   ```

### 访问应用

- 本地访问：http://localhost:3000
- 网络访问：http://your-server-ip:3000

### 环境配置

可以通过环境变量配置应用：

```cmd
set PORT=3000
set HOSTNAME=0.0.0.0
set NEXT_PUBLIC_API_URL=http://your-backend:8000
dist\server.exe
```

## 文件结构

打包完成后的文件结构：

```
frontend/
├── dist/
│   └── server.exe          # 可执行文件（约100-200MB）
├── .next/                   # Next.js构建输出
├── public/                  # 静态资源
├── server.js               # 服务器入口文件
├── build_frontend.bat       # 批处理打包脚本
├── build_frontend.ps1       # PowerShell打包脚本
├── start_frontend.bat       # 启动脚本
├── .env.standalone          # 独立部署环境配置
└── FRONTEND_PACKAGE.md      # 本文档
```

## 配置说明

### API地址配置

前端需要连接后端API，可以通过以下方式配置：

1. **环境变量**（推荐）：
   ```cmd
   set NEXT_PUBLIC_API_URL=http://your-backend:8000
   ```

2. **修改配置文件**：
   编辑 `.env.standalone` 文件中的 `NEXT_PUBLIC_API_URL`

### 端口配置

默认端口为3000，可以通过环境变量修改：
```cmd
set PORT=8080
```

## 部署建议

### 生产环境部署

1. **防火墙配置**：
   - 开放应用端口（默认3000）
   - 配置Windows防火墙规则

2. **服务化部署**：
   - 使用NSSM将应用注册为Windows服务
   - 配置自动启动和故障恢复

3. **反向代理**：
   - 使用IIS或Nginx作为反向代理
   - 配置SSL证书和域名

### 性能优化

1. **资源优化**：
   - 启用gzip压缩
   - 配置静态资源缓存

2. **监控配置**：
   - 配置应用日志
   - 设置性能监控

## 故障排除

### 常见问题

1. **打包失败**：
   - 检查Node.js版本（需要18+）
   - 清理node_modules重新安装
   - 检查磁盘空间是否充足

2. **启动失败**：
   - 检查端口是否被占用
   - 验证环境变量配置
   - 查看错误日志

3. **API连接失败**：
   - 检查后端服务是否启动
   - 验证API地址配置
   - 检查网络连接和防火墙

### 日志查看

应用运行时会输出日志到控制台，包括：
- 启动信息
- 请求日志
- 错误信息

## 更新部署

1. 停止当前运行的应用
2. 重新打包生成新的可执行文件
3. 替换旧的可执行文件
4. 重新启动应用

## 技术特性

- **独立运行**：无需安装Node.js环境
- **单文件部署**：所有依赖打包在一个exe文件中
- **跨平台兼容**：支持Windows x64系统
- **配置灵活**：支持环境变量和配置文件
- **性能优化**：生产模式构建，启动速度快

## 支持和维护

如遇到问题，请检查：
1. 系统要求是否满足
2. 配置是否正确
3. 网络连接是否正常
4. 后端服务是否可用

更多技术支持请联系开发团队。