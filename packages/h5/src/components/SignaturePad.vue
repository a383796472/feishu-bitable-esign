<template>
  <div class="signature-pad">
    <div class="canvas-wrapper" ref="wrapperRef">
      <canvas ref="canvasRef"></canvas>
      <div v-if="isEmpty" class="placeholder">请在此区域手写签名</div>
    </div>
    <div class="toolbar">
      <button class="tool-btn" @click="undo" :disabled="isEmpty">
        撤销
      </button>
      <span class="tool-divider"></span>
      <button class="tool-btn" @click="clear" :disabled="isEmpty">
        清空
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import SignaturePad from 'signature_pad'

const props = withDefaults(
  defineProps<{
    /** 画笔颜色 */
    penColor?: string
    /** 画笔粗细 */
    penSize?: number
    /** 画布背景色 */
    backgroundColor?: string
  }>(),
  {
    penColor: '#1a1a1a',
    penSize: 3,
    backgroundColor: '#f5f6f8',
  }
)

const emit = defineEmits<{
  (e: 'save', dataUrl: string): void
  (e: 'change', isEmpty: boolean): void
}>()

const wrapperRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const isEmpty = ref(true)
let pad: SignaturePad | null = null

/**
 * 初始化 SignaturePad 实例
 */
function initPad(): void {
  if (!canvasRef.value || !wrapperRef.value) return

  const { width, height } = wrapperRef.value.getBoundingClientRect()
  const w = width || 300
  const h = height || 200
  const ratio = Math.max(window.devicePixelRatio || 1, 1)

  canvasRef.value.width = w * ratio
  canvasRef.value.height = h * ratio
  canvasRef.value.style.width = `${w}px`
  canvasRef.value.style.height = `${h}px`

  const ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    ctx.scale(ratio, ratio)
  }

  pad = new SignaturePad(canvasRef.value, {
    penColor: props.penColor,
    minWidth: props.penSize,
    maxWidth: props.penSize * 1.5,
    backgroundColor: props.backgroundColor,
  })

  pad.addEventListener('endStroke', () => {
    isEmpty.value = pad?.isEmpty() ?? true
    emit('change', isEmpty.value)
  })
}

/**
 * 响应窗口/方向变化，保留签名数据
 */
function resizeCanvas(): void {
  if (!canvasRef.value || !wrapperRef.value || !pad) return

  const { width, height } = wrapperRef.value.getBoundingClientRect()
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const data = pad.toData()

  canvasRef.value.width = width * ratio
  canvasRef.value.height = height * ratio
  canvasRef.value.style.width = `${width}px`
  canvasRef.value.style.height = `${height}px`

  const ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    ctx.scale(ratio, ratio)
  }

  pad.fromData(data)
}

/**
 * 撤销上一笔
 */
function undo(): void {
  if (!pad) return
  const data = pad.toData()
  if (data.length > 0) {
    data.pop()
    pad.fromData(data)
    isEmpty.value = pad.isEmpty()
    emit('change', isEmpty.value)
  }
}

/**
 * 清空画布
 */
function clear(): void {
  pad?.clear()
  isEmpty.value = true
  emit('change', true)
}

/**
 * 导出签名 base64 PNG
 */
function save(): string {
  if (!pad || pad.isEmpty()) return ''
  const dataUrl = pad.toDataURL('image/png')
  emit('save', dataUrl)
  return dataUrl
}

/**
 * 监听画笔属性变化
 */
watch(
  () => [props.penColor, props.penSize],
  ([color, size]) => {
    if (pad) {
      pad.penColor = color as string
      pad.minWidth = size as number
      pad.maxWidth = (size as number) * 1.5
    }
  }
)

onMounted(() => {
  initPad()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('orientationchange', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('orientationchange', resizeCanvas)
  pad?.off()
})

defineExpose({ save, clear, undo })
</script>

<style scoped>
.signature-pad {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f6f8;
  border: 1px solid #e5e6eb;
}

.canvas-wrapper canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #c9cdd4;
  font-size: 14px;
  pointer-events: none;
  user-select: none;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.tool-btn {
  padding: 6px 16px;
  font-size: 14px;
  color: #3370ff;
  border-radius: 6px;
  transition: background 0.2s;
}

.tool-btn:active:not(:disabled) {
  background: rgba(51, 112, 255, 0.08);
}

.tool-btn:disabled {
  color: #c9cdd4;
  cursor: not-allowed;
}

.tool-divider {
  width: 1px;
  height: 14px;
  background: #e5e6eb;
  margin: 0 4px;
}
</style>
