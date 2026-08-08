<template>
  <div class="h5-app">
    <!-- 水印层 -->
    <div
      v-if="watermarkStyle.backgroundImage"
      class="watermark-layer"
      :style="watermarkStyle"
    ></div>

    <!-- ========== 加载状态 ========== -->
    <div v-if="pageState === 'loading'" class="state-page">
      <div class="spinner"></div>
      <p class="state-text">加载中...</p>
    </div>

    <!-- ========== 错误状态 ========== -->
    <div v-else-if="pageState === 'error'" class="state-page">
      <div class="error-icon">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r="30" fill="#F54A45" />
          <path
            d="M32 18V38"
            stroke="#fff"
            stroke-width="3.5"
            stroke-linecap="round"
          />
          <circle cx="32" cy="46" r="2.5" fill="#fff" />
        </svg>
      </div>
      <p class="state-text">{{ errorMsg }}</p>
      <button class="retry-btn" @click="loadData">重新加载</button>
    </div>

    <!-- ========== 成功状态 ========== -->
    <div v-else-if="pageState === 'success'" class="state-page success-page">
      <div class="success-icon">
        <svg viewBox="0 0 64 64" width="72" height="72">
          <circle cx="32" cy="32" r="30" fill="#1DC981" />
          <path
            d="M20 33L28 41L44 25"
            stroke="#fff"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <p class="success-title">签字确认成功</p>
      <p class="success-desc">您的电子签名已提交成功</p>
      <button v-if="receiptUrl" class="receipt-btn" @click="viewReceipt">
        查看回执
      </button>
      <button class="close-btn" @click="handleClose">关闭页面</button>
    </div>

    <!-- ========== 主页面 ========== -->
    <template v-else-if="sessionData">
      <!-- 顶部导航栏 -->
      <header class="nav-bar">
        <button class="nav-btn" @click="handleClose" aria-label="关闭">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="#fff"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <span class="nav-title">签字确认</span>
        <button class="nav-btn" @click="handleMore" aria-label="更多">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <circle cx="5" cy="12" r="1.8" fill="#fff" />
            <circle cx="12" cy="12" r="1.8" fill="#fff" />
            <circle cx="19" cy="12" r="1.8" fill="#fff" />
          </svg>
        </button>
      </header>

      <!-- 内容区域 -->
      <main class="content" :class="{ 'has-bottom-bar': !sessionData.isSigned }">
        <!-- 确认单标题 + 状态标签 -->
        <div class="form-header">
          <div class="title-wrapper">
            <span class="title-bar"></span>
            <h1 class="form-title">{{ sessionData.formName }}</h1>
          </div>
          <span
            class="status-tag"
            :class="sessionData.isSigned ? 'tag-signed' : 'tag-pending'"
          >
            {{ sessionData.isSigned ? '已确认' : '待确认' }}
          </span>
        </div>

        <!-- 数据列表 -->
        <div class="card data-card">
          <div
            v-for="(field, index) in displayFields"
            :key="index"
            class="data-item"
            :class="{ 'no-border': index === displayFields.length - 1 }"
          >
            <span class="data-label">{{ field.label }}</span>
            <span class="data-value">{{ field.value }}</span>
          </div>
        </div>

        <!-- 已签字：展示签名图片 -->
        <template v-if="sessionData.isSigned">
          <div class="card signature-preview-card">
            <div class="card-title">电子签名</div>
            <div class="signature-preview">
              <img
                v-if="signatureUrl"
                :src="signatureUrl"
                alt="签名图片"
                class="signature-img"
              />
              <div v-else class="no-signature">
                <svg viewBox="0 0 48 48" width="32" height="32">
                  <path
                    d="M24 8v32M8 24h32"
                    stroke="#c9cdd4"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                <span>签名图片暂不可用</span>
              </div>
            </div>
            <div v-if="sessionData.signedAt" class="signed-time">
              <span class="time-label">签字时间</span>
              <span class="time-value">{{ formatTime(sessionData.signedAt) }}</span>
            </div>
            <div v-if="sessionData.currentSigner" class="signed-time">
              <span class="time-label">签字人</span>
              <span class="time-value">{{ sessionData.currentSigner.name }}</span>
            </div>
          </div>
        </template>

        <!-- 未签字：身份验证 + 签名区域 -->
        <template v-else>
          <!-- 身份验证 -->
          <div v-if="sessionData.verifyIdentity" class="card verify-card">
            <div class="card-title">身份验证</div>
            <div class="input-group">
              <div class="input-row">
                <input
                  v-model="phone"
                  type="tel"
                  maxlength="11"
                  placeholder="请输入手机号"
                  class="text-input"
                  inputmode="numeric"
                />
                <button
                  class="code-btn"
                  :disabled="countdown > 0 || !isPhoneValid"
                  @click="handleGetCode"
                >
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </button>
              </div>
              <input
                v-model="code"
                type="tel"
                maxlength="6"
                placeholder="请输入6位验证码"
                class="text-input"
                inputmode="numeric"
              />
            </div>
          </div>

          <!-- 签名区域 -->
          <div class="card signature-card">
            <div class="signature-header">
              <span class="card-title">签字确认</span>
              <span class="signature-hint">请在下方灰色区域内签字</span>
            </div>
            <SignaturePad
              ref="padRef"
              pen-color="#1a1a1a"
              :pen-size="3"
              background-color="#f5f6f8"
              @change="onSignatureChange"
            />
          </div>
        </template>
      </main>

      <!-- 底部提交按钮 -->
      <footer v-if="!sessionData.isSigned" class="bottom-bar">
        <button
          class="submit-btn"
          :disabled="!canSubmit || submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '提交中...' : '提交签字' }}
        </button>
      </footer>
    </template>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import SignaturePad from './components/SignaturePad.vue'
