import type {
  ApiResponse,
  SessionDetail,
  SubmitSignatureRequest,
  SubmitSignatureResponse,
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
 * 获取会话记录数据
 * GET /api/sessions/:sessionId/records/:recordId
 */
export function getSessionData(
  sessionId: string,
  recordId: string
): Promise<SessionDetail> {
  return request<SessionDetail>(
    `/api/sessions/${sessionId}/records/${recordId}`
  )
}

/**
 * 提交签名
 * POST /api/sessions/:sessionId/sign
 */
export function submitSignature(
  sessionId: string,
  data: SubmitSignatureRequest
): Promise<SubmitSignatureResponse> {
  return request<SubmitSignatureResponse>(
    `/api/sessions/${sessionId}/sign`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

/**
 * 发送验证码
 * POST /api/sessions/:sessionId/send-code
 */
export function sendVerificationCode(
  sessionId: string,
  phone: string
): Promise<{ sent: boolean }> {
  return request<{ sent: boolean }>(
    `/api/sessions/${sessionId}/send-code`,
    {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }
  )
}
