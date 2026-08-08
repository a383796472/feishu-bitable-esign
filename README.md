# 飞书多维表格电子签名插件

在飞书多维表格（Bitable）中实现完整的电子签名工作流：创建确认单 → 生成二维码 → 移动端扫码签名 → 数据自动回写表格。

## 功能特性

- 三步向导式配置：选择数据 → 设置确认单 → 生成二维码
- 支持单人签字和多人签字模式
- 可选身份验证（手机号验证码）
- 独立 H5 签名页面，扫码即可签字
- 签名结果自动回写多维表格（签字状态 + 签名图片）
- 字段级别选择，支持拖拽排序、过滤空值/零值
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
2. H5 页面展示该记录的字段数据
3. 如开启身份验证，需输入手机号验证码
4. 在签名画布上手写签名
5. 点击提交完成签字

### 3. 数据回写（自动）

签名提交后，后端自动：
- 保存签名图片
- 通过飞书 API 更新多维表格记录
- 更新「签字状态」字段为「已签字」
- 写入签名图片到「签字确认结果」字段

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sessions` | 创建签名会话 |
| GET | `/api/sessions/:sessionId` | 获取会话详情 |
| GET | `/api/sessions/:sessionId/records/:recordId` | 获取记录签字数据 |
| GET | `/api/sessions/:sessionId/status` | 获取签字状态概览 |
| POST | `/api/sessions/:sessionId/sign` | 提交签名 |
| POST | `/api/sessions/:sessionId/send-code` | 发送验证码 |

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
