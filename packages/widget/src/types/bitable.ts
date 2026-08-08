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

/** 字段元数据 */
export interface IFieldMeta {
  id: string
  name: string
  type: number
  property: Record<string, unknown>
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
  /** 按名称获取字段 */
  getFieldByName(name: string): Promise<IField>
  /** 获取字段元数据列表 */
  getFieldMetaList(): Promise<IFieldMeta[]>
  /** 获取记录ID列表 */
  getRecordIdList(): Promise<string[]>
}

/** 字段实例 */
export interface IField {
  id: string
  name: string
  type: number
  getName(): Promise<string>
  getType(): Promise<number>
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
}

/** Bitable 全局 SDK 对象 */
export interface IBitable {
  base: IBitableBase
}

/** 全局声明：飞书多维表格注入的 SDK 对象 */
declare global {
  const bitable: IBitable
  interface Window {
    bitable: IBitable
  }
}
