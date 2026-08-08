/**
 * 飞书多维表格 SDK API 封装
 *
 * 提供对 bitable 全局对象的安全访问与便捷方法。
 * 该 SDK 在多维表格 iframe 环境中由宿主注入，无需手动安装。
 * 开发环境下若检测不到 bitable 全局对象，将抛出异常供上层降级处理。
 */

import type { ITable, ISelection, IFieldMeta, IRecord } from '../types/bitable'

/**
 * 判断当前是否处于飞书多维表格环境中（bitable 全局对象是否可用）
 */
export function isBitableAvailable(): boolean {
  return typeof bitable !== 'undefined' && !!bitable?.base
}

/**
 * 获取当前选中的表格信息
 * @returns 包含 baseId, tableId, viewId, recordId 等的选择信息
 */
export async function getSelection(): Promise<ISelection> {
  return await bitable.base.getSelection()
}

/**
 * 获取所有数据表
 * @returns 数据表实例列表
 */
export async function getTableList(): Promise<ITable[]> {
  return await bitable.base.getTableList()
}

/**
 * 获取所有数据表元数据
 * @returns 数据表元数据列表
 */
export async function getTableMetaList(): Promise<
  import('../types/bitable').ITableMeta[]
> {
  return await bitable.base.getTableMetaList()
}

/**
 * 获取当前选中的数据表实例
 * @returns 当前数据表
 */
export async function getCurrentTable(): Promise<ITable> {
  const selection = await getSelection()
  const tables = await getTableList()
  const table = tables.find((t) => t.tableId === selection.tableId)
  if (!table) {
    throw new Error(`未找到数据表: ${selection.tableId}`)
  }
  return table
}

/**
 * 获取当前数据表的所有字段元数据
 * @returns 字段元数据列表
 */
export async function getFieldMetaList(): Promise<IFieldMeta[]> {
  const table = await getCurrentTable()
  return await table.getFieldMetaList()
}

/**
 * 获取当前数据表的全部记录 ID 列表
 * @returns 记录 ID 字符串数组
 */
export async function getRecordIdList(): Promise<string[]> {
  const table = await getCurrentTable()
  return await table.getRecordIdList()
}

/**
 * 获取指定记录的数据
 * @param recordId 记录ID
 * @returns 记录数据
 */
export async function getRecord(recordId: string): Promise<IRecord> {
  const table = await getCurrentTable()
  return await table.getRecord(recordId)
}

/**
 * 检查当前是否有编辑权限
 */
export async function checkEditable(): Promise<boolean> {
  return await bitable.base.isEditable()
}
