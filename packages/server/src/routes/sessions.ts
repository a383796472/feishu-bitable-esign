/**
 * 会话管理路由
 * 挂载于 /api/sessions
 *
 * 端点:
 *   POST /                              - 创建签名会话
 *   GET  /:sessionId                     - 获取会话基本信息
 *   POST /:sessionId/verify-phone        - 手机号身份验证 (免费方案)
 *   GET  /:sessionId/records/:recordId    - 获取记录签字页面数据
 *   GET  /:sessionId/status               - 获取会话签字状态概览
 */
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  getSession,
  createSession,
  getSignRecord,
  getSignRecordsBySession,
  getSignRecordsBySigner,
  getSignRecordsByRecord,
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
  SignerStatus,
  VerifyPhoneResponse,
  WritebackConfig,
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
    phone_field: row.phone_field,
    status_field: row.status_field,
    signature_field: row.signature_field,
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

// ==================== 路由 ====================

/**
 * POST / - 创建签名会话
 *
 * 请求体: CreateSessionRequest
 * 响应:   CreateSessionResponse
 *
 * 会签模式 (signMode=multi):
 *   为每个 recordId × 每个 signer 创建独立的签字记录
 * 单签模式 (signMode=single):
 *   为每个 recordId 创建一条签字记录
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

    // 提取回写配置
    const writebackConfig: Partial<WritebackConfig> = body.writebackConfig || {};

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
      phone_field: body.phoneField || null,
      status_field: writebackConfig.statusField || '签字状态',
      signature_field: writebackConfig.signatureField || '签名图片',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    // 创建签字记录
    const signers: Signer[] = body.signers || [];
    const isMulti = (body.signMode || 'single') === 'multi';

    for (const recordId of body.recordIds) {
      if (isMulti && signers.length > 0) {
        // 会签模式: 为每个签字人创建独立记录
        for (const signer of signers) {
          createSignRecord({
            id: uuidv4(),
            session_id: sessionId,
            record_id: recordId,
            signer_id: signer.id,
            status: 'pending',
            signer_name: signer.name,
            signer_phone: signer.phone || null,
            signature_path: null,
            signed_at: null,
            created_at: now.toISOString(),
          });
        }
      } else {
        // 单签模式: 每条记录一个签字人 (轮询分配或无指定)
        const signer = signers.length > 0
          ? signers[body.recordIds.indexOf(recordId) % signers.length]
          : null;

        createSignRecord({
          id: uuidv4(),
          session_id: sessionId,
          record_id: recordId,
          signer_id: signer?.id || null,
          status: 'pending',
          signer_name: signer?.name || null,
          signer_phone: signer?.phone || null,
          signature_path: null,
          signed_at: null,
          created_at: now.toISOString(),
        });
      }
    }

    // 生成分享 URL (二维码指向身份验证页面, 不含 recordId)
    const shareUrl = `${BASE_URL}/h5/#/v/${sessionId}`;
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
 * POST /:sessionId/verify-phone - 手机号身份验证 (免费方案)
 *
 * 通过手机号匹配表格中的签字人, 无需发送短信验证码
 *
 * 请求体: { phone: string }
 * 响应:   VerifyPhoneResponse
 */
