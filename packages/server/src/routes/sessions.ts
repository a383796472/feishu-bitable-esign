/**
 * 会话管理路由
 * 挂载于 /api/sessions
 *
 * 端点:
 *   POST /                           - 创建签名会话
 *   GET  /:sessionId                 - 获取会话基本信息
 *   GET  /:sessionId/records/:recordId - 获取记录签字页面数据
 *   GET  /:sessionId/status          - 获取会话签字状态概览
 *   POST /:sessionId/send-code       - 发送验证码 (H5 端身份验证)
 */
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  getSession,
  createSession,
  getSignRecord,
  getSignRecordsBySession,
  createSignRecord,
  markRecordViewed,
  type SessionRow,
} from '../db';
import { generateQRCode } from '../services/qrcode';
import { getRecord } from '../services/bitable';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SessionDetail,
  SessionStatus,
  RecordSignStatus,
  FieldConfig,
  Signer,
  ApiResponse,
} from '../../../../shared/types';

const router = Router();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// ==================== 辅助函数 ====================

/** 发送成功响应 (code=0) */
function sendSuccess<T>(res: Response, data: T): void {
  const response: ApiResponse<T> = { code: 0, message: 'success', data };
  res.json(response);
}

/** 发送错误响应 (code!=0) */
function sendError(res: Response, message: string, code = 1): void {
  const response: ApiResponse<null> = { code, message, data: null };
  res.json(response);
}

/** 解析 session 行中的 JSON 字段 */
function parseSessionRow(row: SessionRow) {
  return {
    id: row.id,
    app_token: row.app_token,
    table_id: row.table_id,
    table_name: row.table_name,
    form_name: row.form_name,
    sign_mode: row.sign_mode,
    verify_identity: !!row.verify_identity,
    fields_config: JSON.parse(row.fields_config) as FieldConfig[],
    signers: JSON.parse(row.signers) as Signer[],
    record_ids: JSON.parse(row.record_ids) as string[],
    access_token: row.access_token,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

/**
 * 将飞书 API 返回的字段数据 (key 为字段名) 转换为以字段 ID 为 key,
 * 且只保留选中字段。H5 前端通过 recordData[field.id] 访问数据。
 */
function transformRecordData(
  rawData: Record<string, unknown>,
  fields: FieldConfig[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.selected) continue;
    // 飞书 API 返回数据 key 为字段名, 也兼容字段 ID
    const value = rawData[field.name] ?? rawData[field.id];
    if (value !== undefined) {
      result[field.id] = value;
    }
  }
  return result;
}

// ==================== 验证码存储 (内存, 5 分钟过期) ====================

interface CodeEntry {
  code: string;
  expiresAt: number;
}
const verificationCodes = new Map<string, CodeEntry>();

// 定期清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of verificationCodes) {
    if (entry.expiresAt < now) {
      verificationCodes.delete(key);
    }
  }
}, 60_000);

// ==================== 路由 ====================

/**
 * POST / - 创建签名会话
 *
 * 请求体: CreateSessionRequest
 * 响应:   CreateSessionResponse
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateSessionRequest;

    // 参数校验
    if (!body.appToken) {
      sendError(res, '缺少 appToken');
      return;
    }
    if (!body.tableId) {
      sendError(res, '缺少 tableId');
      return;
    }
    if (!body.recordIds || body.recordIds.length === 0) {
      sendError(res, '缺少 recordIds');
      return;
    }

    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 天有效期

    // 存储会话
    createSession({
      id: sessionId,
      app_token: body.appToken,
      table_id: body.tableId,
      table_name: body.tableName || '',
      form_name: body.formName || '',
      sign_mode: body.signMode || 'single',
      verify_identity: body.verifyIdentity ? 1 : 0,
      fields_config: JSON.stringify(body.fields || []),
      signers: JSON.stringify(body.signers || []),
      record_ids: JSON.stringify(body.recordIds),
      access_token: body.accessToken || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    // 为每个 recordId 创建签字记录, 并分配签字人 (轮询)
    const signers: Signer[] = body.signers || [];
    for (let i = 0; i < body.recordIds.length; i++) {
      const recordId = body.recordIds[i];
      const signer = signers.length > 0 ? signers[i % signers.length] : null;

      createSignRecord({
        id: uuidv4(),
        session_id: sessionId,
        record_id: recordId,
        status: 'pending',
        signer_name: signer?.name || null,
        signer_phone: signer?.phone || null,
        signature_path: null,
        signed_at: null,
        created_at: now.toISOString(),
      });
    }

    // 生成分享 URL 和二维码
    const firstRecordId = body.recordIds[0];
    const shareUrl = `${BASE_URL}/h5/${sessionId}/${firstRecordId}`;
    const qrCodeUrl = await generateQRCode(shareUrl);

    const response: CreateSessionResponse = {
      sessionId,
      qrCodeUrl,
      shareUrl,
    };

    sendSuccess(res, response);
  } catch (err) {
    console.error('[创建会话] 失败:', err);
    sendError(res, err instanceof Error ? err.message : '创建会话失败');
  }
});

/**
 * GET /:sessionId - 获取会话基本信息
 */
