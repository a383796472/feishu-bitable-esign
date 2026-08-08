/**
 * 飞书多维表格扩展脚本 SDK 类型定义
 *
 * 官方文档:
 * - 开发指南: https://bytedance.feishu.cn/docx/HazFdSHH9ofRGKx8424cwzLlnZc
 * - API 文档: https://bytedance.feishu.cn/docx/HjCEd1sPzoVnxIxF3LrcKnepnUf
 * - 开放平台: https://open.feishu.cn/document/base-extension/base-view-extensions
 */

/** 当前选中信息 */
export interface ISelection {
  baseId: string
  tableId: string
  viewId: string
  fieldId: string
  recordId: string
}

/** 字段类型枚举 */
export enum FieldType {
  Text = 1,
  Number = 2,
  SingleSelect = 3,
  MultiSelect = 4,
  DateTime = 5,
  Checkbox = 7,
  User = 11,
  Phone = 13,
  Url = 15,
  Attachment = 17,
  SingleLink = 18,
  Lookup = 19,
  Formula = 20,
  DuplexLink = 21,
  Location = 22,
  GroupChat = 23,
  CreatedTime = 1001,
  ModifiedTime = 1002,
  CreatedUser = 1003,
  ModifiedUser = 1004,
  AutoNumber = 1005,
  Barcode = 99999,
  Progress = 100001,
  Currency = 100002,
  Rating = 100003,
  GeoLocation = 100004,
  Formula2 = 100005,
}

/** 字段元数据 */
export interface IFieldMeta {
  id: string
  name: string
  type: number
  property: Record<string, unknown>
}

/** 字段实例 */
export interface IField {
  id: string
  name: string
  type: number
  /** 获取字段名称 */
  getName(): Promise<string>
  /** 获取字段类型 */
  getType(): Promise<number>
}

/** 记录数据 */
export interface IRecord {
  recordId: string
  fields: Record<string, unknown>
}

/** 数据表实例 */
export interface ITable {
  name: string
  tableId: string
  /** 新增记录 */
  addRecord(params: {
    fields: Record<string, unknown>
  }): Promise<{ recordId: string }>
  /** 获取记录 */
  getRecord(recordId: string): Promise<IRecord>
  /** 设置/更新记录 */
  setRecord(
    recordId: string,
    params: { fields: Record<string, unknown> }
  ): Promise<void>
  /** 删除记录 */
  deleteRecord(recordId: string): Promise<void>
  /** 按名称获取字段 */
  getFieldByName(name: string): Promise<IField>
  /** 按ID获取字段 */
  getField(fieldId: string): Promise<IField>
  /** 获取字段元数据列表 */
  getFieldMetaList(): Promise<IFieldMeta[]>
  /** 获取记录ID列表 */
  getRecordIdList(): Promise<string[]>
}

/** 数据表元数据 */
export interface ITableMeta {
  name: string
  tableId: string
}

/** Base 全局对象 */
export interface IBitableBase {
  /** 获取当前选中信息 */
  getSelection(): Promise<ISelection>
  /** 获取数据表列表 */
  getTableList(): Promise<ITable[]>
  /** 获取数据表元数据列表 */
  getTableMetaList(): Promise<ITableMeta[]>
  /** 是否可编辑 */
  isEditable(): Promise<boolean>
  /** 获取权限 */
  getPermission(): Promise<string>
  /** 监听数据表新增 */
  onTableAdd(callback: (tables: ITableMeta[]) => void): () => void
}

/** Bitable 全局 SDK 对象 */
export interface IBitable {
  base: IBitableBase
}

/** 全局声明 */
declare global {
  const bitable: IBitable
  interface Window {
    bitable: IBitable
  }
}
