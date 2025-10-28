@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo PLC管理系统前端启动器
echo ========================================
echo.

REM 检查可执行文件是否存在
if not exist "dist\server.exe" (
    echo 错误: 未找到可执行文件 dist\server.exe
    echo 请先运行 build_frontend.bat 进行打包
    echo.
    pause
    exit /b 1
)

REM 设置环境变量
set PORT=3000
set HOSTNAME=localhost

echo 正在启动PLC管理系统前端...
echo 端口: %PORT%
echo 主机: %HOSTNAME%
echo.
echo 启动后请访问: http://%HOSTNAME%:%PORT%
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

REM 启动服务
dist\server.exe

echo.
echo 服务已停止
pause