router.get('/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const row = getSession(sessionId);

    if (!row) {
      sendError(res, '会话不存在');
      return;
    }

    const session = parseSessionRow(row);

    sendSuccess(res, {
      sessionId: session.id,
      formName: session.form_name,
      tableName: session.table_name,
      signMode: session.sign_mode,
      verifyIdentity: session.verify_identity,
      fields: session.fields_config,
      recordIds: session.record_ids,
      signers: session.signers,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
    });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : '获取会话失败');
  }
});

/**
 * GET /:sessionId/records/:recordId - 获取记录签字页面数据
 *
 * 返回 SessionDetail, 额外包含 signatureUrl 字段 (已签字时)
 */
router.get(
  '/:sessionId/records/:recordId',
  async (req: Request, res: Response) => {
    try {
      const { sessionId, recordId } = req.params;
      const row = getSession(sessionId);

      if (!row) {
        sendError(res, '会话不存在');
        return;
      }

      // 检查会话是否过期
      if (new Date(row.expires_at) < new Date()) {
        sendError(res, '会话已过期');
        return;
      }

      // 验证 recordId 属于该会话
      const recordIds = JSON.parse(row.record_ids) as string[];
      if (!recordIds.includes(recordId)) {
        sendError(res, '记录不属于该会话');
        return;
      }

      const session = parseSessionRow(row);
      const signRecord = getSignRecord(sessionId, recordId);

      if (!signRecord) {
        sendError(res, '签字记录不存在');
        return;
      }

      // 标记为已查看 (仅当状态为 pending 时)
      markRecordViewed(sessionId, recordId);

      // 从飞书获取记录数据 (如果有 accessToken)
      let recordData: Record<string, unknown> = {};
      if (session.access_token) {
        try {
          const rawData = await getRecord(
            session.access_token,
            session.app_token,
            session.table_id,
            recordId
          );
          recordData = transformRecordData(rawData, session.fields_config);
        } catch (err) {
          console.error('[获取飞书记录] 失败:', err);
          // 继续返回空数据, 不阻断流程
        }
      }

      // 当前签字人
      const currentSigner: Signer | undefined = signRecord.signer_name
        ? {
            id: recordId,
            name: signRecord.signer_name,
            phone: signRecord.signer_phone || undefined,
          }
        : undefined;

      const isSigned = signRecord.status === 'signed';

      // 已签字时返回签名图片 URL
      const signatureUrl =
        isSigned && signRecord.signature_path
          ? `${BASE_URL}/uploads/${path.basename(signRecord.signature_path)}`
          : undefined;

      const detail: SessionDetail & { signatureUrl?: string } = {
        sessionId,
        formName: session.form_name,
        signMode: session.sign_mode as 'single' | 'multi',
        verifyIdentity: session.verify_identity,
        fields: session.fields_config,
        recordData,
        recordId,
        currentSigner,
        isSigned,
        signedAt: signRecord.signed_at || undefined,
        signatureUrl,
      };

      sendSuccess(res, detail);
    } catch (err) {
      sendError(
        res,
        err instanceof Error ? err.message : '获取记录数据失败'
      );
    }
  }
);

/**
 * GET /:sessionId/status - 获取会话签字状态概览
 *
 * 返回 SessionStatus
 */
router.get('/:sessionId/status', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const row = getSession(sessionId);

    if (!row) {
      sendError(res, '会话不存在');
      return;
    }

    const signRecords = getSignRecordsBySession(sessionId);

    const records: RecordSignStatus[] = signRecords.map((r) => ({
      recordId: r.record_id,
      status: r.status as 'pending' | 'viewed' | 'signed' | 'rejected',
      signedAt: r.signed_at || undefined,
      signerName: r.signer_name || undefined,
      signatureUrl: r.signature_path
        ? `${BASE_URL}/uploads/${path.basename(r.signature_path)}`
        : undefined,
    }));

    const status: SessionStatus = {
      sessionId,
      totalRecords: signRecords.length,
      signedCount: signRecords.filter((r) => r.status === 'signed').length,
      records,
    };

    sendSuccess(res, status);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : '获取状态失败');
  }
});

/**
 * POST /:sessionId/send-code - 发送验证码
 *
 * H5 端身份验证: 生成 6 位验证码并 "发送" 到指定手机号
 * (当前为开发模式, 验证码输出到控制台)
 */
router.post('/:sessionId/send-code', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { phone } = req.body as { phone: string };

    const row = getSession(sessionId);
    if (!row) {
      sendError(res, '会话不存在');
      return;
    }

    // 手机号格式校验
    if (!phone || !/^1\d{10}$/.test(phone)) {
      sendError(res, '手机号格式不正确');
      return;
    }

    // 生成 6 位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟有效

    verificationCodes.set(`${sessionId}:${phone}`, { code, expiresAt });

    // TODO: 接入短信服务商发送验证码
    // 当前为开发模式, 输出到控制台
    console.log(
      `[验证码] 会话=${sessionId} 手机号=${phone} 验证码=${code}`
    );

    sendSuccess(res, { sent: true });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : '发送验证码失败');
  }
});

export default router;
