<template>
  <div class="field-selector">
    <!-- 数据表选择 -->
    <div class="card">
      <div class="card-title">数据表</div>
      <div class="select-wrapper">
        <select
          :value="tableId"
          class="table-select"
          @change="onTableChange"
        >
          <option
            v-for="t in tables"
            :key="t.tableId"
            :value="t.tableId"
          >
            {{ t.name }}
          </option>
        </select>
        <svg viewBox="0 0 24 24" width="16" height="16" class="select-arrow">
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="#8f959e"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <!-- 确认单内容 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">确认单内容</span>
        <span class="count-text">
          共计：{{ fields.length }}个，已选中：{{ selectedCount }}个
        </span>
      </div>

      <!-- 字段列表（可拖拽排序） -->
      <div class="field-list">
        <div
          v-for="(field, index) in fields"
          :key="field.id"
          class="field-item"
          :class="{
            dragging: dragIndex === index,
            'drag-over': dragOverIndex === index && dragIndex !== index,
            checked: modelValue.includes(field.id),
          }"
          draggable="true"
          @dragstart="onDragStart($event, index)"
          @dragover.prevent="onDragOver(index)"
          @dragleave="onDragLeave"
          @drop.prevent="onDrop(index)"
          @dragend="onDragEnd"
        >
          <!-- 拖拽手柄 -->
          <span class="drag-handle">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <circle cx="9" cy="6" r="1.4" fill="#c9cdd4" />
              <circle cx="15" cy="6" r="1.4" fill="#c9cdd4" />
              <circle cx="9" cy="12" r="1.4" fill="#c9cdd4" />
              <circle cx="15" cy="12" r="1.4" fill="#c9cdd4" />
              <circle cx="9" cy="18" r="1.4" fill="#c9cdd4" />
              <circle cx="15" cy="18" r="1.4" fill="#c9cdd4" />
            </svg>
          </span>

          <!-- 复选框 -->
          <label class="checkbox-wrapper" @click.stop>
            <input
              type="checkbox"
              :checked="modelValue.includes(field.id)"
              class="checkbox-input"
              @change="toggleField(field.id)"
            />
            <span class="checkbox-box">
              <svg
                v-if="modelValue.includes(field.id)"
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
          </label>

          <!-- 字段类型图标 -->
          <span class="field-type-icon">{{ getFieldIcon(field.type) }}</span>

          <!-- 字段名称 -->
          <span class="field-name">{{ field.name }}</span>

          <!-- 字段类型标签 -->
          <span class="field-type-label">{{ getFieldTypeName(field.type) }}</span>
        </div>
      </div>
    </div>

    <!-- 隐藏选项 -->
    <div class="card">
      <label class="option-item" @click.stop>
        <input
          type="checkbox"
          :checked="hideEmpty"
          class="checkbox-input"
          @change="emit('update:hideEmpty', ($event.target as HTMLInputElement).checked)"
        />
        <span class="checkbox-box">
          <svg
            v-if="hideEmpty"
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
        <span class="option-label">隐藏为空数据项</span>
      </label>
      <label class="option-item" @click.stop>
        <input
          type="checkbox"
          :checked="hideZero"
          class="checkbox-input"
          @change="emit('update:hideZero', ($event.target as HTMLInputElement).checked)"
        />
        <span class="checkbox-box">
          <svg
            v-if="hideZero"
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
        <span class="option-label">隐藏为0数据项</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { IFieldMeta } from '../types/bitable'

interface TableMeta {
  tableId: string
  name: string
}

const props = defineProps<{
  /** 全部字段列表（顺序即为确认单展示顺序） */
  fields: IFieldMeta[]
  /** 已选中的字段 ID 列表 */
  modelValue: string[]
  /** 数据表列表 */
  tables: TableMeta[]
  /** 当前选中的数据表 ID */
  tableId: string
  /** 是否隐藏为空数据项 */
  hideEmpty: boolean
  /** 是否隐藏为0数据项 */
  hideZero: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'update:fields', value: IFieldMeta[]): void
  (e: 'update:tableId', value: string): void
  (e: 'update:hideEmpty', value: boolean): void
  (e: 'update:hideZero', value: boolean): void
}>()

const selectedCount = computed(() => props.modelValue.length)

