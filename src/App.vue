<template>
  <div class="app-container">
    <!-- 头部 -->
    <header class="app-header">
      <div class="header-title">
        <img src="/favicon.svg" alt="logo" class="logo" />
        <div>
          <h1>电子签名</h1>
          <p class="subtitle">飞书多维表格插件</p>
        </div>
      </div>
      <div class="status-badge" :class="statusClass">
        {{ statusText }}
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>正在连接多维表格...</span>
    </div>

    <!-- 主内容 -->
    <main v-else class="main-content">
      <!-- 连接失败提示 -->
      <div v-if="!isBitableAvailable" class="notice notice-warning">
        <p>
          未检测到飞书多维表格环境。请在多维表格中通过「添加扩展脚本」加载此页面。
        </p>
        <p class="notice-hint">
          开发模式下，你可以预览签名功能，但无法保存到表格。
        </p>
      </div>

      <!-- 表格信息 -->
      <section v-if="isBitableAvailable" class="info-card">
        <div class="info-row">
          <span class="info-label">当前数据表</span>
          <span class="info-value">{{ tableInfo.name || '加载中...' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">可编辑</span>
          <span class="info-value">{{ editable ? '是' : '否' }}</span>
        </div>
        <div class="info-row" v-if="currentRecordId">
          <span class="info-label">当前记录</span>
          <span class="info-value mono">{{ currentRecordId }}</span>
        </div>
      </section>

      <!-- 签名设置 -->
      <section class="settings-card">
        <h2 class="section-title">签名设置</h2>
        <div class="form-group">
          <label class="form-label">目标字段名称</label>
          <select v-model="targetField" class="form-select">
            <option value="">请选择字段</option>
            <option v-for="field in fields" :key="field.id" :value="field.name">
              {{ field.name }}（{{ getFieldTypeLabel(field.type) }}）
            </option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">画笔颜色</label>
            <div class="color-picker">
              <button
                v-for="color in penColors"
                :key="color"
                class="color-btn"
                :class="{ active: penColor === color }"
                :style="{ background: color }"
                @click="penColor = color"
              ></button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">画笔粗细</label>
            <div class="size-picker">
              <button
                v-for="size in penSizes"
                :key="size.value"
                class="size-btn"
                :class="{ active: penSize === size.value }"
                @click="penSize = size.value"
              >
                <span
                  class="size-dot"
                  :style="{ width: size.value + 'px', height: size.value + 'px' }"
                ></span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 签名画布 -->
      <section class="signature-card">
        <h2 class="section-title">手写签名</h2>
        <SignaturePad
          ref="padRef"
          :pen-color="penColor"
          :pen-size="penSize"
          @save="handleSave"
          @change="handleSignatureChange"
        />
      </section>

      <!-- 签名预览 -->
      <section v-if="savedSignature" class="preview-card">
        <h2 class="section-title">已保存签名</h2>
        <div class="signature-preview">
          <img :src="savedSignature" alt="签名预览" />
          <div class="preview-meta">
            <span>保存时间: {{ savedTime }}</span>
            <button class="btn-text" @click="savedSignature = ''">清除预览</button>
          </div>
        </div>
      </section>
    </main>

    <!-- 消息提示 -->
    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import SignaturePad from './components/SignaturePad.vue'
import {
  getSelection,
  getCurrentTable,
  getFieldMetaList,
  saveSignatureToRecord,
  checkEditable,
} from './api/bitable'
import type { IFieldMeta } from './types'
import { FieldType } from './types'
import { getTimestamp } from './utils/signature'

// 状态
const loading = ref(true)
const isBitableAvailable = ref(false)
const editable = ref(false)
const tableInfo = ref({ name: '' })
const currentRecordId = ref('')
const fields = ref<IFieldMeta[]>([])

// 签名设置
const targetField = ref('')
const penColor = ref('#1a1a1a')
const penSize = ref(2.5)
const padRef = ref<InstanceType<typeof SignaturePad>>()

// 签名预览
const savedSignature = ref('')
const savedTime = ref('')

// Toast 提示
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' | 'info' })

// 画笔颜色选项
const penColors = ['#1a1a1a', '#3370ff', '#e53935', '#4caf50']
const penSizes = [
  { value: 1.5, label: '细' },
  { value: 2.5, label: '中' },
  { value: 4, label: '粗' },
]

// 计算属性
const statusClass = computed(() => ({
  'status-connected': isBitableAvailable.value && editable.value,
  'status-readonly': isBitableAvailable.value && !editable.value,
  'status-disconnected': !isBitableAvailable.value,
}))

const statusText = computed(() => {
  if (!isBitableAvailable.value) return '未连接'
  if (!editable.value) return '只读模式'
  return '已连接'
})

// 生命周期
onMounted(async () => {
  await initBitable()
})

/** 初始化 Bitable 连接 */
async function initBitable() {
  loading.value = true
  try {
    // 检测 bitable 全局对象是否存在
    if (typeof bitable === 'undefined') {
      isBitableAvailable.value = false
      loading.value = false
      return
    }

    isBitableAvailable.value = true

    // 获取选择信息
    const selection = await getSelection()
    currentRecordId.value = selection.recordId || ''

    // 获取当前表格信息
    const table = await getCurrentTable()
    tableInfo.value = { name: table.name }

    // 检查编辑权限
    editable.value = await checkEditable()

    // 获取字段列表
    fields.value = await getFieldMetaList()

    // 自动选择第一个附件或文本字段
    const attachmentField = fields.value.find(
      (f) => f.type === FieldType.Attachment
    )
    if (attachmentField) {
      targetField.value = attachmentField.name
    } else {
      const textField = fields.value.find((f) => f.type === FieldType.Text)
      if (textField) {
        targetField.value = textField.name
      }
    }
  } catch (err) {
    console.error('初始化 Bitable 失败:', err)
    showToast('连接多维表格失败: ' + (err as Error).message, 'error')
  } finally {
    loading.value = false
  }
}

/** 处理签名保存 */
async function handleSave(dataUrl: string) {
  if (!targetField.value) {
    showToast('请先选择目标字段', 'error')
    return
  }

  if (!currentRecordId.value) {
    showToast('未选中记录，请在表格中选择一条记录', 'error')
    return
  }

  if (!editable.value) {
    showToast('当前为只读模式，无法保存', 'error')
    return
  }

  try {
    const field = fields.value.find((f) => f.name === targetField.value)
    const isAttachment = field?.type === FieldType.Attachment

    await saveSignatureToRecord(
      currentRecordId.value,
      targetField.value,
      dataUrl,
      isAttachment
    )

    savedSignature.value = dataUrl
    savedTime.value = getTimestamp()
    showToast('签名已保存到记录', 'success')
  } catch (err) {
    console.error('保存签名失败:', err)
    showToast('保存失败: ' + (err as Error).message, 'error')
  }
}

/** 签名变化回调 */
function handleSignatureChange(_isEmpty: boolean) {
  // 可以在这里添加逻辑，比如自动保存等
}

/** 获取字段类型标签 */
function getFieldTypeLabel(type: number): string {
  const labels: Record<number, string> = {
    [FieldType.Text]: '文本',
    [FieldType.Number]: '数字',
    [FieldType.SingleSelect]: '单选',
    [FieldType.MultiSelect]: '多选',
    [FieldType.DateTime]: '日期',
    [FieldType.Checkbox]: '复选框',
    [FieldType.Attachment]: '附件',
    [FieldType.Url]: '链接',
    [FieldType.Phone]: '电话',
    [FieldType.Progress]: '进度',
    [FieldType.Currency]: '货币',
    [FieldType.Rating]: '评分',
  }
  return labels[type] || '其他'
}

/** 显示 Toast 提示 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}
</script>

<style src="./styles/main.css"></style>
<style scoped>
.app-container {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 36px;
  height: 36px;
}

.header-title h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  font-size: 12px;
  color: #8f959e;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-connected {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-readonly {
  background: #fff3e0;
  color: #e65100;
}

.status-disconnected {
  background: #ffebee;
  color: #c62828;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: #8f959e;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #3370ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Main */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Notice */
.notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
}

.notice-warning {
  background: #fff8e1;
  border: 1px solid #ffe082;
  color: #8d6e63;
}

.notice-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #a1887f;
}

