<template>
  <div class="signature-pad-container">
    <div class="canvas-wrapper" ref="wrapperRef">
      <canvas ref="canvasRef"></canvas>
      <div v-if="isEmpty" class="placeholder">
        <span>请在此区域手写签名</span>
      </div>
    </div>
    <div class="toolbar">
      <button class="btn btn-secondary" @click="undo" :disabled="isEmpty">
        撤销
      </button>
      <button class="btn btn-secondary" @click="clear" :disabled="isEmpty">
        清空
      </button>
      <button class="btn btn-primary" @click="save" :disabled="isEmpty">
        保存签名
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import SignaturePad from 'signature_pad'
import { setupCanvas } from '../utils/signature'

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
    penSize: 2.5,
    backgroundColor: 'transparent',
  }
)

const emit = defineEmits<{
  (e: 'save', dataUrl: string): void
  (e: 'change', isEmpty: boolean): void
}>()

const wrapperRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const isEmpty = ref(true)
let signaturePad: SignaturePad | null = null

/** 初始化 SignaturePad */
function initPad() {
  if (!canvasRef.value || !wrapperRef.value) return

  const { width, height } = wrapperRef.value.getBoundingClientRect()
  const canvasWidth = width || 400
  const canvasHeight = height || 200

  setupCanvas(canvasRef.value, canvasWidth, canvasHeight)

  signaturePad = new SignaturePad(canvasRef.value, {
    penColor: props.penColor,
    minWidth: props.penSize,
    maxWidth: props.penSize * 1.5,
    backgroundColor: props.backgroundColor as string,
  })

  signaturePad.addEventListener('endStroke', () => {
    isEmpty.value = signaturePad?.isEmpty() ?? true
    emit('change', isEmpty.value)
  })
}

/** 撤销上一笔 */
function undo() {
  const data = signaturePad?.toData()
  if (data && data.length > 0) {
    data.pop()
    signaturePad?.fromData(data)
    isEmpty.value = signaturePad?.isEmpty() ?? true
    emit('change', isEmpty.value)
  }
}

/** 清空画布 */
function clear() {
  signaturePad?.clear()
  isEmpty.value = true
  emit('change', true)
}

/** 保存签名 */
function save() {
  if (!signaturePad || signaturePad.isEmpty()) return
  const dataUrl = signaturePad.toDataURL('image/png')
  emit('save', dataUrl)
}

/** 监听画笔属性变化 */
watch(
  () => [props.penColor, props.penSize],
  ([color, size]) => {
    if (signaturePad) {
      signaturePad.penColor = color as string
      signaturePad.minWidth = size as number
      signaturePad.maxWidth = (size as number) * 1.5
    }
  }
)

/** 响应窗口大小变化 */
function handleResize() {
  if (!canvasRef.value || !wrapperRef.value || !signaturePad) return

  const { width, height } = wrapperRef.value.getBoundingClientRect()
  const ratio = Math.max(window.devicePixelRatio || 1, 1)

  // 保存当前签名数据
  const data = signaturePad.toData()

  // 调整画布尺寸
  canvasRef.value.width = width * ratio
  canvasRef.value.height = height * ratio
  canvasRef.value.style.width = `${width}px`
  canvasRef.value.style.height = `${height}px`

  const ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    ctx.scale(ratio, ratio)
  }

  // 恢复签名数据
  signaturePad.fromData(data)
}

onMounted(() => {
  initPad()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  signaturePad?.off()
})

defineExpose({ clear, undo, save })
</script>

<style scoped>
.signature-pad-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 220px;
  border: 2px dashed #d0d4dc;
  border-radius: 8px;
  overflow: hidden;
  background: #fafbfc;
  transition: border-color 0.2s;
}

.canvas-wrapper:hover {
  border-color: #3370ff;
}

.canvas-wrapper canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #c0c4cc;
  font-size: 14px;
  pointer-events: none;
  user-select: none;
}

.toolbar {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: #3370ff;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #245bdb;
}

.btn-secondary {
  background: #f0f1f5;
  color: #1f2329;
}

.btn-secondary:hover:not(:disabled) {
  background: #e3e5ea;
}
</style>
