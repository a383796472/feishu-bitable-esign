/**
 * SQLite 数据库初始化与操作
 * 使用 better-sqlite3 同步驱动
 */
import Database from 'better-sqlite3';
import path from 'path';

// 使用 process.cwd() 作为基础目录 (npm 脚本始终从 packages/server 运行)
const SERVER_ROOT = process.cwd();
const dbPath = path.resolve(SERVER_ROOT, 'data.db');
const db = new Database(dbPath);

// 启用 WAL 模式提升并发读取性能
db.pragma('journal_mode = WAL');

// 创建数据表
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    app_token     TEXT,
    table_id      TEXT,
    table_name    TEXT,
    form_name     TEXT,
    sign_mode     TEXT,
    verify_identity INTEGER DEFAULT 0,
    fields_config TEXT,
    signers       TEXT,
    record_ids    TEXT,
    access_token  TEXT,
    created_at    TEXT,
    expires_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS sign_records (
    id             TEXT PRIMARY KEY,
    session_id     TEXT NOT NULL,
    record_id      TEXT NOT NULL,
    status         TEXT DEFAULT 'pending',
    signer_name    TEXT,
    signer_phone   TEXT,
    signature_path TEXT,
    signed_at      TEXT,
    created_at     TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sign_records_session
    ON sign_records(session_id);
  CREATE INDEX IF NOT EXISTS idx_sign_records_session_record
    ON sign_records(session_id, record_id);
`);

// ==================== 类型定义 ====================

/** sessions 表行类型 */
export interface SessionRow {
  id: string;
  app_token: string;
  table_id: string;
  table_name: string;
  form_name: string;
  sign_mode: string;
  verify_identity: number;
  fields_config: string;
  signers: string;
  record_ids: string;
  access_token: string | null;
  created_at: string;
  expires_at: string;
}

/** sign_records 表行类型 */
export interface SignRecordRow {
  id: string;
  session_id: string;
  record_id: string;
  status: string;
  signer_name: string | null;
  signer_phone: string | null;
  signature_path: string | null;
  signed_at: string | null;
  created_at: string;
}

/** 创建会话所需参数 */
export interface CreateSessionParams {
  id: string;
  app_token: string;
  table_id: string;
  table_name: string;
  form_name: string;
  sign_mode: string;
  verify_identity: number;
  fields_config: string;
  signers: string;
  record_ids: string;
  access_token: string | null;
  created_at: string;
  expires_at: string;
}

/** 创建签字记录所需参数 */
export interface CreateSignRecordParams {
  id: string;
  session_id: string;
  record_id: string;
  status: string;
  signer_name: string | null;
  signer_phone: string | null;
  signature_path: string | null;
  signed_at: string | null;
  created_at: string;
}

// ==================== 数据库操作函数 ====================

/**
 * 根据 ID 获取会话
 */
export function getSession(sessionId: string): SessionRow | undefined {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  return stmt.get(sessionId) as SessionRow | undefined;
}

/**
 * 创建新会话
 */
export function createSession(params: CreateSessionParams): void {
  const stmt = db.prepare(`
    INSERT INTO sessions (
      id, app_token, table_id, table_name, form_name,
      sign_mode, verify_identity, fields_config, signers,
      record_ids, access_token, created_at, expires_at
    ) VALUES (
      @id, @app_token, @table_id, @table_name, @form_name,
      @sign_mode, @verify_identity, @fields_config, @signers,
      @record_ids, @access_token, @created_at, @expires_at
    )
  `);
  stmt.run(params);
}

/**
 * 获取会话下的单条签字记录
 */
export function getSignRecord(
  sessionId: string,
  recordId: string
): SignRecordRow | undefined {
  const stmt = db.prepare(
    'SELECT * FROM sign_records WHERE session_id = ? AND record_id = ?'
  );
  return stmt.get(sessionId, recordId) as SignRecordRow | undefined;
}

/**
 * 获取会话下所有签字记录
 */
export function getSignRecordsBySession(sessionId: string): SignRecordRow[] {
  const stmt = db.prepare(
    'SELECT * FROM sign_records WHERE session_id = ? ORDER BY created_at ASC'
  );
  return stmt.all(sessionId) as SignRecordRow[];
}

/**
 * 创建签字记录
 */
export function createSignRecord(params: CreateSignRecordParams): void {
  const stmt = db.prepare(`
    INSERT INTO sign_records (
      id, session_id, record_id, status,
      signer_name, signer_phone, signature_path,
      signed_at, created_at
    ) VALUES (
      @id, @session_id, @record_id, @status,
      @signer_name, @signer_phone, @signature_path,
      @signed_at, @created_at
    )
  `);
  stmt.run(params);
}

/**
 * 更新签字记录状态
 */
export function updateSignRecordStatus(
  id: string,
  status: string,
  signaturePath: string,
  signedAt: string
): void {
  const stmt = db.prepare(`
    UPDATE sign_records
    SET status = ?, signature_path = ?, signed_at = ?
    WHERE id = ?
  `);
  stmt.run(status, signaturePath, signedAt, id);
}

/**
 * 更新签字记录的查看状态
 */
export function markRecordViewed(
  sessionId: string,
  recordId: string
): void {
  const stmt = db.prepare(`
    UPDATE sign_records
    SET status = 'viewed'
    WHERE session_id = ? AND record_id = ? AND status = 'pending'
  `);
  stmt.run(sessionId, recordId);
}

export default db;