/* Info Card */
.info-card,
.settings-card,
.signature-card,
.preview-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.info-row + .info-row {
  border-top: 1px solid #f0f1f5;
}

.info-label {
  font-size: 13px;
  color: #8f959e;
}

.info-value {
  font-size: 14px;
  color: #1f2329;
  font-weight: 500;
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

/* Section Title */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin: 0 0 12px 0;
}

/* Form */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  gap: 24px;
}

.form-label {
  font-size: 13px;
  color: #8f959e;
  font-weight: 500;
}

.form-select {
  padding: 8px 12px;
  border: 1px solid #d0d4dc;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.form-select:focus {
  border-color: #3370ff;
}

/* Color Picker */
.color-picker {
  display: flex;
  gap: 8px;
}

.color-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-btn.active {
  border-color: #3370ff;
  transform: scale(1.1);
}

/* Size Picker */
.size-picker {
  display: flex;
  gap: 8px;
}

.size-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #d0d4dc;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.size-btn.active {
  border-color: #3370ff;
  background: #eef2ff;
}

.size-dot {
  display: block;
  background: #1a1a1a;
  border-radius: 50%;
}

/* Preview */
.signature-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signature-preview img {
  max-width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #8f959e;
}

.btn-text {
  background: none;
  border: none;
  color: #3370ff;
  cursor: pointer;
  font-size: 12px;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-success {
  background: #2e7d32;
}

.toast-error {
  background: #c62828;
}

.toast-info {
  background: #3370ff;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
