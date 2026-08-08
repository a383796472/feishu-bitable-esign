<template>
  <div class="widget-app">
    <!-- ========== 顶部标题栏 ========== -->
    <header class="app-header">
      <div class="header-left">
        <div class="header-titles">
          <h1 class="app-title">签字确认</h1>
          <p class="app-subtitle">对多维表中数据进行签字确认</p>
        </div>
      </div>
      <div class="header-right">
        <span
          class="status-badge"
          :class="`status-${connectionStatus}`"
        >
          <span class="status-dot"></span>
          {{ statusText }}
        </span>
        <button class="close-btn" @click="handleClose" aria-label="关闭">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="#8f959e"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- ========== 步骤指示器 ========== -->
    <StepIndicator :current-step="currentStep" />

    <!-- ========== 主内容区域 ========== -->
    <main class="app-content">
      <!-- 加载中 -->
      <div v-if="initializing" class="state-page">
        <div class="spinner"></div>
        <p class="state-text">正在连接多维表格...</p>
      </div>

      <!-- Step 1: 字段选择 -->
      <FieldSelector
        v-else-if="currentStep === 1"
        v-model="selectedFieldIds"
        v-model:fields="fields"
        v-model:table-id="currentTableId"
        v-model:hide-empty="hideEmpty"
        v-model:hide-zero="hideZero"
        :tables="tables"
        @update:table-id="onTableChange"
      />

      <!-- Step 2: 确认单配置 -->
      <FormConfig
        v-else-if="currentStep === 2"
        v-model:form-name="formName"
        v-model:sign-mode="signMode"
        v-model:verify-identity="verifyIdentity"
        v-model:signers="signers"
      />

      <!-- Step 3: 二维码结果 -->
      <QrResult
        v-else-if="currentStep === 3"
        :qr-code-url="qrCodeUrl"
        :share-url="shareUrl"
        :form-name="displayFormName"
        @copy-link="onCopyLink"
        @download-qr="onDownloadQr"
      />
    </main>

    <!-- ========== 底部按钮栏 ========== -->
    <footer class="app-footer">
      <!-- Step 1 -->
      <template v-if="currentStep === 1">
        <button class="btn btn-secondary" @click="handlePreview">
          在线预览
        </button>
        <button
          class="btn btn-primary"
          :disabled="selectedFieldIds.length === 0"
          @click="goNext"
        >
          下一步
        </button>
      </template>

      <!-- Step 2 -->
      <template v-else-if="currentStep === 2">
        <button class="btn btn-secondary" @click="goPrev">
          上一步
        </button>
        <button
          class="btn btn-primary"
          :disabled="creating"
          @click="handleCreate"
        >
          {{ creating ? '创建中...' : '创建' }}
        </button>
      </template>

      <!-- Step 3 -->
      <template v-else-if="currentStep === 3">
        <button class="btn btn-secondary" @click="handleRestart">
          重新创建
        </button>
        <button class="btn btn-primary" @click="handleClose">
          完成
        </button>
      </template>
    </footer>

    <!-- ========== Toast 提示 ========== -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StepIndicator from './components/StepIndicator.vue'
import FieldSelector from './components/FieldSelector.vue'
import FormConfig from './components/FormConfig.vue'
import QrResult from './components/QrResult.vue'
import type { IFieldMeta, ITable } from './types/bitable'
import {
  isBitableAvailable,
  getSelection,
  getTableList,
  getTableMetaList,
  getFieldMetaList,
  getRecordIdList,
  checkEditable,
} from './api/bitable'
import { createSession } from './api/server'
import type { Signer, SignMode, FieldConfig } from '@shared/types'

// ========== 步骤控制 ==========
const currentStep = ref(1)
const initializing = ref(true)
const creating = ref(false)

// ========== 连接状态 ==========
const connectionStatus = ref<'connected' | 'readonly' | 'disconnected'>(
  'disconnected'
)
const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '已连接'
    case 'readonly':
      return '只读'
    default:
      return '未连接'
  }
})

// ========== Bitable 数据 ==========
const tables = ref<{ tableId: string; name: string }[]>([])
const currentTableId = ref('')
const fields = ref<IFieldMeta[]>([])
const recordIds = ref<string[]>([])

// ========== Step 1 状态 ==========
const selectedFieldIds = ref<string[]>([])
const hideEmpty = ref(false)
const hideZero = ref(false)

// ========== Step 2 状态 ==========
const formName = ref('')
const signMode = ref<SignMode>('single')
const verifyIdentity = ref(false)
const signers = ref<Signer[]>([
  { id: 'signer_default', name: '', phone: '' },
])

// ========== Step 3 状态 ==========
const qrCodeUrl = ref('')
const shareUrl = ref('')

// ========== 显示用计算属性 ==========
const displayFormName = computed(
  () => formName.value || defaultFormName.value
)

