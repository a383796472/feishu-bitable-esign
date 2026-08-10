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

/** 回写配置 - 指定飞书表格中用于回写的字段 */
export interface WritebackConfig {
  /** 签字状态字段名 (写入 "已签"/"未签") */
  statusField: string
  /** 签名图片附件字段名 */
  signatureField: string
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
  /** 手机号字段名 (用于身份验证时匹配) */
  phoneField?: string
  /** 回写配置 */
  writebackConfig?: WritebackConfig
}

/** 创建签名会话响应 (Server -> Widget) */
export interface CreateSessionResponse {
  sessionId: string
  qrCodeUrl: string
  shareUrl: string
}

/** 签字人验证结果 */
export interface VerifiedSigner {
  signerId: string
  name: string
  phone: string
  /** 该签字人需要签的记录列表 */
  records: SignerRecordItem[]
}

/** 签字人的记录项 */
export interface SignerRecordItem {
  recordId: string
  isSigned: boolean
  signedAt?: string
}

/** 手机号验证请求 (H5 -> Server) */
export interface VerifyPhoneRequest {
  phone: string
}

/** 手机号验证响应 (Server -> H5) */
export interface VerifyPhoneResponse {
  verified: boolean
  signer?: VerifiedSigner
  /** 会话基本信息 */
  formName: string
  signMode: SignMode
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
  /** 所有签字人状态 (会签模式) */
  allSigners?: SignerStatus[]
}

/** 签字人状态 (用于会签模式显示) */
export interface SignerStatus {
  signerId: string
  name: string
  isSigned: boolean
  signedAt?: string
  signatureUrl?: string
}

/** 提交签名请求 (H5 -> Server) */
export interface SubmitSignatureRequest {
  recordId: string
  /** 签名图片 base64 */
  signatureData: string
  /** 签字人手机号 (身份验证时) */
  signerPhone?: string
  /** 签字人 ID */
  signerId?: string
  /** 签字人姓名 */
  signerName: string
}

/** 提交签名响应 (Server -> H5) */
export interface SubmitSignatureResponse {
  success: boolean
  message: string
  /** 签名回执 URL */
  receiptUrl?: string
  /** 是否还有未签的记录 */
  hasMoreRecords?: boolean
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
  /** 各签字人状态 (会签模式) */
  signers?: SignerStatus[]
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
