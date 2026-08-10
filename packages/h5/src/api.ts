import type {
  ApiResponse,
  SessionDetail,
  SubmitSignatureRequest,
  SubmitSignatureResponse,
  VerifyPhoneResponse,
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
 * 手机号身份验证 (免费方案)
 * POST /api/sessions/:sessionId/verify-phone
 */
export function verifyPhone(
  sessionId: string,
  phone: string
): Promise<VerifyPhoneResponse> {
  return request<VerifyPhoneResponse>(
    `/api/sessions/${sessionId}/verify-phone`,
    {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }
  )
}

/**
 * 获取会话记录数据
 * GET /api/sessions/:sessionId/records/:recordId?signerId=xxx
 */
export function getSessionData(
  sessionId: string,
  recordId: string,
  signerId?: string
): Promise<SessionDetail> {
  const query = signerId ? `?signerId=${signerId}` : ''
  return request<SessionDetail & { signatureUrl?: string }>(
    `/api/sessions/${sessionId}/records/${recordId}${query}`
  )
}

/**
 * 提交签名
 * POST /api/sign/:sessionId/sign
 */
export function submitSignature(
  sessionId: string,
  data: SubmitSignatureRequest
): Promise<SubmitSignatureResponse> {
  return request<SubmitSignatureResponse>(
    `/api/sign/${sessionId}/sign`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}
