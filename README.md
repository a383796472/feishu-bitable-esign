# 飞书多维表格电子签名插件

在飞书多维表格（Bitable）中实现完整的电子签名工作流：创建确认单 → 生成二维码 → 移动端扫码签名 → 数据自动回写表格。

## 功能特性

- 三步向导式配置：选择数据 → 设置确认单 → 生成二维码
- 支持单人签字和多人会签模式
- 免费身份验证：手机号匹配表格数据，无需短信费用
- 独立 H5 签名页面，扫码即可签字
- 签名结果实时回写多维表格（签字状态 + 签名图片附件）
- 会签模式：谁签完即回写，无需等待全部签完
- 可配置回写字段名（签字状态字段、签名图片字段）
- 字段级别选择，支持拖拽排序
- 飞书风格 UI，移动端适配

## 系统架构

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Widget 插件        │     │   后端服务器         │     │   H5 签名页面       │
│  (嵌入多维表格)      │────▶│  (Express+SQLite)  │────▶│  (移动端签名)       │
│                     │     │                     │     │                     │
│  Step1: 选择字段     │     │  会话管理            │     │  数据展示           │
│  Step2: 设置确认单   │     │  Bitable API 封装   │     │  身份验证           │
│  Step3: 生成二维码   │◀────│  签名回写            │◀────│  手写签名           │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │   飞书多维表格       │
                            │  (数据源 + 回写)     │
                            └─────────────────────┘
```

## 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| Widget | Vue 3 + Vite + TypeScript | 嵌入飞书多维表格的配置向导 |
| Server | Express + SQLite + TypeScript | 会话管理、数据桥接、签名回写 |
| H5 | Vue 3 + Vite + TypeScript | 移动端签名页面 |
| 共享 | TypeScript 类型定义 | 前后端 API 契约 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
# 后端
cp packages/server/.env.example packages/server/.env
# 编辑 .env 填入飞书应用凭证

# Widget
cp packages/widget/.env.example packages/widget/.env

# H5
cp packages/h5/.env.example packages/h5/.env
```

### 本地开发（三个服务同时启动）

```bash
npm run dev
```

| 服务 | 端口 | 说明 |
|------|------|------|
| Server | 3001 | 后端 API + 静态文件托管 |
| Widget | 5173 | 多维表格插件开发服务器 |
| H5 | 5174 | 移动端签名页面 |

### 构建

```bash
npm run build
```

构建产物：
- `packages/widget/dist/` - Widget 插件
- `packages/h5/dist/` - H5 签名页面
- `packages/server/dist/` - 后端服务

## 项目结构

```
feishu-bitable-esign/
├── packages/
│   ├── widget/                 # 飞书多维表格 Widget 插件
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── bitable.ts  # Bitable SDK 封装
│   │   │   │   └── server.ts   # 后端 API 调用
│   │   │   ├── components/
│   │   │   │   ├── StepIndicator.vue   # 步骤指示器
│   │   │   │   ├── FieldSelector.vue   # 字段选择器 (Step 1)
│   │   │   │   ├── FormConfig.vue      # 确认单配置 (Step 2)
│   │   │   │   └── QrResult.vue         # 二维码结果 (Step 3)
│   │   │   ├── types/
│   │   │   │   └── bitable.ts  # Bitable SDK 类型定义
│   │   │   ├── styles/
│   │   │   │   └── main.css
│   │   │   ├── App.vue         # 主应用
│   │   │   └── main.ts
│   │   ├── index.html
│   │   └── package.json
│   │
│   ├── server/                 # 后端服务器
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── sessions.ts # 会话管理路由
│   │   │   │   └── sign.ts     # 签名提交路由
│   │   │   ├── services/
│   │   │   │   ├── bitable.ts  # 飞书 API 封装
│   │   │   │   └── qrcode.ts   # 二维码生成
│   │   │   ├── db.ts           # SQLite 数据库
│   │   │   └── index.ts        # 服务器入口
│   │   ├── uploads/            # 签名图片存储
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── h5/                     # H5 移动端签名页面
│       ├── src/
│       │   ├── components/
│       │   │   └── SignaturePad.vue  # 签名画布
│       │   ├── api.ts          # API 调用
│       │   ├── App.vue         # 主页面
│       │   ├── style.css
│       │   └── main.ts
│       ├── index.html
│       └── package.json
│
├── shared/
│   └── types.ts                # 共享类型定义 (API 契约)
│
├── package.json                # Monorepo 根配置
└── README.md
```

## 工作流程

### 1. 创建确认单（Widget 插件）

1. 在飞书多维表格中打开「签字确认」扩展脚本
2. **Step 1 选择数据**：选择数据表，勾选需要展示的字段，拖拽排序
3. **Step 2 设置确认单**：输入确认单名称，选择单人/多人签字模式，设置身份验证
4. **Step 3 创建完成**：生成二维码和分享链接

### 2. 扫码签名（H5 页面）

