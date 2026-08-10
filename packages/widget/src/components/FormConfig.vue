<template>
  <div class="form-config">
    <!-- 确认单名称 -->
    <div class="card">
      <div class="card-title">确认单名称</div>
      <input
        :value="formName"
        type="text"
        class="text-input"
        placeholder="请输入确认单名称"
        maxlength="50"
        @input="emit('update:formName', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 签字模式 -->
    <div class="card">
      <div class="card-title">签字模式</div>
      <div class="mode-buttons">
        <button
          class="mode-btn"
          :class="{ active: signMode === 'single' }"
          @click="emit('update:signMode', 'single')"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" class="mode-icon">
            <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>单人签字</span>
        </button>
        <button
          class="mode-btn"
          :class="{ active: signMode === 'multi' }"
          @click="emit('update:signMode', 'multi')"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" class="mode-icon">
            <circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
            <circle cx="16" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M3 19c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5M11 19c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>会签（多人）</span>
        </button>
      </div>
      <p v-if="signMode === 'multi'" class="mode-tip">
        会签模式：所有签字人独立签字，谁签完即回写到表格，无需等待全部签完
      </p>
    </div>

    <!-- 验证身份 -->
    <div class="card">
      <label class="option-item" @click.stop>
        <input
          type="checkbox"
          :checked="verifyIdentity"
          class="checkbox-input"
          @change="emit('update:verifyIdentity', ($event.target as HTMLInputElement).checked)"
        />
        <span class="checkbox-box">
          <svg
            v-if="verifyIdentity"
            viewBox="0 0 24 24"
            width="12"
            height="12"
            class="check-svg"
          >
            <path
              d="M5 12.5L10 17L19 7"
              fill="none"
              stroke="#fff"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="option-content">
          <span class="option-label">身份验证（手机号匹配，免费）</span>
          <span class="option-desc">签字人输入手机号，与表格中手机号匹配后即可签字，无需短信费用</span>
        </span>
      </label>

      <!-- 手机号字段选择 -->
      <div v-if="verifyIdentity" class="sub-config">
        <label class="input-label">选择手机号字段</label>
        <select
          :value="phoneField"
          class="select-input"
          @change="emit('update:phoneField', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">请选择手机号字段</option>
          <option v-for="field in availableFields" :key="field.id" :value="field.name">
            {{ field.name }}
          </option>
        </select>
        <p class="field-hint">选择表格中存储手机号的字段，用于签字人身份匹配</p>
      </div>
    </div>

    <!-- 回写字段配置 -->
    <div class="card">
      <div class="card-title">回写字段配置</div>
      <p class="config-desc">签字完成后，系统将自动回写以下字段到多维表格</p>
      <div class="sub-config">
        <label class="input-label">签字状态字段名</label>
        <input
          :value="statusField"
          type="text"
          class="text-input"
          placeholder="签字状态"
          @input="emit('update:statusField', ($event.target as HTMLInputElement).value)"
        />
        <p class="field-hint">写入值：未签 / 已签 / 部分已签 / 全部已签</p>
      </div>
      <div class="sub-config">
        <label class="input-label">签名图片字段名</label>
        <input
          :value="signatureField"
          type="text"
          class="text-input"
          placeholder="签名图片"
          @input="emit('update:signatureField', ($event.target as HTMLInputElement).value)"
        />
        <p class="field-hint">签名图片将作为附件写入该字段</p>
      </div>
    </div>

    <!-- 签字人列表（多人模式） -->
    <div v-if="signMode === 'multi'" class="card">
      <div class="card-title">
        签字人列表
        <span class="signer-count">（{{ signers.length }}人）</span>
      </div>

      <div class="signer-list">
        <div
          v-for="(signer, index) in signers"
          :key="signer.id"
          class="signer-item"
        >
          <div class="signer-index">{{ index + 1 }}</div>
          <div class="signer-fields">
            <div class="input-group">
              <label class="input-label">签字人姓名</label>
              <input
                :value="signer.name"
                type="text"
                class="text-input"
                placeholder="请输入签字人姓名"
                @input="updateSigner(index, 'name', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="input-group">
              <label class="input-label">手机号{{ verifyIdentity ? '（必填，用于身份验证）' : '（选填）' }}</label>
              <input
                :value="signer.phone || ''"
                type="tel"
                class="text-input"
                placeholder="请输入手机号"
                maxlength="11"
                inputmode="numeric"
                @input="updateSigner(index, 'phone', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
          <button
            v-if="signers.length > 1"
            class="remove-btn"
            @click="removeSigner(index)"
            aria-label="删除签字人"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="#8f959e"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <button class="add-signer-btn" @click="addSigner">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path
            d="M12 5v14M5 12h14"
            stroke="#3370ff"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        增加签字人
      </button>
    </div>

    <!-- 单人模式提示 -->
    <div v-else class="card mode-hint-card">
      <svg viewBox="0 0 24 24" width="20" height="20" class="hint-icon">
        <circle cx="12" cy="12" r="9" fill="none" stroke="#3370ff" stroke-width="1.8" />
        <path d="M12 8v4M12 16h.01" stroke="#3370ff" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span class="hint-text">单人签字模式下，所有记录由同一人完成签字确认</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Signer, SignMode, FieldConfig } from '@shared/types'

