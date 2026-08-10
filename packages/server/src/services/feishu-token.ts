/**
 * 飞书 Token 管理器
 *
 * 自动获取并缓存 tenant_access_token，过期前自动刷新。
 * 只需在 .env 中配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET。
 */

const FEISHU_TOKEN_URL = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

/** 缓存的 token 信息 */
interface TokenCache {
  token: string;
  /** 过期时间戳 (毫秒) */
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

/** 提前刷新时间 (提前 5 分钟刷新，避免边界问题) */
const REFRESH_AHEAD_MS = 5 * 60 * 1000;

/**
 * 获取 tenant_access_token (自动缓存 + 自动刷新)
 *
 * 从环境变量读取 FEISHU_APP_ID 和 FEISHU_APP_SECRET，
 * 调用飞书 API 获取 token 并缓存，过期前自动刷新。
 *
 * @returns tenant_access_token
 * @throws 如果未配置 APP_ID/APP_SECRET 或获取失败
 */
export async function getTenantAccessToken(): Promise<string> {
  // 检查缓存是否有效
  if (tokenCache && Date.now() < tokenCache.expiresAt - REFRESH_AHEAD_MS) {
    return tokenCache.token;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('未配置飞书应用凭证，请在 .env 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
  }

  // 调用飞书 API 获取 token
  const res = await fetch(FEISHU_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`获取 tenant_access_token 失败: HTTP ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    code: number;
    msg: string;
    tenant_access_token: string;
    expire: number; // 秒
  };

  if (json.code !== 0) {
    throw new Error(`获取 tenant_access_token 失败: ${json.msg}`);
  }

  // 缓存 token (expire 单位是秒，转毫秒)
  tokenCache = {
    token: json.tenant_access_token,
    expiresAt: Date.now() + json.expire * 1000,
  };

  console.log('[Token] tenant_access_token 获取成功，有效期:', json.expire, '秒');
  return tokenCache.token;
}

/**
 * 清除 token 缓存 (强制下次重新获取)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}