1. 签字人扫描二维码或点击分享链接
2. 如开启身份验证，输入手机号进行匹配验证
3. 验证通过后，展示该签字人需要签的记录列表
4. 点击进入记录详情，查看字段数据
5. 在签名画布上手写签名，点击提交完成签字

### 3. 数据回写（自动）

签名提交后，后端自动：
- 保存签名图片到服务器
- 通过飞书 API 上传签名图片附件到表格
- 更新「签字状态」字段：未签 / 已签 / 部分已签 / 全部已签
- 会签模式下，每个签字人签完即独立回写，无需等待他人

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sessions` | 创建签名会话 |
| GET | `/api/sessions/:sessionId` | 获取会话详情 |
| GET | `/api/sessions/:sessionId/records/:recordId` | 获取记录签字数据 |
| GET | `/api/sessions/:sessionId/status` | 获取签字状态概览 |
| POST | `/api/sessions/:sessionId/verify-phone` | 手机号身份验证 |
| POST | `/api/sign` | 提交签名 |
| GET | `/health` | 健康检查 |

## 宝塔部署

### 前置准备

1. 服务器已安装宝塔面板
2. 在宝塔软件商店安装 **Node.js 版本管理器** (Node.js 18+)
3. 在宝塔软件商店安装 **PM2 管理器**
4. 准备一个已备案的域名（飞书要求 HTTPS）

### 部署步骤

#### 1. 上传代码到服务器

```bash
# 方式一: git clone
cd /www/wwwroot
git clone https://github.com/your-username/feishu-bitable-esign.git
cd feishu-bitable-esign

# 方式二: 宝塔文件管理上传压缩包后解压
```

#### 2. 配置环境变量

```bash
# 后端环境变量
cp packages/server/.env.example packages/server/.env
# 编辑 .env，填写飞书应用凭证
vi packages/server/.env

# H5 生产环境变量
vi packages/h5/.env.production
# 修改 VITE_API_BASE_URL 为你的实际域名
# 例如: VITE_API_BASE_URL=https://esign.your-domain.com
```

#### 3. 一键部署

```bash
bash deploy/deploy.sh
```

脚本会自动完成：安装依赖 → 编译服务端 → 编译 H5 → 启动 PM2

#### 4. 配置 Nginx（宝塔面板）

1. 宝塔面板 → 网站 → 添加站点
2. 绑定域名（如 `esign.your-domain.com`）
3. 站点设置 → 配置文件
4. 将 `deploy/nginx.conf` 内容替换进去
5. 修改配置中的 `your-domain.com` 为实际域名
6. 修改 SSL 证书路径
7. 在宝塔 SSL 中申请免费证书（Let's Encrypt）

#### 5. 验证部署

```bash
# 健康检查
curl http://localhost:3001/health

# 查看进程状态
pm2 status

# 查看日志
pm2 logs esign

# 浏览器访问
# H5 页面: https://esign.your-domain.com/h5
# API: https://esign.your-domain.com/api/sessions
```

### 日常运维

| 操作 | 命令 |
|------|------|
| 查看状态 | `pm2 status` |
| 查看日志 | `pm2 logs esign` |
| 重启服务 | `pm2 restart esign` |
| 停止服务 | `pm2 stop esign` |
| 更新代码后重新部署 | `git pull && npm install && npm run build:server && npm run build:h5 && pm2 restart esign` |

### 目录说明

```
/www/wwwroot/feishu-bitable-esign/   # 项目根目录
├── packages/server/
│   ├── dist/              # 编译后的服务端代码
│   ├── uploads/           # 签名图片存储
│   ├── logs/              # PM2 日志
│   ├── data.db            # SQLite 数据库
│   └── .env               # 环境变量 (飞书凭证)
├── packages/h5/dist/      # 编译后的 H5 前端
└── deploy/                # 部署配置文件
    ├── nginx.conf         # Nginx 配置
    ├── ecosystem.config.js # PM2 配置
    └── deploy.sh          # 一键部署脚本
```

## 飞书配置

### 多维表格扩展脚本

1. 部署 Widget 的 `dist/` 到 HTTPS 地址
2. 在多维表格中「添加扩展脚本」→ 粘贴 URL

### 飞书开放平台应用

1. 在 [飞书开放平台](https://open.feishu.cn/) 创建企业自建应用
2. 获取 App ID 和 App Secret
3. 配置到后端 `.env` 文件
4. 开通多维表格相关权限

## 参考文档

- [飞书多维表格扩展脚本开发指南](https://bytedance.feishu.cn/docx/HazFdSHH9ofRGKx8424cwzLlnZc)
- [扩展脚本 API 文档](https://bytedance.feishu.cn/docx/HjCEd1sPzoVnxIxF3LrcKnepnUf)
- [飞书开放平台 - Bitable](https://open.feishu.cn/document/base-extension/base-view-extensions)
- [多维表格服务端 API](https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview)

## 许可证

MIT License
