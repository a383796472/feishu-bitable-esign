/**
 * 电子签名工具函数
 */

/**
 * 将 Canvas 转换为 base64 图片数据
 * @param canvas HTML Canvas 元素
 * @param transparent 是否透明背景
 * @returns base64 编码的 PNG 图片
 */
export function canvasToBase64(
  canvas: HTMLCanvasElement,
  transparent: boolean = true
): string {
  if (!transparent) {
    // 添加白色背景
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    // 保存当前内容
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // 创建新的 canvas 带白底
    const newCanvas = document.createElement('canvas')
    newCanvas.width = canvas.width
    newCanvas.height = canvas.height
    const newCtx = newCanvas.getContext('2d')
    if (!newCtx) return ''

    newCtx.fillStyle = '#FFFFFF'
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height)
    newCtx.putImageData(imageData, 0, 0)

    return newCanvas.toDataURL('image/png')
  }

  return canvas.toDataURL('image/png')
}

/**
 * 调整 Canvas 尺寸以适应 HiDPI 屏幕
 * @param canvas Canvas 元素
 * @param width 目标宽度
 * @param height 目标高度
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): void {
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(ratio, ratio)
  }
}

/**
 * 生成时间戳字符串
 * @returns 格式化的时间戳 (YYYY-MM-DD HH:mm:ss)
 */
export function getTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/**
 * 生成唯一ID
 * @returns 唯一标识符
 */
export function generateId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
