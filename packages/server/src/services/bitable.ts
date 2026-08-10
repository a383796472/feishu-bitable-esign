/**
 * 飞书 Bitable API 封装
 * 基础 URL: https://open.feishu.cn/open-apis/bitable/v1
 */
import fs from 'fs';
import path from 'path';

const BITABLE_BASE_URL = 'https://open.feishu.cn/open-apis/bitable/v1';
const DRIVE_BASE_URL = 'https://open.feishu.cn/open-apis/drive/v1';

/** 飞书 API 响应基础结构 */
interface FeishuResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

/** 飞书记录结构 */
interface FeishuRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

/**
 * 获取单条记录
 * @param accessToken 飞书 access_token
 * @param appToken   Bitable app_token
 * @param tableId    数据表 ID
 * @param recordId   记录 ID
 * @returns 字段数据对象 (key 为字段名)
 */
export async function getRecord(
  accessToken: string,
  appToken: string,
  tableId: string,
  recordId: string
): Promise<Record<string, unknown>> {
  const url = `${BITABLE_BASE_URL}/apps/${appToken}/tables/${tableId}/records/${recordId}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`获取记录失败: HTTP ${res.status} ${text}`);
  }

  const json = (await res.json()) as FeishuResponse<{ record: FeishuRecord }>;

  if (json.code !== 0) {
    throw new Error(`获取记录失败: ${json.msg}`);
  }

  return json.data?.record?.fields ?? {};
}

/**
 * 更新记录字段
 * @param accessToken 飞书 access_token
 * @param appToken   Bitable app_token
 * @param tableId    数据表 ID
 * @param recordId   记录 ID
 * @param fields     要更新的字段数据
 */
export async function updateRecord(
  accessToken: string,
  appToken: string,
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const url = `${BITABLE_BASE_URL}/apps/${appToken}/tables/${tableId}/records/${recordId}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`更新记录失败: HTTP ${res.status} ${text}`);
  }

  const json = (await res.json()) as FeishuResponse;

  if (json.code !== 0) {
    throw new Error(`更新记录失败: ${json.msg}`);
  }
}

/**
 * 上传文件到飞书云空间并回写到 Bitable 附件字段
 *
 * 流程:
 *   1. 调用 /drive/v1/medias/upload_all 上传文件，获取 file_token
 *   2. 调用 bitable 更新接口将 file_token 写入指定字段
 *
 * @param accessToken 飞书 access_token
 * @param appToken   Bitable app_token (用作 parent_node)
 * @param tableId    数据表 ID
 * @param recordId   记录 ID
 * @param fieldName  附件字段名称
 * @param filePath   本地文件路径
 * @returns 上传后的 file_token
 */
export async function uploadFile(
  accessToken: string,
  appToken: string,
  tableId: string,
  recordId: string,
  fieldName: string,
  filePath: string
): Promise<string> {
  // ---- Step 1: 上传文件到飞书云空间 ----
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const fileSize = fileBuffer.length;

  const formData = new FormData();
  formData.append('file_name', fileName);
  formData.append('parent_type', 'bitable_image');
  formData.append('parent_node', appToken);
  formData.append('size', String(fileSize));
  formData.append('file', new Blob([fileBuffer]), fileName);

  const uploadRes = await fetch(`${DRIVE_BASE_URL}/medias/upload_all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    throw new Error(`上传文件失败: HTTP ${uploadRes.status} ${text}`);
  }

  const uploadJson = (await uploadRes.json()) as FeishuResponse<{
    file_token: string;
  }>;

  if (uploadJson.code !== 0) {
    throw new Error(`上传文件失败: ${uploadJson.msg}`);
  }

  const fileToken = uploadJson.data.file_token;

  // ---- Step 2: 将 file_token 回写到 Bitable 记录 ----
  await updateRecord(accessToken, appToken, tableId, recordId, {
    [fieldName]: [{ file_token: fileToken }],
  });

  return fileToken;
}

/**
 * 获取数据表的字段列表 (含字段类型)
 * @param accessToken 飞书 access_token
 * @param appToken   Bitable app_token
 * @param tableId    数据表 ID
 * @returns 字段列表 [{ field_name, field_id, type }]
 */
export async function getFields(
  accessToken: string,
  appToken: string,
  tableId: string
): Promise<Array<{ field_name: string; field_id: string; type: number }>> {
  const url = `${BITABLE_BASE_URL}/apps/${appToken}/tables/${tableId}/fields`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`获取字段列表失败: HTTP ${res.status} ${text}`);
  }

  const json = (await res.json()) as FeishuResponse<{
    items: Array<{ field_name: string; field_id: string; type: number }>;
  }>;

  if (json.code !== 0) {
    throw new Error(`获取字段列表失败: ${json.msg}`);
  }

  return json.data?.items ?? [];
}

/**
 * 批量获取记录 (用于一次性获取多条记录数据)
 * @param accessToken 飞书 access_token
 * @param appToken   Bitable app_token
 * @param tableId    数据表 ID
 * @param recordIds  记录 ID 列表
 * @returns Map<recordId, fields>
 */
export async function batchGetRecords(
  accessToken: string,
  appToken: string,
  tableId: string,
  recordIds: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const url = `${BITABLE_BASE_URL}/apps/${appToken}/tables/${tableId}/records/batch_get`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records: recordIds }),
  });

  if (!res.ok) {
    throw new Error(`批量获取记录失败: HTTP ${res.status}`);
  }

  const json = (await res.json()) as FeishuResponse<{
    records: FeishuRecord[];
  }>;

  if (json.code !== 0) {
    throw new Error(`批量获取记录失败: ${json.msg}`);
  }

  const result = new Map<string, Record<string, unknown>>();
  for (const record of json.data?.records ?? []) {
    result.set(record.record_id, record.fields);
  }

  return result;
}
