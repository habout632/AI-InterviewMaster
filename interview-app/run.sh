#!/bin/bash
# AI模拟面试应用自动部署和启动脚本

# 显示彩色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AI模拟面试应用启动脚本 ===${NC}\n"

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: 未找到 Python3。请先安装 Python 3.8 或更高版本。${NC}"
    exit 1
fi

# 检查pip是否安装
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}错误: 未找到 pip3。请确保正确安装了 Python 和 pip。${NC}"
    exit 1
fi

# 检查是否安装虚拟环境工具
if ! command -v python3 -m venv &> /dev/null; then
    echo -e "${YELLOW}警告: 未安装 venv 模块。尝试安装...${NC}"
    pip3 install virtualenv
fi

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo -e "${BLUE}创建Python虚拟环境...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}创建虚拟环境失败。请检查您的Python安装。${NC}"
        exit 1
    fi
    echo -e "${GREEN}虚拟环境创建成功!${NC}"
fi

# 激活虚拟环境
echo -e "${BLUE}激活虚拟环境...${NC}"
source venv/bin/activate

# 安装后端依赖
echo -e "${BLUE}安装后端依赖...${NC}"
pip install -r backend/requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}安装后端依赖失败。请检查您的网络连接和requirements.txt文件。${NC}"
    exit 1
fi
echo -e "${GREEN}后端依赖安装成功!${NC}"

# 检查前端服务器工具
echo -e "${BLUE}检查前端服务工具...${NC}"
if ! command -v python3 -m http.server &> /dev/null; then
    echo -e "${YELLOW}未找到http.server模块。将使用后备选项。${NC}"
    # 这里可以添加备用方案
fi

# 使用多进程启动应用
echo -e "${BLUE}正在启动应用...${NC}"

# 启动后端
echo -e "${YELLOW}启动后端服务器...${NC}"
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 5000 &
BACKEND_PID=$!
cd ..

# 给后端一点启动时间
sleep 2

# 启动前端
echo -e "${YELLOW}启动前端服务器...${NC}"
cd frontend
python3 -m http.server 8000 &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}=========================================================${NC}"
echo -e "${GREEN}✅ AI模拟面试应用已成功启动!${NC}"
echo -e "${GREEN}  后端API: http://localhost:5000${NC}"
echo -e "${GREEN}  后端API文档: http://localhost:5000/docs${NC}"
echo -e "${GREEN}  前端界面: http://localhost:8000${NC}"
echo -e "${GREEN}=========================================================${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"

# 注册清理函数
cleanup() {
    echo -e "\n${BLUE}正在关闭服务...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    echo -e "${GREEN}服务已关闭。${NC}"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT

# 等待用户中断
wait