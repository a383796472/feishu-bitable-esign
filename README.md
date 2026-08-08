# 飞书多维表格电子签名插件

在飞书多维表格（Bitable）中实现手写电子签名功能的扩展脚本插件。

## 功能特性

- 手写签名画布，支持鼠标和触摸输入
- 可自定义画笔颜色和粗细
- 签名保存为 PNG 图片，直接写入多维表格记录
- 支持附件字段和文本/URL 字段两种存储方式
- 自动识别当前选中的数据表和记录
- HiDPI 屏幕适配，签名清晰锐利
- 撤销/清空操作
- 连接状态实时显示

## 技术栈

- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **TypeScript** - 类型安全
- **signature_pad** - 签名画布库
- **飞书多维表格扩展脚本 SDK** - 数据交互

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

开发服务器将运行在 `http://localhost:5173`。

> **注意**：飞书多维表格要求扩展脚本通过 HTTPS 访问。本地开发时，可以使用 `ngrok`、`cloudflare tunnel` 等工具将本地服务暴露为 HTTPS URL，或直接部署到支持 HTTPS 的平台。

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录中。

### 部署

将 `dist/` 目录部署到任意支持静态托管的平台：

- **Vercel**：`vercel --prod`
- **Netlify**：拖拽 `dist/` 文件夹到 Netlify 部署面板
- **GitHub Pages**：推送到 `gh-pages` 分支
- **Nginx**：将 `dist/` 复制到服务器静态文件目录

### 在多维表格中配置

1. 打开飞书多维表格
2. 点击右上角「+」按钮 → 「添加脚本」→ 「扩展脚本」
3. 在 URL 输入框中粘贴部署后的公网地址
4. 点击确认，扩展脚本将在表格中加载

## 项目结构

```
feishu-bitable-esign/
├── src/
│   ├── api/
│   │   └── bitable.ts        # 多维表格 SDK API 封装
│   ├── components/
│   │   └── SignaturePad.vue  # 签名画布组件
│   ├── types/
│   │   └── index.ts          # TypeScript 类型定义
│   ├── utils/
│   │   └── signature.ts      # 签名工具函数
│   ├── styles/
│   │   └── main.css          # 全局样式
│   ├── App.vue               # 根组件
│   ├── main.ts               # 应用入口
│   └── vite-env.d.ts         # Vite 类型声明
├── public/
│   └── favicon.svg           # 网站图标
├── index.html                # HTML 入口
├── vite.config.ts            # Vite 配置
├── tsconfig.json             # TypeScript 配置
├── package.json
└── README.md
```

## 工作原理

该插件本质上是一个 Web 应用，通过 URL 嵌入到飞书多维表格的 iframe 中。页面内通过飞书注入的全局 `bitable` 对象与表格数据交互：

1. **获取上下文**：通过 `bitable.base.getSelection()` 获取当前选中的数据表和记录
2. **采集签名**：使用 `signature_pad` 库在 Canvas 上捕获手写签名
3. **导出图片**：将签名画布转为 base64 PNG 图片
4. **写入表格**：通过 `table.setRecord()` 将签名图片写入指定记录的指定字段

### 支持的字段类型

| 字段类型 | 存储方式 | 说明 |
|---------|---------|------|
| 附件 | 图片附件 | 直接将签名作为图片附件写入 |
| 多行文本 | base64 / URL | 将签名数据 URL 写入文本字段 |
| 链接 (URL) | 图片 URL | 需配合图床使用 |

## 使用流程

1. 在多维表格中打开目标数据表
2. 选中需要签名的记录（行）
3. 打开电子签名扩展脚本
4. 选择目标字段（签名保存位置）
5. 在画布上手写签名
6. 点击「保存签名」
7. 签名将自动写入当前选中记录的指定字段

## 开发指南

### 添加自定义功能

编辑 `src/App.vue` 添加业务逻辑，编辑 `src/api/bitable.ts` 扩展 Bitable API 调用。

### 类型定义

Bitable SDK 的类型定义在 `src/types/index.ts` 中。如需添加新的 API 类型，请参考官方文档：

- [开发指南](https://bytedance.feishu.cn/docx/HazFdSHH9ofRGKx8424cwzLlnZc)
- [API 文档](https://bytedance.feishu.cn/docx/HjCEd1sPzoVnxIxF3LrcKnepnUf)
- [开放平台](https://open.feishu.cn/document/base-extension/base-view-extensions)

### 本地 HTTPS 开发

如需 HTTPS 本地开发环境，生成自签名证书并取消 `vite.config.ts` 中的 HTTPS 注释：

```bash
mkdir certs
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout certs/key.pem -out certs/cert.pem
```

## 许可证

MIT License
