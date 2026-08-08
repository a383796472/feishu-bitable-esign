<template>
  <div class="step-indicator">
    <div
      v-for="(step, index) in steps"
      :key="step.id"
      class="step-item"
      :class="{
        active: step.id === currentStep,
        completed: step.id < currentStep,
      }"
    >
      <!-- 连接线（第一个不显示） -->
      <div
        v-if="index > 0"
        class="step-line"
        :class="{ 'line-completed': step.id <= currentStep }"
      ></div>

      <!-- 圆圈 -->
      <div class="step-circle">
        <!-- 已完成：绿色勾 -->
        <svg
          v-if="step.id < currentStep"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          class="check-icon"
        >
          <path
            d="M5 12.5L10 17L19 7"
            fill="none"
            stroke="#fff"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <!-- 当前/未开始：数字 -->
        <span v-else class="step-number">{{ step.id }}</span>
      </div>

      <!-- 步骤名称 -->
      <span class="step-label">{{ step.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Step {
  id: number
  label: string
}

defineProps<{
  /** 当前步骤，1 / 2 / 3 */
  currentStep: number
}>()

const steps: Step[] = [
  { id: 1, label: '选择数据' },
  { id: 2, label: '设置确认单' },
  { id: 3, label: '创建完成' },
]
</script>

<style scoped>
.step-indicator {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 32px 24px;
  background: #fff;
}

.step-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

/* 连接线 */
.step-line {
  position: absolute;
  top: 14px;
  left: -50%;
  width: 100%;
  height: 2px;
  background: #e5e6eb;
  transition: background 0.3s;
  z-index: 0;
}

.step-line.line-completed {
  background: #1dc981;
}

/* 圆圈 */
.step-circle {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e6eb;
  color: #8f959e;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
  flex-shrink: 0;
}

/* 当前步骤：蓝色高亮 */
.step-item.active .step-circle {
  background: #3370ff;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(51, 112, 255, 0.12);
}

/* 已完成步骤：绿色 */
.step-item.completed .step-circle {
  background: #1dc981;
  color: #fff;
}

.step-number {
  line-height: 1;
}

.check-icon {
  display: block;
}

/* 步骤名称 */
.step-label {
  font-size: 13px;
  color: #8f959e;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.3s;
}

.step-item.active .step-label {
  color: #3370ff;
  font-weight: 600;
}

.step-item.completed .step-label {
  color: #1dc981;
}
</style>
