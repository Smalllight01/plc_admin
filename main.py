# -*- coding: utf-8 -*-
"""
PLC采集平台主程序
提供Web API服务和PLC数据采集功能
"""

import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import uvicorn

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import config
from database import db_manager
from plc_collector import PLCCollector
from api.auth_routes import setup_auth_routes
from api.user_routes import router as user_router
from api.group_routes import router as group_router
from api.device_routes import router as device_router
from api.data_routes import router as data_router
from api.settings_routes import router as settings_router
from api.dashboard_routes import router as dashboard_router
import logging
import os
from datetime import datetime

def setup_logging():
    """配置日志"""
    # 确保日志目录存在
    log_dir = os.path.dirname(config.LOG_FILE)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # 配置loguru
    logger.remove()  # 移除默认处理器
    
    # 添加控制台输出
    logger.add(
        sys.stdout,
        level=config.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )
    
    # 添加文件输出
    logger.add(
        config.LOG_FILE,
        level=config.LOG_LEVEL,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation="10 MB",
        retention="30 days",
        compression="zip"
    )

def create_app(plc_collector=None):
    """创建并配置FastAPI应用"""
    app = FastAPI(
        title=config.APP_NAME,
        version=config.APP_VERSION,
        description="PLC采集平台API服务"
    )
    
    # 配置CORS中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","http://192.168.1.23:3000"],
        allow_origin_regex=r"http://192\.168\.1\.[0-9]+:3000",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 健康检查
    @app.get("/health")
    async def health_check():
        return {"status": "ok", "timestamp": str(datetime.now())}
    
    # 设置PLC采集器（如果提供）
    if plc_collector:
        from api.device_routes import set_plc_collector
        set_plc_collector(plc_collector)
    
    # 注册路由
    setup_auth_routes(app)
    app.include_router(user_router)
    app.include_router(group_router)
    app.include_router(device_router)
    app.include_router(data_router)
    app.include_router(settings_router)
    app.include_router(dashboard_router)

    return app

def main():
    """主函数"""
    # 配置日志
    setup_logging()
    logger.info(f"启动 {config.APP_NAME} v{config.APP_VERSION}")
    
    try:
        # 启动PLC采集服务
        plc_collector = PLCCollector()
        plc_collector.start()
        
        # 创建应用
        app = create_app(plc_collector)
        
        logger.info(f"服务启动在 http://{config.HOST}:{config.PORT}")
        
        # 启动Web服务
        uvicorn.run(
            app,
            host=config.HOST,
            port=config.PORT,
            log_config=None  # 使用我们自己的日志配置
        )
        
    except KeyboardInterrupt:
        logger.info("收到停止信号，正在关闭服务...")
    except Exception as e:
        logger.error(f"服务启动失败: {e}")
        raise
    finally:
        # 清理资源
        if 'plc_collector' in locals():
            plc_collector.stop()
        db_manager.close()
        logger.info("服务已停止")

if __name__ == "__main__":
    main()
