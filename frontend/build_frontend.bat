@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo PLC管理系统前端打包工具
echo ========================================
echo.

REM 检查Node.js环境
echo [1/6] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)
echo Node.js环境检查通过
echo.

REM 检查npm环境
echo [2/6] 检查npm环境...
npm --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到npm
    pause
    exit /b 1
)
echo npm环境检查通过
echo.

REM 安装依赖
echo [3/6] 安装项目依赖...
npm install
if errorlevel 1 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)
echo 依赖安装完成
echo.

REM 安装pkg工具
echo [4/6] 安装pkg打包工具...
npm install pkg rimraf --save-dev
if errorlevel 1 (
    echo 错误: pkg工具安装失败
    pause
    exit /b 1
)
echo pkg工具安装完成
echo.

REM 构建Next.js应用
echo [5/6] 构建Next.js应用...
npm run build
if errorlevel 1 (
    echo 错误: Next.js构建失败
    pause
    exit /b 1
)
echo Next.js构建完成
echo.

REM 打包为可执行文件
echo [6/6] 打包为可执行文件...
if exist dist rmdir /s /q dist
mkdir dist
npx pkg server.js --targets node18-win-x64 --out-path dist
if errorlevel 1 (
    echo 错误: 可执行文件打包失败
    pause
    exit /b 1
)
echo.

echo ========================================
echo 打包完成！
echo ========================================
echo 可执行文件位置: dist\server.exe
echo 使用方法: 双击运行或在命令行执行
echo 默认端口: 3000
echo 访问地址: http://localhost:3000
echo ========================================
echo.
pause