import { getSessionData, submitSignature, sendVerificationCode } from './api'
import type { SessionDetail } from '@shared/types'

// ========== 类型定义 ==========
type PageState = 'loading' | 'error' | 'form' | 'success'

// ========== 路由参数 ==========
const sessionId = ref('')
const recordId = ref('')

function parseRoute(): void {
  // 1. 尝试 query 参数
  const params = new URLSearchParams(window.location.search)
  const qSession = params.get('sessionId')
  const qRecord = params.get('recordId')
  if (qSession && qRecord) {
    sessionId.value = qSession
    recordId.value = qRecord
    return
  }

  // 2. 尝试 hash 路由
  const hash = window.location.hash.slice(1)
  if (hash.startsWith('/')) {
    const hashParts = hash.split('/').filter(Boolean)
    if (hashParts.length >= 2) {
      sessionId.value = hashParts[hashParts.length - 2]
      recordId.value = hashParts[hashParts.length - 1]
      return
    }
  }

  // 3. 尝试 path 路由: /h5/:sessionId/:recordId
  const pathname = window.location.pathname.replace(/\/+$/, '')
  const parts = pathname.split('/')
  const h5Index = parts.lastIndexOf('h5')
  if (h5Index !== -1 && parts[h5Index + 1] && parts[h5Index + 2]) {
    sessionId.value = parts[h5Index + 1]
    recordId.value = parts[h5Index + 2]
    return
  }

  // 4. 回退：取路径最后两段
  if (parts.length >= 2) {
    sessionId.value = parts[parts.length - 2] || ''
    recordId.value = parts[parts.length - 1] || ''
  }
}

// ========== 页面状态 ==========
const pageState = ref<PageState>('loading')
const errorMsg = ref('加载失败')
const sessionData = ref<SessionDetail | null>(null)
const signatureUrl = ref('')
const receiptUrl = ref('')

// ========== Toast ==========
const toastVisible = ref(false)
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string): void {
  toastMsg.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2500)
}

// ========== 身份验证 ==========
const phone = ref('')
const code = ref('')
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const isPhoneValid = computed(() => /^1\d{10}$/.test(phone.value))