// ========== 字段类型映射 ==========
const TYPE_ICON_MAP: Record<number, string> = {
  1: 'T', // Text
  2: '#', // Number
  3: '◉', // SingleSelect
  4: '☰', // MultiSelect
  5: '📅', // DateTime
  7: '✓', // Checkbox
  11: '👤', // User
  13: '📞', // Phone
  15: '🔗', // Url
  17: '📎', // Attachment
  18: '→', // SingleLink
  19: '⇄', // Lookup
  20: 'ƒ', // Formula
  21: '⇄', // DuplexLink
  22: '📍', // Location
  23: '💬', // GroupChat
  1001: '🕒', // CreatedTime
  1002: '🕒', // ModifiedTime
  1003: '👤', // CreatedUser
  1004: '👤', // ModifiedUser
  1005: '#', // AutoNumber
  100001: '%', // Progress
  100002: '¥', // Currency
  100003: '★', // Rating
}

const TYPE_NAME_MAP: Record<number, string> = {
  1: '文本',
  2: '数字',
  3: '单选',
  4: '多选',
  5: '日期',
  7: '复选框',
  11: '人员',
  13: '电话',
  15: '超链接',
  17: '附件',
  18: '关联',
  19: '查找引用',
  20: '公式',
  21: '双向关联',
  22: '地理位置',
  23: '群组',
  1001: '创建时间',
  1002: '修改时间',
  1003: '创建人',
  1004: '修改人',
  1005: '自动编号',
  100001: '进度',
  100002: '货币',
  100003: '评分',
}

function getFieldIcon(type: number): string {
  return TYPE_ICON_MAP[type] || '·'
}

function getFieldTypeName(type: number): string {
  return TYPE_NAME_MAP[type] || '自定义'
}

// ========== 字段选择 ==========
function toggleField(fieldId: string): void {
  const current = [...props.modelValue]
  const idx = current.indexOf(fieldId)
  if (idx > -1) {
    current.splice(idx, 1)
  } else {
    current.push(fieldId)
  }
  emit('update:modelValue', current)
}

// ========== 数据表切换 ==========
function onTableChange(e: Event): void {
  const target = e.target as HTMLSelectElement
  emit('update:tableId', target.value)
}

// ========== 拖拽排序 ==========
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(e: DragEvent, index: number): void {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // Firefox 需要设置 data 才能触发拖拽
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number): void {
  dragOverIndex.value = index
}

function onDragLeave(): void {
  // 不立即清除，避免子元素跳动
}

function onDrop(targetIndex: number): void {
  if (dragIndex.value === null || dragIndex.value === targetIndex) {
    onDragEnd()
    return
  }
  const newFields = [...props.fields]
  const [moved] = newFields.splice(dragIndex.value, 1)
  newFields.splice(targetIndex, 0, moved)
  emit('update:fields', newFields)
  onDragEnd()
}

function onDragEnd(): void {
  dragIndex.value = null
  dragOverIndex.value = null
}
</script>

<style scoped>
.field-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 卡片 */
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
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.count-text {
  font-size: 13px;
  color: #8f959e;
}

/* 数据表下拉 */
.select-wrapper {
  position: relative;
  margin-top: 10px;
}

.table-select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 12px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2329;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: background 0.2s;
}

.table-select:focus {
  background: #f0f1f5;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

/* 字段列表 */
.field-list {
  display: flex;
  flex-direction: column;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  transition: all 0.15s;
  cursor: grab;
}

.field-item:active {
  cursor: grabbing;
}

.field-item.dragging {
  opacity: 0.4;
}

.field-item.drag-over {
  border-top: 2px solid #3370ff;
  margin-top: -1px;
}

.field-item.checked {
  background: rgba(51, 112, 255, 0.03);
}

/* 拖拽手柄 */
.drag-handle {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: grab;
  opacity: 0.6;
}

/* 复选框 */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
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
}

.checkbox-input:checked + .checkbox-box {
  background: #3370ff;
  border-color: #3370ff;
}

.check-svg {
  display: block;
}

/* 字段类型图标 */
.field-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #f0f1f5;
  font-size: 14px;
  color: #4e5969;
  flex-shrink: 0;
}

/* 字段名称 */
.field-name {
  flex: 1;
  font-size: 14px;
  color: #1f2329;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 字段类型标签 */
.field-type-label {
  flex-shrink: 0;
  font-size: 12px;
  color: #8f959e;
  background: #f2f3f5;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 隐藏选项 */
.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  cursor: pointer;
}

.option-item:not(:last-child) {
  border-bottom: 1px solid #f2f3f5;
}

.option-label {
  font-size: 14px;
  color: #1f2329;
}
</style>
