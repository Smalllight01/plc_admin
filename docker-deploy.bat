@echo off
chcp 65001 >nul
echo ========================================
echo PLC采集平台 Docker 部署脚本
echo ========================================
echo.

:: 检查Docker是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到Docker，请先安装Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo 提示: 如果遇到镜像拉取失败，请配置Docker镜像加速器
echo 配置文件位置: %USERPROFILE%\.docker\daemon.json
echo 参考配置文件: docker-daemon.json
echo.

:: 检查docker-compose是否可用
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Docker Compose 不可用
    pause
    exit /b 1
)

echo ✓ Docker 环境检查通过
echo.

:: 检查.env文件
if not exist ".env" (
    if exist ".env.example" (
        echo 正在创建.env文件...
        copy ".env.example" ".env" >nul
        echo ✓ 已从.env.example创建.env文件
        echo 请根据需要修改.env文件中的配置
        echo.
    ) else (
        echo 错误: 未找到.env或.env.example文件
        pause
        exit /b 1
    )
)

:: 创建必要的目录
if not exist "data" mkdir data
if not exist "logs" mkdir logs
echo ✓ 创建必要目录完成
echo.

:: 构建和启动服务
echo 正在构建和启动服务...
echo 这可能需要几分钟时间，请耐心等待...
echo.

docker compose up --build -d

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 🎉 部署成功！
    echo ========================================
    echo.
    echo 服务访问地址:
    echo 前端界面: http://localhost:3000
    echo 后端API:  http://localhost:8000
    echo 健康检查: http://localhost:8000/health
    echo.
    echo 默认管理员账户:
    echo 用户名: admin
    echo 密码: admin123
    echo.
    echo 常用命令:
    echo 查看日志: docker compose logs -f
    echo 停止服务: docker compose down
    echo 重启服务: docker compose restart
    echo.
) else (
    echo.
    echo ❌ 部署失败，请检查错误信息
    echo 查看详细日志: docker compose logs
    echo.
)

pause