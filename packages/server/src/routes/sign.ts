/**
 * 签名提交路由
 * 挂载于 /api/sign
 *
 * 端点:
 *   POST /:sessionId/sign - 提交签名
 */
import { Router, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  getSession,
  getSignRecord,
  getSignRecordsBySigner,
  getSignRecordsByRecord,
  updateSignRecordStatus,
} from '../db';
import { uploadFile, updateRecord } from '../services/bitable';
import type {
  SubmitSignatureRequest,
  SubmitSignatureResponse,
  ApiResponse,
} from '../../../../shared/types';

const router = Router();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

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

// ==================== 路由 ====================

/**
 * POST /:sessionId/sign - 提交签名
 *
 * 请求体: SubmitSignatureRequest
 * 响应:   SubmitSignatureResponse
 *
 * 流程:
 *   1. 验证 recordId 属于该会话
 *   2. 如果 verifyIdentity=true, 验证 signerPhone 匹配 (手机号匹配, 免费)
 *   3. 保存签名图片 base64 到文件
 *   4. 通过 bitable service 回写: 签字状态 + 签名图片附件
 *   5. 更新 sign_records 状态为 signed
 *   6. 返回 success + receiptUrl + hasMoreRecords
 */
router.post('/:sessionId/sign', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const body = req.body as SubmitSignatureRequest;

    // 参数校验
    if (!body.recordId) {
      sendError(res, '缺少 recordId');
      return;
    }
    if (!body.signatureData) {
      sendError(res, '缺少签名数据');
      return;
    }
    if (!body.signerName) {
      sendError(res, '缺少签字人姓名');
      return;
    }

    // 获取会话
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
    if (!recordIds.includes(body.recordId)) {
      sendError(res, '记录不属于该会话');
      return;
    }

    // 获取签字记录 (按 signerId 或取第一条)
    const signRecord = getSignRecord(
      sessionId,
      body.recordId,
      body.signerId
    );

    if (!signRecord) {
      sendError(res, '签字记录不存在');
      return;
    }

    // 检查是否已签字
    if (signRecord.status === 'signed') {
      sendError(res, '该记录已签字, 请勿重复提交');
      return;
    }

    // 身份验证: 如果开启, 验证手机号匹配 (免费方案, 无需短信)
    const verifyIdentity = !!row.verify_identity;
    if (verifyIdentity) {
      if (!body.signerPhone) {
        sendError(res, '请提供手机号进行身份验证');
        return;
      }
      // 与签字记录中预存的手机号比对
      if (signRecord.signer_phone && body.signerPhone !== signRecord.signer_phone) {
        sendError(res, '手机号与签字人不匹配');
        return;
      }
    }

    // 确保上传目录存在
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // 保存签名图片 (base64 -> PNG 文件)
    // 文件名包含 signerId 以区分会签模式中不同签字人的签名
    const signerSuffix = body.signerId ? `_${body.signerId}` : '';
    const fileName = `${sessionId}_${body.recordId}${signerSuffix}.png`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // 移除 data URL 前缀, 解码 base64
    const base64Data = body.signatureData.replace(
      /^data:image\/\w+;base64,/,
      ''
    );
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    // 更新签字记录状态为已签
    const signedAt = new Date().toISOString();
    updateSignRecordStatus(signRecord.id, 'signed', filePath, signedAt);

    // 回写到飞书 Bitable (如果有 accessToken)
    const statusField = row.status_field || '签字状态';
    const signatureField = row.signature_field || '签名图片';

    if (row.access_token) {
      try {
        // Step 1: 上传签名图片附件
        await uploadFile(
          row.access_token,
          row.app_token,
          row.table_id,
          body.recordId,
          signatureField,
          filePath
        );

        // Step 2: 更新签字状态字段
        let statusValue = '已签';
        if (row.sign_mode === 'multi') {
          // 会签模式: 检查该记录的所有签字人状态
          const recordSigners = getSignRecordsByRecord(sessionId, body.recordId);
          const allSigned = recordSigners.length > 0 && recordSigners.every(r => r.status === 'signed');
          const anySigned = recordSigners.some(r => r.status === 'signed');

          if (allSigned) {
            statusValue = '全部已签';
          } else if (anySigned) {
            statusValue = '部分已签';
          } else {
            statusValue = '未签';
          }
        }

        await updateRecord(
          row.access_token,
          row.app_token,
          row.table_id,
          body.recordId,
          { [statusField]: statusValue }
        );

        console.log(
          `[回写飞书] 成功: session=${sessionId} record=${body.recordId} status=${statusValue}`
        );
      } catch (err) {
        // 回写失败不阻断流程, 签名已本地保存
        console.error('[回写飞书] 失败:', err);
      }
    }

    // 检查是否还有未签的记录
    let hasMoreRecords = false;
    if (body.signerId) {
      const signerRecords = getSignRecordsBySigner(sessionId, body.signerId);
      hasMoreRecords = signerRecords.some(
        r => r.record_id !== body.recordId && r.status !== 'signed'
      );
    }

    // 构建回执 URL
    const receiptUrl = `${BASE_URL}/uploads/${fileName}`;

    const response: SubmitSignatureResponse = {
      success: true,
      message: '签字成功',
      receiptUrl,
      hasMoreRecords,
    };

    sendSuccess(res, response);
  } catch (err) {
    console.error('[提交签名] 失败:', err);
    sendError(res, err instanceof Error ? err.message : '提交签名失败');
  }
});

export default router;