const props = defineProps<{
  /** 确认单名称 */
  formName: string
  /** 签字模式 */
  signMode: SignMode
  /** 是否验证身份 */
  verifyIdentity: boolean
  /** 签字人列表 */
  signers: Signer[]
  /** 可选字段列表 (用于手机号字段选择) */
  availableFields: FieldConfig[]
  /** 手机号字段名 */
  phoneField: string
  /** 签字状态回写字段名 */
  statusField: string
  /** 签名图片回写字段名 */
  signatureField: string
}>()

const emit = defineEmits<{
  (e: 'update:formName', value: string): void
  (e: 'update:signMode', value: SignMode): void
  (e: 'update:verifyIdentity', value: boolean): void
  (e: 'update:signers', value: Signer[]): void
  (e: 'update:phoneField', value: string): void
  (e: 'update:statusField', value: string): void
  (e: 'update:signatureField', value: string): void
}>()

// ========== 签字人操作 ==========
function updateSigner(
  index: number,
  field: 'name' | 'phone',
  value: string
): void {
  const newSigners = [...props.signers]
  newSigners[index] = { ...newSigners[index], [field]: value }
  emit('update:signers', newSigners)
}

function addSigner(): void {
  const newSigner: Signer = {
    id: `signer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    phone: '',
  }
  emit('update:signers', [...props.signers, newSigner])
}

function removeSigner(index: number): void {
  const newSigners = [...props.signers]
  newSigners.splice(index, 1)
  emit('update:signers', newSigners)
}
</script>

<style scoped>
.form-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 12px;
}

.signer-count {
  font-size: 13px;
  font-weight: 400;
  color: #8f959e;
}

/* 输入框 */
.text-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2329;
  transition: background 0.2s;
}

.text-input::placeholder {
  color: #c9cdd4;
}

.text-input:focus {
  background: #f0f1f5;
}

/* 下拉选择 */
.select-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2329;
  border: none;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238f959e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.select-input:focus {
  background-color: #f0f1f5;
}

/* 签字模式按钮 */
.mode-buttons {
  display: flex;
  gap: 12px;
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border: 1.5px solid #e5e6eb;
  border-radius: 10px;
  font-size: 14px;
  color: #4e5969;
  transition: all 0.2s;
}

.mode-btn:active {
  transform: scale(0.98);
}

.mode-btn.active {
  border-color: #3370ff;
  background: rgba(51, 112, 255, 0.05);
  color: #3370ff;
}

.mode-icon {
  flex-shrink: 0;
}

.mode-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #8f959e;
  line-height: 1.5;
}

/* 复选框选项 */
.option-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid #d0d4dc;
  background: #fff;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 1px;
}

.checkbox-input:checked + .checkbox-box {
  background: #3370ff;
  border-color: #3370ff;
}

.check-svg {
  display: block;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-label {
  font-size: 14px;
  color: #1f2329;
}

.option-desc {
  font-size: 12px;
  color: #8f959e;
}

/* 子配置区域 */
.sub-config {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f2f3f5;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-desc {
  font-size: 12px;
  color: #8f959e;
  margin-bottom: 4px;
}

.input-label {
  font-size: 12px;
  color: #8f959e;
}

.field-hint {
  font-size: 11px;
  color: #c9cdd4;
  line-height: 1.4;
}

/* 签字人列表 */
.signer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.signer-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.signer-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3370ff;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 6px;
}

.signer-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-top: 6px;
  transition: background 0.2s;
}

.remove-btn:hover {
  background: rgba(245, 74, 69, 0.08);
}

.remove-btn:hover svg path {
  stroke: #f54a45;
}

/* 增加签字人 */
.add-signer-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 8px 0;
  color: #3370ff;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.add-signer-btn:active {
  opacity: 0.7;
}

/* 单人模式提示 */
.mode-hint-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hint-icon {
  flex-shrink: 0;
}

.hint-text {
  font-size: 13px;
  color: #8f959e;
  line-height: 1.5;
}
</style>