async function handleGetCode(): Promise<void> {
  if (!isPhoneValid.value || countdown.value > 0) return
  try {
    await sendVerificationCode(sessionId.value, phone.value)
    showToast('验证码已发送')
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch (e) {
    showToast(e instanceof Error ? e.message : '发送验证码失败')
  }
}

// ========== 签名 ==========
const padRef = ref<InstanceType<typeof SignaturePad>>()
const signatureEmpty = ref(true)
const submitting = ref(false)

function onSignatureChange(empty: boolean): void {
  signatureEmpty.value = empty
}

const canSubmit = computed(() => {
  if (!sessionData.value || sessionData.value.isSigned) return false
  if (signatureEmpty.value) return false
  if (sessionData.value.verifyIdentity) {
    if (!isPhoneValid.value) return false
    if (!/^\d{6}$/.test(code.value)) return false
  }
  return true
})

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return

  const dataUrl = padRef.value?.save() || ''
  if (!dataUrl) {
    showToast('请先完成签名')
    return
  }

  submitting.value = true
  try {
    const result = await submitSignature(sessionId.value, {
      recordId: recordId.value,
      signatureData: dataUrl,
      signerPhone: phone.value || undefined,
      signerName: sessionData.value?.currentSigner?.name || '签字人',
    })
    receiptUrl.value = result.receiptUrl || ''
    pageState.value = 'success'
  } catch (e) {
    showToast(e instanceof Error ? e.message : '提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

// ========== 数据展示 ==========
const displayFields = computed(() => {
  if (!sessionData.value) return []
  const data = sessionData.value
  return data.fields
    .filter((f) => f.selected)
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      label: f.name,
      value: formatValue(data.recordData[f.id]),
    }))
})

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'boolean') return val ? '是' : '否'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map((v) => formatValue(v)).join(', ')
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text
    if (typeof obj.name === 'string') return obj.name
    return JSON.stringify(val)
  }
  return String(val)
}

// ========== 水印 ==========
const watermarkText = computed(() => {
  if (!sessionData.value) return ''
  const id = sessionData.value.sessionId.slice(-8).toUpperCase()
  return `电子签名 第${id}号`
})

