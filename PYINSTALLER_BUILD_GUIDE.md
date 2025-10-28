# PLC采集平台后端PyInstaller打包指南

本文档详细说明如何使用PyInstaller将PLC采集平台后端打包为Windows可执行文件。

## 📋 目录

- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [详细步骤](#详细步骤)
- [文件说明](#文件说明)
- [常见问题](#常见问题)
- [部署指南](#部署指南)
- [故障排除](#故障排除)

## 🔧 系统要求

### 开发环境要求
- **操作系统**: Windows 10/11 (64位)
- **Python**: 3.8+ (推荐3.11)
- **.NET Framework**: 4.7.2+ (用于PythonNET)
- **内存**: 至少4GB RAM
- **磁盘空间**: 至少2GB可用空间

### 必要软件
```bash
# 检查Python版本
python --version

# 检查pip版本
pip --version
```

## 🚀 快速开始

### 方法一：一键打包（推荐）

1. **运行一键打包脚本**
   ```cmd
   build.bat
   ```

2. **等待打包完成**
   - 脚本会自动安装依赖
   - 执行完整的打包流程
   - 生成可执行文件

### 方法二：手动打包

1. **配置依赖环境**
   ```cmd
   python setup_dependencies.py
   ```

2. **执行打包**
   ```cmd
   python pyinstaller_build.py
   ```

## 📝 详细步骤

### 步骤1：环境准备

1. **克隆或下载项目**
   ```cmd
   cd d:\vsproject\plc_admin
   ```

2. **安装Python依赖**
   ```cmd
   pip install -r requirements.txt
   pip install pyinstaller
   ```

3. **配置PythonNET环境**
   ```cmd
   python setup_dependencies.py
   ```

### 步骤2：配置打包参数

1. **检查build.spec文件**
   - 确认入口文件路径
   - 检查隐藏导入列表
   - 验证数据文件包含

2. **自定义配置（可选）**
   ```python
   # 在build.spec中修改
   name='plc_admin',  # 可执行文件名
   console=True,      # 是否显示控制台
   icon=None,         # 图标文件路径
   ```

### 步骤3：执行打包

1. **清理旧文件**
   ```cmd
   rmdir /s /q build dist
   ```

2. **运行打包脚本**
   ```cmd
   python pyinstaller_build.py
   ```

3. **验证输出**
   ```cmd
   dir dist
   ```

## 📁 文件说明

### 打包相关文件

| 文件名 | 说明 | 用途 |
|--------|------|------|
| `pyinstaller_build.py` | 主打包脚本 | 自动化打包流程 |
| `build.spec` | PyInstaller配置 | 定义打包参数 |
| `build.bat` | 一键打包脚本 | Windows批处理 |
| `setup_dependencies.py` | 依赖配置脚本 | 处理复杂依赖 |
| `runtime_hook.py` | 运行时钩子 | 环境变量设置 |
| `hooks/` | PyInstaller钩子 | 模块导入处理 |

### 输出文件

| 文件名 | 说明 | 位置 |
|--------|------|------|
| `plc_admin.exe` | 主可执行文件 | `dist/` |
| `start_plc_admin.bat` | 启动脚本 | `dist/` |
| `install.bat` | 安装脚本 | `dist/` |
| `.env.production` | 配置模板 | `dist/` |
| `requirements.txt` | 依赖列表 | `dist/` |

## ⚙️ 配置选项

### PyInstaller选项

```python
# build.spec中的关键配置
exe = EXE(
    # ...
    name='plc_admin',        # 可执行文件名
    debug=False,             # 调试模式
    console=True,            # 显示控制台
    upx=True,               # UPX压缩
    strip=False,            # 去除符号表
    # ...
)
```

### 环境变量配置

```bash
# .env文件示例
DEBUG=False
HOST=0.0.0.0
PORT=8000
SQLITE_DATABASE_URL=sqlite:///./data/plc_admin.db
PYTHONNET_RUNTIME=netfx
```

## 🚀 部署指南

### 部署步骤

1. **复制文件**
   ```cmd
   # 将整个dist目录复制到目标服务器
   xcopy /E /I dist C:\PLCAdmin
   ```

2. **配置环境**
   ```cmd
   cd C:\PLCAdmin
   # 根据.env.production创建.env文件
   copy .env.production .env
   # 编辑.env文件设置实际配置
   notepad .env
   ```

3. **运行安装脚本**
   ```cmd
   install.bat
   ```

4. **启动服务**
   ```cmd
   start_plc_admin.bat
   ```

### 服务配置

#### 作为Windows服务运行

1. **安装NSSM**
   ```cmd
   # 下载NSSM并添加到PATH
   nssm install PLCAdminService "C:\PLCAdmin\plc_admin.exe"
   nssm set PLCAdminService AppDirectory "C:\PLCAdmin"
   nssm start PLCAdminService
   ```

2. **配置服务参数**
   ```cmd
   nssm set PLCAdminService DisplayName "PLC采集平台后端服务"
   nssm set PLCAdminService Description "PLC数据采集和管理平台后端API服务"
   nssm set PLCAdminService Start SERVICE_AUTO_START
   ```

#### 防火墙配置

```cmd
# 开放8000端口
netsh advfirewall firewall add rule name="PLC Admin API" dir=in action=allow protocol=TCP localport=8000
```

## 🔍 常见问题

### Q1: 打包失败，提示模块找不到

**解决方案：**
```python
# 在build.spec的hiddenimports中添加缺失模块
hiddenimports = [
    'your_missing_module',
    # ...
]
```

### Q2: PythonNET相关错误

**解决方案：**
```cmd
# 确保.NET Framework已安装
# 设置环境变量
set PYTHONNET_RUNTIME=netfx

# 重新运行依赖配置
python setup_dependencies.py
```

### Q3: 可执行文件过大

**解决方案：**
```python
# 在build.spec中启用UPX压缩
upx=True,

# 排除不必要的模块
excludes = [
    'tkinter',
    'matplotlib',
    'numpy',
    # ...
]
```

### Q4: 运行时找不到配置文件

**解决方案：**
```python
# 确保在build.spec的datas中包含配置文件
datas = [
    ('.env.example', '.'),
    ('config.py', '.'),
    # ...
]
```

### Q5: 数据库连接失败

**解决方案：**
```bash
# 检查数据库路径配置
SQLITE_DATABASE_URL=sqlite:///./data/plc_admin.db

# 确保data目录存在
mkdir data
```

## 🛠️ 故障排除

### 调试模式

1. **启用调试输出**
   ```python
   # 在build.spec中设置
   debug=True,
   console=True,
   ```

2. **查看详细日志**
   ```cmd
   # 运行时添加详细输出
   plc_admin.exe --debug
   ```

### 依赖检查

```cmd
# 检查打包后的依赖
pyinstaller --log-level=DEBUG build.spec

# 分析导入问题
pyi-archive_viewer dist/plc_admin.exe
```

### 性能优化

1. **减少启动时间**
   ```python
   # 使用onedir模式而不是onefile
   # 在build.spec中注释掉onefile相关配置
   ```

2. **减少内存占用**
   ```python
   # 排除不必要的模块
   excludes = ['tkinter', 'matplotlib', ...]
   ```

## 📊 性能指标

### 典型打包结果

- **可执行文件大小**: 50-80MB
- **打包时间**: 2-5分钟
- **启动时间**: 3-8秒
- **内存占用**: 100-200MB

### 优化建议

1. **使用虚拟环境**减少不必要依赖
2. **启用UPX压缩**减少文件大小
3. **合理配置excludes**排除无用模块
4. **使用onedir模式**提高启动速度

## 📞 技术支持

如果遇到问题，请按以下步骤排查：

1. **检查系统要求**是否满足
2. **查看错误日志**获取详细信息
3. **参考常见问题**寻找解决方案
4. **提交Issue**附带完整错误信息

---

**最后更新**: 2024年1月
**版本**: 1.0.0
**维护者**: PLC采集平台开发团队