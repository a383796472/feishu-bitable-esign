#!/bin/bash
# ============================================================
# 飞书 Bitable 电子签名 - 宝塔部署脚本
# ============================================================
# 在服务器上执行: bash deploy/deploy.sh
# 前提: 代码已通过 git clone 或上传到服务器
# ============================================================

set -e

echo ""
echo "========================================"
echo "  飞书 Bitable 电子签名 - 部署脚本"
echo "========================================"
echo ""

# ---------- 0. 颜色输出 ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------- 1. 检查环境 ----------
info "检查运行环境..."

if ! command -v node &> /dev/null; then
    error "未检测到 Node.js, 请先安装 Node.js 18+"
    echo "    宝塔面板 → 软件商店 → 搜索 Node.js 版本管理器"
    exit 1
fi

NODE_VERSION=$(node -v | grep -oP '\d+' | head -1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 版本过低 ($(node -v)), 需要 18+"
    exit 1
fi
info "Node.js: $(node -v)"

if ! command -v npm &> /dev/null; then
    error "未检测到 npm"
    exit 1
fi
info "npm: $(npm -v)"

if ! command -v pm2 &> /dev/null; then
    warn "未检测到 PM2, 正在全局安装..."
    npm install -g pm2
    info "PM2 安装完成"
else
    info "PM2: $(pm2 -v)"
fi

# ---------- 2. 项目根目录 ----------
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
info "项目路径: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# ---------- 3. 安装依赖 ----------
info "安装项目依赖..."
npm install
info "依赖安装完成"

# ---------- 4. 配置环境变量 ----------
info "检查环境变量配置..."

SERVER_ENV="$PROJECT_ROOT/packages/server/.env"
if [ ! -f "$SERVER_ENV" ]; then
    warn "未找到 server/.env, 从 .env.example 复制..."
    cp "$PROJECT_ROOT/packages/server/.env.example" "$SERVER_ENV"
    warn "请编辑 packages/server/.env 填写飞书应用凭证"
    warn "  FEISHU_APP_ID=你的飞书应用ID"
    warn "  FEISHU_APP_SECRET=你的飞书应用Secret"
    warn "  FEISHU_ACCESS_TOKEN=你的飞书tenant_access_token"
fi

# ---------- 5. 编译服务端 ----------
info "编译服务端 TypeScript..."
npm run build:server
info "服务端编译完成"

# ---------- 6. 编译 H5 前端 ----------
info "编译 H5 签字页面..."

# 创建生产环境变量
H5_ENV_PROD="$PROJECT_ROOT/packages/h5/.env.production"
if [ -n "$DEPLOY_DOMAIN" ]; then
    echo "VITE_API_BASE_URL=https://$DEPLOY_DOMAIN" > "$H5_ENV_PROD"
    info "H5 API 地址: https://$DEPLOY_DOMAIN"
else
    warn "未设置 DEPLOY_DOMAIN 环境变量"
    warn "请手动创建 packages/h5/.env.production 并填写:"
    warn "  VITE_API_BASE_URL=https://你的域名"
    if [ ! -f "$H5_ENV_PROD" ]; then
        echo "VITE_API_BASE_URL=https://your-domain.com" > "$H5_ENV_PROD"
    fi
fi

npm run build:h5
info "H5 编译完成"

# ---------- 6.5 编译 Widget 前端 ----------
info "编译 Widget 插件..."

WIDGET_ENV_PROD="$PROJECT_ROOT/packages/widget/.env.production"
if [ -n "$DEPLOY_DOMAIN" ]; then
    echo "VITE_API_BASE_URL=https://$DEPLOY_DOMAIN" > "$WIDGET_ENV_PROD"
    info "Widget API 地址: https://$DEPLOY_DOMAIN"
else
    warn "未设置 DEPLOY_DOMAIN 环境变量"
    warn "请手动创建 packages/widget/.env.production 并填写:"
    warn "  VITE_API_BASE_URL=https://你的域名"
    if [ ! -f "$WIDGET_ENV_PROD" ]; then
        echo "VITE_API_BASE_URL=https://your-domain.com" > "$WIDGET_ENV_PROD"
    fi
fi

npm run build:widget
info "Widget 编译完成"

# ---------- 7. 确保目录存在 ----------
info "创建必要目录..."
mkdir -p "$PROJECT_ROOT/packages/server/uploads"
mkdir -p "$PROJECT_ROOT/packages/server/logs"
info "目录就绪"

# ---------- 8. 启动/重启 PM2 ----------
info "启动 PM2 进程..."

# 停止旧进程 (如果存在)
pm2 delete esign 2>/dev/null || true

# 使用 ecosystem 配置启动
pm2 start deploy/ecosystem.config.js
info "PM2 启动完成"

# 保存进程列表 (开机自启)
pm2 save
info "PM2 进程已保存"

# 设置开机自启
pm2 startup 2>/dev/null || warn "请手动执行: pm2 startup && pm2 save"

# ---------- 9. 检查状态 ----------
echo ""
info "进程状态:"
pm2 status

echo ""
info "最近日志:"
pm2 logs esign --lines 10 --nostream

# ---------- 10. 完成 ----------
echo ""
echo "========================================"
echo -e "${GREEN}  部署完成!${NC}"
echo "========================================"
echo ""
echo "  下一步:"
echo "  1. 编辑 packages/server/.env 填写飞书凭证"
echo "  2. 在宝塔面板添加 Nginx 站点"
echo "  3. 复制 deploy/nginx.conf 到站点配置"
echo "  4. 修改 nginx.conf 中的 your-domain.com"
echo "  5. 在宝塔申请 SSL 证书"
echo "  6. 执行: pm2 restart esign"
echo ""
echo "  常用命令:"
echo "  pm2 logs esign    # 查看日志"
echo "  pm2 restart esign # 重启服务"
echo "  pm2 status        # 查看状态"
echo ""
echo "  健康检查: curl http://localhost:3001/health"
echo ""

# 尝试健康检查
if curl -s http://localhost:3001/health | grep -q "ok"; then
    info "服务运行正常!"
else
    warn "健康检查未通过, 请检查日志: pm2 logs esign"
fi
