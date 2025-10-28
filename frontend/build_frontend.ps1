# PLC管理系统前端打包脚本
# PowerShell版本

Write-Host "========================================" -ForegroundColor Green
Write-Host "PLC管理系统前端打包工具" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 设置错误处理
$ErrorActionPreference = "Stop"

try {
    # 检查Node.js环境
    Write-Host "[1/6] 检查Node.js环境..." -ForegroundColor Yellow
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "未找到Node.js，请先安装Node.js"
    }
    Write-Host "Node.js环境检查通过: $nodeVersion" -ForegroundColor Green
    Write-Host ""

    # 检查npm环境
    Write-Host "[2/6] 检查npm环境..." -ForegroundColor Yellow
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "未找到npm"
    }
    Write-Host "npm环境检查通过: $npmVersion" -ForegroundColor Green
    Write-Host ""

    # 安装依赖
    Write-Host "[3/6] 安装项目依赖..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "依赖安装失败"
    }
    Write-Host "依赖安装完成" -ForegroundColor Green
    Write-Host ""

    # 安装pkg工具
    Write-Host "[4/6] 安装pkg打包工具..." -ForegroundColor Yellow
    npm install pkg rimraf --save-dev
    if ($LASTEXITCODE -ne 0) {
        throw "pkg工具安装失败"
    }
    Write-Host "pkg工具安装完成" -ForegroundColor Green
    Write-Host ""

    # 构建Next.js应用
    Write-Host "[5/6] 构建Next.js应用..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Next.js构建失败"
    }
    Write-Host "Next.js构建完成" -ForegroundColor Green
    Write-Host ""

    # 打包为可执行文件
    Write-Host "[6/6] 打包为可执行文件..." -ForegroundColor Yellow
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    New-Item -ItemType Directory -Path "dist" -Force | Out-Null
    
    npx pkg server.js --targets node18-win-x64 --out-path dist
    if ($LASTEXITCODE -ne 0) {
        throw "可执行文件打包失败"
    }
    Write-Host ""

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "打包完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "可执行文件位置: dist\server.exe" -ForegroundColor Cyan
    Write-Host "使用方法: 双击运行或在命令行执行" -ForegroundColor Cyan
    Write-Host "默认端口: 3000" -ForegroundColor Cyan
    Write-Host "访问地址: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "打包失败，请检查错误信息" -ForegroundColor Red
    exit 1
}

Write-Host "按任意键退出..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")