const defaultFormName = computed(() => {
  const tableName =
    tables.value.find((t) => t.tableId === currentTableId.value)?.name || ''
  return tableName ? `${tableName}签字确认单` : '签字确认单'
})

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

// ========== 初始化 ==========
async function initBitable(): Promise<void> {
  initializing.value = true

  if (!isBitableAvailable()) {
    initMockData()
    connectionStatus.value = 'disconnected'
    initializing.value = false
    return
  }

  try {
    const editable = await checkEditable()
    connectionStatus.value = editable ? 'connected' : 'readonly'

    const tableMetaList = await getTableMetaList()
    tables.value = tableMetaList

    const selection = await getSelection()
    currentTableId.value = selection.tableId

    const fieldMetaList = await getFieldMetaList()
    fields.value = fieldMetaList

    const ids = await getRecordIdList()
    recordIds.value = ids

    // 默认选中所有字段
    selectedFieldIds.value = fieldMetaList.map((f) => f.id)
  } catch (e) {
    showToast(e instanceof Error ? e.message : '初始化失败，使用模拟数据')
    initMockData()
    connectionStatus.value = 'disconnected'
  } finally {
    initializing.value = false
  }
}

/** 开发模式模拟数据 */
function initMockData(): void {
  tables.value = [
    { tableId: 'tbl_mock1', name: '销售订单' },
    { tableId: 'tbl_mock2', name: '客户信息' },
    { tableId: 'tbl_mock3', name: '合同台账' },
  ]
  currentTableId.value = 'tbl_mock1'
  loadMockFields('tbl_mock1')
  recordIds.value = ['rec_001', 'rec_002', 'rec_003', 'rec_004', 'rec_005']
}

/** 根据数据表 ID 加载模拟字段 */
function loadMockFields(tableId: string): void {
  const mockFieldsMap: Record<string, IFieldMeta[]> = {
    tbl_mock1: [
      { id: 'fld1', name: '订单编号', type: 1, property: {} },
      { id: 'fld2', name: '客户名称', type: 1, property: {} },
      { id: 'fld3', name: '订单金额', type: 2, property: {} },
      { id: 'fld4', name: '下单日期', type: 5, property: {} },
      { id: 'fld5', name: '是否付款', type: 7, property: {} },
      { id: 'fld6', name: '销售负责人', type: 11, property: {} },
    ],
    tbl_mock2: [
      { id: 'fld_a', name: '客户名称', type: 1, property: {} },
      { id: 'fld_b', name: '联系电话', type: 13, property: {} },
      { id: 'fld_c', name: '客户等级', type: 3, property: {} },
      { id: 'fld_d', name: '合同金额', type: 100002, property: {} },
    ],
    tbl_mock3: [
      { id: 'fld_x', name: '合同编号', type: 1, property: {} },
      { id: 'fld_y', name: '签约方', type: 1, property: {} },
      { id: 'fld_z', name: '合同状态', type: 3, property: {} },
      { id: 'fld_w', name: '附件', type: 17, property: {} },
    ],
  }
  fields.value = mockFieldsMap[tableId] || mockFieldsMap['tbl_mock1']
  selectedFieldIds.value = fields.value.map((f) => f.id)
}

// ========== 数据表切换 ==========
async function onTableChange(tableId: string): Promise<void> {
  currentTableId.value = tableId

  if (!isBitableAvailable()) {
    loadMockFields(tableId)
    return
  }

  try {
    const tableList = await getTableList()
    const table = tableList.find((t) => t.tableId === tableId)
    if (table) {
      await loadTableData(table)
    }
  } catch {
    showToast('切换数据表失败')
  }
}

/** 从 ITable 实例加载字段和记录 */
async function loadTableData(table: ITable): Promise<void> {
  const fieldMetaList = await table.getFieldMetaList()
  fields.value = fieldMetaList
  selectedFieldIds.value = fieldMetaList.map((f) => f.id)
  recordIds.value = await table.getRecordIdList()
}

// ========== 步骤导航 ==========
function goNext(): void {
  if (currentStep.value === 1) {
    if (selectedFieldIds.value.length === 0) {
      showToast('请至少选择一个字段')
      return
    }
    currentStep.value = 2
  }
}