router.post('/:sessionId/verify-phone', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { phone } = req.body as { phone: string };

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

    // 手机号格式校验
    if (!phone || !/^1\d{10}$/.test(phone)) {
      sendError(res, '手机号格式不正确');
      return;
    }

    const session = parseSessionRow(row);
    const signers = session.signers;

    // 方式1: 匹配 signers 列表中预配置的手机号
    let matchedSigner: Signer | undefined;
    for (const s of signers) {
      if (s.phone && s.phone === phone) {
        matchedSigner = s;
        break;
      }
    }

    // 方式2: 如果未在 signers 中匹配到, 且配置了 phone_field,
    // 从飞书表格记录中按手机号字段查找对应签字人
    if (!matchedSigner && session.phone_field && session.access_token) {
      // 从飞书获取所有记录, 查找手机号匹配的记录
      for (const recordId of session.record_ids) {
        try {
          const rawData = await getRecord(
            session.access_token,
            session.app_token,
            session.table_id,
            recordId
          );

          // 获取手机号字段的值
          const phoneValue = rawData[session.phone_field];
          const phoneStr = typeof phoneValue === 'string'
            ? phoneValue
            : typeof phoneValue === 'object' && phoneValue !== null
              ? String((phoneValue as Record<string, unknown>).text || '')
              : String(phoneValue || '');

          if (phoneStr === phone) {
            // 找到匹配的记录, 使用记录中的姓名字段作为签字人
            const nameField = session.fields_config.find(
              f => f.name.includes('姓名') || f.name.includes('名字') || f.name.includes('名称')
            );
            const nameValue = nameField ? rawData[nameField.name] : null;
            const nameStr = typeof nameValue === 'string'
              ? nameValue
              : typeof nameValue === 'object' && nameValue !== null
                ? String((nameValue as Record<string, unknown>).text || '')
                : recordId;

            matchedSigner = {
              id: recordId, // 使用 recordId 作为 signerId
              name: nameStr || `用户${phone.slice(-4)}`,
              phone,
            };
            break;
          }
        } catch (err) {
          console.error('[验证手机号] 获取飞书记录失败:', err);
        }
      }
    }

    if (!matchedSigner) {
      const response: VerifyPhoneResponse = {
        verified: false,
        formName: session.form_name,
        signMode: session.sign_mode as 'single' | 'multi',
      };
      sendSuccess(res, response);
      return;
    }

    // 获取该签字人的所有签字记录
    const signerRecords = getSignRecordsBySigner(sessionId, matchedSigner.id);

    // 如果该签字人在 sign_records 中没有记录 (可能是飞书表格匹配的方式),
    // 则创建临时记录
    if (signerRecords.length === 0) {
      // 为该签字人在所有记录上创建 pending 状态
      const now = new Date().toISOString();
      for (const recordId of session.record_ids) {
        createSignRecord({
          id: uuidv4(),
          session_id: sessionId,
          record_id: recordId,
          signer_id: matchedSigner.id,
          status: 'pending',
          signer_name: matchedSigner.name,
          signer_phone: phone,
          signature_path: null,
          signed_at: null,
          created_at: now,
        });
      }
    }

    // 重新获取签字记录
    const updatedRecords = getSignRecordsBySigner(sessionId, matchedSigner.id);

    const response: VerifyPhoneResponse = {
      verified: true,
      signer: {
        signerId: matchedSigner.id,
        name: matchedSigner.name,
        phone,
        records: updatedRecords.map(r => ({
          recordId: r.record_id,
          isSigned: r.status === 'signed',
          signedAt: r.signed_at || undefined,
        })),
      },
      formName: session.form_name,
      signMode: session.sign_mode as 'single' | 'multi',
    };

    sendSuccess(res, response);
  } catch (err) {
    console.error('[验证手机号] 失败:', err);
    sendError(res, err instanceof Error ? err.message : '验证失败');
  }
});

/**
 * GET /:sessionId/records/:recordId - 获取记录签字页面数据
 *
 * 查询参数: ?signerId=xxx (会签模式下指定签字人)
 *
 * 返回 SessionDetail, 额外包含 signatureUrl 字段 (已签字时)
 */
router.get(
  '/:sessionId/records/:recordId',
  async (req: Request, res: Response) => {
    try {
      const { sessionId, recordId } = req.params;
      const signerId = req.query.signerId as string | undefined;
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

      // 获取签字记录 (按 signerId 或取第一条)
      const signRecord = getSignRecord(sessionId, recordId, signerId);

      if (!signRecord) {
        sendError(res, '签字记录不存在');
        return;
      }

      // 标记为已查看
      markRecordViewed(sessionId, recordId, signerId);

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
            id: signRecord.signer_id || recordId,
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

      // 会签模式: 获取该记录的所有签字人状态
      let allSigners: SignerStatus[] | undefined;
      if (session.sign_mode === 'multi') {
        const allRecords = getSignRecordsByRecord(sessionId, recordId);
        allSigners = allRecords.map(r => ({
          signerId: r.signer_id || '',
          name: r.signer_name || '',
          isSigned: r.status === 'signed',
          signedAt: r.signed_at || undefined,
          signatureUrl: r.signature_path
            ? `${BASE_URL}/uploads/${path.basename(r.signature_path)}`
            : undefined,
        }));
      }

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
        allSigners,
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

    const session = parseSessionRow(row);
    const signRecords = getSignRecordsBySession(sessionId);

    // 会签模式: 每条记录可能有多个签字人
    if (session.sign_mode === 'multi') {
      // 按 recordId 分组
      const recordMap = new Map<string, SignerStatus[]>();
      for (const r of signRecords) {
        if (!recordMap.has(r.record_id)) {
          recordMap.set(r.record_id, []);
        }
        recordMap.get(r.record_id)!.push({
          signerId: r.signer_id || '',
          name: r.signer_name || '',
          isSigned: r.status === 'signed',
          signedAt: r.signed_at || undefined,
          signatureUrl: r.signature_path
            ? `${BASE_URL}/uploads/${path.basename(r.signature_path)}`
            : undefined,
        });
      }

      const records: RecordSignStatus[] = session.record_ids.map(recordId => {
        const signers = recordMap.get(recordId) || [];
        const allSigned = signers.length > 0 && signers.every(s => s.isSigned);
        const anySigned = signers.some(s => s.isSigned);
        return {
          recordId,
          status: allSigned ? 'signed' : anySigned ? 'viewed' : 'pending',
          signers,
        };
      });

      const status: SessionStatus = {
        sessionId,
        totalRecords: session.record_ids.length,
        signedCount: records.filter(r => r.status === 'signed').length,
        records,
      };

      sendSuccess(res, status);
      return;
    }

    // 单签模式
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

export default router;
