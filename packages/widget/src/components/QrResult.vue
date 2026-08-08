<template>
  <div class="qr-result">
    <!-- 成功图标 + 标题 -->
    <div class="success-header">
      <div class="success-icon">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r="30" fill="#1DC981" />
          <path
            d="M20 33L28 41L44 25"
            stroke="#fff"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <h2 class="success-title">创建完成</h2>
    </div>

    <!-- 说明文字 -->
    <p class="desc-text">
      您当前创建的是「{{ verifyIdentityText }}」确认表，请将二维码/链接发给对方进行签字确认
    </p>

    <!-- 确认单标题卡片 -->
    <div class="form-title-card">
      <span class="title-bar"></span>
      <span class="form-title-text">请您对「{{ formName }}」签字确认</span>
    </div>

    <!-- 二维码 -->
    <div class="qr-card">
      <div class="qr-wrapper">
        <img
          v-if="qrCodeUrl"
          :src="qrCodeUrl"
          alt="签字确认二维码"
          class="qr-img"
        />
        <div v-else class="qr-placeholder">
          <svg viewBox="0 0 48 48" width="40" height="40">
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              rx="2"
              fill="none"
              stroke="#c9cdd4"
              stroke-width="2"
            />
            <rect
              x="30"
              y="6"
              width="12"
              height="12"
              rx="2"
              fill="none"
              stroke="#c9cdd4"
              stroke-width="2"
            />
            <rect
              x="6"
              y="30"
              width="12"
              height="12"
              rx="2"
              fill="none"
              stroke="#c9cdd4"
              stroke-width="2"
            />
            <rect x="28" y="28" width="6" height="6" fill="#c9cdd4" />
            <rect x="36" y="28" width="6" height="6" fill="#c9cdd4" />
            <rect x="28" y="36" width="6" height="6" fill="#c9cdd4" />
          </svg>
          <span>二维码生成中</span>
        </div>
      </div>
      <p class="qr-tip">长按图片扫码签字确认</p>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button class="btn btn-secondary" @click="handleCopyLink">
        <svg viewBox="0 0 24 24" width="16" height="16" class="btn-icon">
          <rect
            x="8"
            y="8"
            width="12"
            height="12"
            rx="2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          />
          <path
            d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          />
        </svg>
        复制链接
      </button>
      <button class="btn btn-primary" @click="handleDownloadQr">
        <svg viewBox="0 0 24 24" width="16" height="16" class="btn-icon">
          <path
            d="M12 3v12m0 0l-4-4m4 4l4-4"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <path
            d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
        下载二维码
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 二维码图片 URL */
  qrCodeUrl: string
  /** 分享链接 */
  shareUrl: string
  /** 确认单名称 */
  formName: string
}>()

const emit = defineEmits<{
  (e: 'copy-link', url: string): void
  (e: 'download-qr', url: string): void
}>()

const verifyIdentityText = computed(() => '有校验身份')

/** 复制链接 */
async function handleCopyLink(): Promise<void> {
  const url = props.shareUrl
  emit('copy-link', url)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  } catch {
    // 复制失败时静默处理，父组件已收到事件
  }
}

/** 下载二维码 */
function handleDownloadQr(): void {
  if (!props.qrCodeUrl) return
  emit('download-qr', props.qrCodeUrl)

  const link = document.createElement('a')
  link.href = props.qrCodeUrl
  link.download = `确认单_${props.formName}_二维码.png`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.qr-result {
  padding: 8px 0 16px;
}

/* 成功头部 */
.success-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.success-icon {
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
  font-size: 22px;
  font-weight: 700;
  color: #1f2329;
}

/* 说明文字 */
.desc-text {
  font-size: 14px;
  color: #8f959e;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 20px;
  padding: 0 8px;
}

/* 确认单标题卡片 */
.form-title-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.title-bar {
  flex-shrink: 0;
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: #3370ff;
}

.form-title-text {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  word-break: break-all;
}

/* 二维码卡片 */
.qr-card {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  text-align: center;
}

.qr-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  margin: 0 auto 12px;
  border-radius: 10px;
  background: #f7f8fa;
  overflow: hidden;
}

.qr-img {
  width: 180px;
  height: 180px;
  object-fit: contain;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #c9cdd4;
  font-size: 13px;
}

.qr-tip {
  font-size: 13px;
  color: #8f959e;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-icon {
  flex-shrink: 0;
}

.btn-secondary {
  background: #f0f1f5;
  color: #4e5969;
}

.btn-secondary:active {
  background: #e3e4e8;
}

.btn-primary {
  background: #3370ff;
  color: #fff;
}

.btn-primary:active {
  background: #245bdb;
}
</style>
