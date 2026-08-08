/**
 * 服务器入口
 *
 * 启动流程:
 *   1. 加载 dotenv 环境变量
 *   2. 初始化 SQLite 数据库
 *   3. 配置 Express 中间件 (cors, json, 静态文件)
 *   4. 挂载 API 路由
 *   5. 静态托管 H5 页面
 *   6. 监听端口
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// 初始化数据库 (导入即执行建表)
import './db';

import sessionsRouter from './routes/sessions';
import signRouter from './routes/sign';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ==================== 中间件 ====================

// 跨域支持
app.use(cors());

// JSON 解析 (提高 limit 以支持 base64 签名图片)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== 静态文件 ====================

// 使用 process.cwd() 作为基础目录 (npm 脚本始终从 packages/server 运行)
const SERVER_ROOT = process.cwd();

// 确保上传目录存在
const uploadsDir = path.resolve(SERVER_ROOT, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 托管上传的签名图片
app.use('/uploads', express.static(uploadsDir));

// 托管 H5 前端 (生产模式, 从 h5/dist 读取)
const h5DistPath = path.resolve(SERVER_ROOT, '../h5/dist');
if (fs.existsSync(h5DistPath)) {
  app.use('/h5', express.static(h5DistPath));
  console.log(`[H5] 静态文件目录: ${h5DistPath}`);
} else {
  console.warn(
    `[H5] dist 目录不存在: ${h5DistPath}\n` +
    '     开发模式请单独运行 H5 (cd packages/h5 && npm run dev)'
  );
}

// ==================== API 路由 ====================

app.use('/api/sessions', sessionsRouter);
app.use('/api/sign', signRouter);

// ==================== 健康检查 ====================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ==================== 404 处理 ====================

app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
  });
});

// ==================== 全局错误处理 ====================

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[全局错误]', err);
    res.status(500).json({
      code: 500,
      message: err.message || '服务器内部错误',
      data: null,
    });
  }
);

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  飞书 Bitable 电子签名服务已启动');
  console.log(`  端口: ${PORT}`);
  console.log(`  API:  http://localhost:${PORT}/api`);
  console.log(`  H5:   http://localhost:${PORT}/h5`);
  console.log(`  上传: http://localhost:${PORT}/uploads`);
  console.log('========================================');
  console.log('');
});

export default app;