function goPrev(): void {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// ========== 创建确认单 ==========
async function handleCreate(): Promise<void> {
  if (creating.value) return

  // 多人模式校验
  if (signMode.value === 'multi') {
    const validSigners = signers.value.filter((s) => s.name.trim())
    if (validSigners.length === 0) {
      showToast('请至少添加一位签字人')
      return
    }
    if (verifyIdentity.value) {
      const hasInvalidPhone = validSigners.some(
        (s) => !s.phone || !/^1\d{10}$/.test(s.phone)
      )
      if (hasInvalidPhone) {
        showToast('验证身份模式下，所有签字人需填写有效手机号')
        return
      }
    }
  }

  creating.value = true

  // 开发模式：模拟创建结果
  if (!isBitableAvailable()) {
    setTimeout(() => {
      mockCreateResult()
      creating.value = false
    }, 800)
    return
  }

  try {
    const tableName =
      tables.value.find((t) => t.tableId === currentTableId.value)?.name || ''

    const selectedFields: FieldConfig[] = fields.value
      .filter((f) => selectedFieldIds.value.includes(f.id))
      .map((f, index) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        selected: true,
        order: index,
      }))

    const response = await createSession({
      appToken: '',
      tableId: currentTableId.value,
      tableName,
      fields: selectedFields,
      formName: displayFormName.value,
      signMode: signMode.value,
      verifyIdentity: verifyIdentity.value,
      signers:
        signMode.value === 'multi'
          ? signers.value.filter((s) => s.name.trim())
          : [],
      recordIds: recordIds.value,
    })

    qrCodeUrl.value = response.qrCodeUrl
    shareUrl.value = response.shareUrl
    currentStep.value = 3
  } catch (e) {
    showToast(e instanceof Error ? e.message : '创建失败，请重试')
  } finally {
    creating.value = false
  }
}

/** 模拟创建结果（开发模式） */
function mockCreateResult(): void {
  qrCodeUrl.value = generateMockQrCode()
  const mockSessionId = `mock_${Date.now()}`
  shareUrl.value = `${window.location.origin.replace(
    /:\d+$/,
    ':5174'
  )}/?sessionId=${mockSessionId}&recordId=rec_001`
  currentStep.value = 3
  showToast('（模拟环境）确认单已创建')
}

/** 生成模拟二维码 SVG */
function generateMockQrCode(): string {
  const size = 25
  const cell = 8
  const total = size * cell
  let rects = ''

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isCorner =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7)

      if (isCorner) {
        const cx = x < 7 ? x : x - (size - 7)
        const cy = y < 7 ? y : y - (size - 7)
        const isBorder = cx === 0 || cx === 6 || cy === 0 || cy === 6
        const isInner = cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4
        if (isBorder || isInner) {
          rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#1f2329"/>`
        }
      } else {
        if ((x * 7 + y * 13 + x * y * 3) % 3 === 0) {
          rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#1f2329"/>`
        }
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#fff"/>${rects}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// ========== 在线预览 ==========
function handlePreview(): void {
  if (selectedFieldIds.value.length === 0) {
    showToast('请先选择至少一个字段')
    return
  }
  showToast('预览功能：将打开签字确认 H5 页面预览效果')
}

// ========== 重新创建 ==========
function handleRestart(): void {
  currentStep.value = 1
  qrCodeUrl.value = ''
  shareUrl.value = ''
}

// ========== QrResult 事件 ==========
function onCopyLink(url: string): void {
  if (url) {
    showToast('链接已复制到剪贴板')
  }
}

function onDownloadQr(_url: string): void {
  showToast('二维码已开始下载')
}

// ========== 关闭 ==========
function handleClose(): void {
  if (isBitableAvailable()) {
    // 在飞书环境中，尝试关闭 Widget
    // bitable SDK 可能提供关闭方法，此处降级处理
    showToast('请通过多维表格关闭此插件')
  } else {
    window.close()
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  initBitable()
})
</script>

<style scoped>
.widget-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f6f8;
}

/* ========== 顶部标题栏 ========== */
.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #f2f3f5;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2329;
  line-height: 1.3;
}

.app-subtitle {
  font-size: 13px;
  color: #8f959e;
  line-height: 1.4;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 连接状态徽标 */
.status-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-connected {
  background: rgba(29, 201, 129, 0.1);
  color: #1dc981;
}

.status-connected .status-dot {
  background: #1dc981;
}

.status-readonly {
  background: rgba(255, 159, 22, 0.1);
  color: #ff9f16;
}

.status-readonly .status-dot {
  background: #ff9f16;
}

.status-disconnected {
  background: #f2f3f5;
  color: #8f959e;
}

.status-disconnected .status-dot {
  background: #c9cdd4;
}

/* 关闭按钮 */
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f2f3f5;
}

/* ========== 主内容区域 ========== */
.app-content {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

/* 加载状态 */
.state-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
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

.state-text {
  margin-top: 16px;
  font-size: 14px;
  color: #8f959e;
}

/* ========== 底部按钮栏 ========== */
.app-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid #f2f3f5;
}

.btn {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-secondary {
  background: #f0f1f5;
  color: #4e5969;
}

.btn-secondary:active:not(:disabled) {
  background: #e3e4e8;
}

.btn-primary {
  background: #3370ff;
  color: #fff;
}

.btn-primary:active:not(:disabled) {
  background: #245bdb;
}

.btn-primary:disabled {
  background: #c9cdd4;
  color: #fff;
  cursor: not-allowed;
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
