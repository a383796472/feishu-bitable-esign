/**
 * 后端 API 调用封装
 *
 * 负责 Widget 与后端服务器之间的通信，包括创建签名会话、查询会话状态等。
 * BASE_URL 通过环境变量 VITE_API_BASE_URL 配置。
 */

import type {
  ApiResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  SessionStatus,
} from '@shared/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * 通用请求封装
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  } catch {
    throw new Error('网络连接失败，请检查网络后重试')
  }

  if (!res.ok) {
    throw new Error(`请求失败 (${res.status})`)
  }

  const json: ApiResponse<T> = await res.json()

  if (json.code !== 0) {
    throw new Error(json.message || '请求失败')
  }

  return json.data
}

/**
 * 创建签名会话
 * POST /api/sessions
 * @param data 创建会话所需的配置数据
 * @returns 会话 ID、二维码 URL 与分享链接
 */
export function createSession(
  data: CreateSessionRequest
): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 获取会话状态
 * GET /api/sessions/:sessionId/status
 * @param sessionId 会话 ID
 * @returns 会话状态概览（含已签/总数及各记录状态）
 */
export function getSessionStatus(
  sessionId: string
): Promise<SessionStatus> {
  return request<SessionStatus>(`/api/sessions/${sessionId}/status`)
}