const watermarkStyle = computed(() => {
  const text = watermarkText.value
  if (!text) return {} as Record<string, string>
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="200"><text x="30" y="110" fill="rgba(0,0,0,0.05)" font-size="15" font-family="PingFang SC, system-ui, sans-serif" transform="rotate(-25 140 100)">${text}</text></svg>`
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundRepeat: 'repeat',
  } as Record<string, string>
})

// ========== 操作 ==========
function handleClose(): void {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.close()
  }
}

function handleMore(): void {
  showToast('更多功能开发中')
}

function viewReceipt(): void {
  if (receiptUrl.value) {
    window.open(receiptUrl.value, '_blank')
  }
}

function formatTime(time: string): string {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return time
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ========== 数据加载 ==========
async function loadData(): Promise<void> {
  pageState.value = 'loading'
  try {
    const data = await getSessionData(sessionId.value, recordId.value)
    sessionData.value = data
    // 服务器可能返回额外的 signatureUrl 字段
    const ext = data as SessionDetail & { signatureUrl?: string }
    signatureUrl.value = ext.signatureUrl || ''
    pageState.value = 'form'
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '加载失败，请稍后重试'
    pageState.value = 'error'
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  parseRoute()
  loadData()
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
/* ========== 根容器 ========== */
.h5-app {
  position: relative;
  min-height: 100vh;
  background: #f5f6f8;
}

/* ========== 水印层 ========== */
.watermark-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
}

@media (min-width: 481px) {
  .watermark-layer {
    max-width: 480px;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* ========== 状态页面（加载/错误/成功） ========== */
.state-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  text-align: center;
}

.state-text {
  margin-top: 20px;
  font-size: 15px;
  color: #8f959e;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e5e6eb;
  border-top-color: #3370ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.retry-btn {
  margin-top: 24px;
  padding: 10px 32px;
  background: #3370ff;
  color: #fff;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  transition: background 0.2s;
}

.retry-btn:active {
  background: #245bdb;
}

/* ========== 成功页面 ========== */
.success-page {
  background: #fff;
}

.success-icon {
  margin-bottom: 8px;
  animation: pop-in 0.4s ease;
}

@keyframes pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.success-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
  margin-top: 16px;
}

.success-desc {
  font-size: 14px;
  color: #8f959e;
  margin-top: 8px;
}

.receipt-btn {
  margin-top: 32px;
  padding: 12px 40px;
  background: #3370ff;
  color: #fff;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  transition: background 0.2s;
}

.receipt-btn:active {
  background: #245bdb;
}

.close-btn {
  margin-top: 16px;
  padding: 12px 40px;
  background: #f2f3f5;
  color: #4e5969;
  border-radius: 8px;
  font-size: 15px;
  transition: background 0.2s;
}

.close-btn:active {
  background: #e5e6eb;
}

/* ========== 导航栏 ========== */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 8px;
  padding-top: env(safe-area-inset-top, 0px);
  background: #1f2329;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  transition: background 0.2s;
}

.nav-btn:active {
  background: rgba(255, 255, 255, 0.12);
}

/* ========== 内容区域 ========== */
.content {
  padding: 16px;
  padding-bottom: 100px;
}

.content.has-bottom-bar {
  padding-bottom: 100px;
}

/* ========== 确认单标题 ========== */
.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.title-bar {
  flex-shrink: 0;
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: #3370ff;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-tag {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tag-pending {
  background: #f2f3f5;
  color: #8f959e;
}

.tag-signed {
  background: rgba(29, 201, 129, 0.1);
  color: #1dc981;
}

/* ========== 卡片通用样式 ========== */
.card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 12px;
}

/* ========== 数据列表 ========== */
.data-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 13px 0;
  border-bottom: 1px solid #f2f3f5;
}

.data-item.no-border {
  border-bottom: none;
  padding-bottom: 4px;
}

.data-item:first-child {
  padding-top: 4px;
}

.data-label {
  flex-shrink: 0;
  font-size: 14px;
  color: #8f959e;
  max-width: 40%;
}

.data-value {
  font-size: 14px;
  color: #1f2329;
  text-align: right;
  word-break: break-word;
  flex: 1;
}

/* ========== 身份验证 ========== */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.text-input {
  flex: 1;
  height: 44px;
  padding: 0 14px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 15px;
  color: #1f2329;
  transition: background 0.2s;
}

.text-input::placeholder {
  color: #c9cdd4;
}

.text-input:focus {
  background: #f0f1f5;
}

.code-btn {
  flex-shrink: 0;
  height: 44px;
  padding: 0 14px;
  background: rgba(51, 112, 255, 0.08);
  color: #3370ff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
}

.code-btn:disabled {
  color: #c9cdd4;
  background: #f2f3f5;
}

/* ========== 签名区域 ========== */
.signature-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.signature-header .card-title {
  margin-bottom: 0;
}

.signature-hint {
  font-size: 13px;
  color: #8f959e;
}

/* ========== 签名预览（已签字） ========== */
.signature-preview-card {
  padding: 16px;
}

.signature-preview {
  width: 100%;
  min-height: 160px;
  border-radius: 8px;
  background: #f7f8fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #f2f3f5;
}

.signature-img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.no-signature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #c9cdd4;
  font-size: 13px;
}

.signed-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f2f3f5;
}

.time-label {
  font-size: 14px;
  color: #8f959e;
}

.time-value {
  font-size: 14px;
  color: #1f2329;
}

/* ========== 底部提交栏 ========== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid #f2f3f5;
}

@media (min-width: 481px) {
  .bottom-bar {
    max-width: 480px;
    left: 50%;
    transform: translateX(-50%);
  }
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: #3370ff;
  color: #fff;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: #245bdb;
}

.submit-btn:disabled {
  background: #c9cdd4;
  color: #fff;
}

/* ========== Toast ========== */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  z-index: 10000;
  max-width: 80%;
  text-align: center;
  line-height: 1.5;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
