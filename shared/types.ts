/**
 * 共享类型定义 - 前后端通用
 */

/** 签字模式 */
export type SignMode = 'single' | 'multi'

/** 签字人配置 */
export interface Signer {
  id: string
  name: string
  phone?: string
}

/** 字段配置 */
export interface FieldConfig {
  id: string
  name: string
  type: number
  selected: boolean
  order: number
}

/** 创建签名会话请求 (Widget -> Server) */
export interface CreateSessionRequest {
  /** Bitable 应用 ID */
  appToken: string
  /** 数据表 ID */
  tableId: string
  /** 数据表名称 */
  tableName: string
  /** 选中的字段列表 */
  fields: FieldConfig[]
  /** 确认单名称 */
  formName: string
  /** 签字模式 */
  signMode: SignMode
  /** 是否验证身份 */
  verifyIdentity: boolean
  /** 签字人列表 (多人模式) */
  signers: Signer[]
  /** 记录 ID 列表 */
  recordIds: string[]
  /** 飞书开放平台 access_token (用于回写) */
  accessToken?: string
}

/** 创建签名会话响应 (Server -> Widget) */
export interface CreateSessionResponse {
  sessionId: string
  qrCodeUrl: string
  shareUrl: string
}

/** 会话详情 (Server -> H5) */
export interface SessionDetail {
  sessionId: string
  formName: string
  signMode: SignMode
  verifyIdentity: boolean
  fields: FieldConfig[]
  /** 该记录的字段数据 */
  recordData: Record<string, unknown>
  /** 记录 ID */
  recordId: string
  /** 当前签字人信息 */
  currentSigner?: Signer
  /** 是否已签字 */
  isSigned: boolean
  /** 签字时间 */
  signedAt?: string
}

/** 提交签名请求 (H5 -> Server) */
export interface SubmitSignatureRequest {
  recordId: string
  /** 签名图片 base64 */
  signatureData: string
  /** 签字人手机号 (身份验证时) */
  signerPhone?: string
  /** 签字人姓名 */
  signerName: string
}

/** 提交签名响应 (Server -> H5) */
export interface SubmitSignatureResponse {
  success: boolean
  message: string
  /** 签名回执 URL */
  receiptUrl?: string
}

/** 签字状态 */
export type SignatureStatus = 'pending' | 'viewed' | 'signed' | 'rejected'

/** 记录签字状态 (Server -> Widget) */
export interface RecordSignStatus {
  recordId: string
  status: SignatureStatus
  signedAt?: string
  signerName?: string
  signatureUrl?: string
}

/** 会话状态概览 (Server -> Widget) */
export interface SessionStatus {
  sessionId: string
  totalRecords: number
  signedCount: number
  records: RecordSignStatus[]
}

/** 通用 API 响应包装 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}
