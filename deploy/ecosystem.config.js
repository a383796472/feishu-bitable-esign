/**
 * PM2 进程管理配置 - 飞书 Bitable 电子签名服务
 *
 * 使用方法:
 *   pm2 start deploy/ecosystem.config.js
 *   pm2 save          # 保存进程列表 (开机自启)
 *   pm2 startup       # 设置开机自启
 *
 * 常用命令:
 *   pm2 status        # 查看状态
 *   pm2 logs esign    # 查看日志
 *   pm2 restart esign # 重启
 *   pm2 stop esign    # 停止
 *   pm2 delete esign  # 删除
 */

module.exports = {
  apps: [
    {
      name: 'esign',
      // 编译后的入口文件 (tsc 输出到 dist/)
      script: './dist/packages/server/src/index.js',
      // 工作目录: packages/server
      cwd: './packages/server',
      // 实例数 (单机建议 1, SQLite 不支持多进程并发写)
      instances: 1,
      // 自动重启
      autorestart: true,
      // 最大重启次数
      max_restarts: 10,
      // 重启间隔 (毫秒)
      restart_delay: 3000,
      // 最大内存限制 (超出自动重启, MB)
      max_memory_restart: '512M',
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 日志文件
      error_file: './logs/esign-error.log',
      out_file: './logs/esign-out.log',
      // 日志时间格式
      time: true,
      // 合并日志 (单实例)
      merge_logs: true,
      // 监听文件变化自动重启 (生产环境关闭)
      watch: false,
      // 忽略监听的目录
      ignore_watch: ['node_modules', 'logs', 'uploads', 'data.db'],
    },
  ],
};
