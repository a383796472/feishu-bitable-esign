/**
 * 飞书多维表格 SDK API 封装
 *
 * 提供对 bitable 全局对象的安全访问与便捷方法。
 * 该 SDK 在多维表格 iframe 环境中由宿主注入，无需手动安装。
 */

import type { ITable, ISelection, IFieldMeta } from '../types'

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
 * 查找指定名称的字段
 * @param fieldName 字段名称
 * @returns 字段元数据或 undefined
 */
export async function findFieldByName(
  fieldName: string
): Promise<IFieldMeta | undefined> {
  const fields = await getFieldMetaList()
  return fields.find((f) => f.name === fieldName)
}

/**
 * 获取指定记录的数据
 * @param recordId 记录ID
 * @returns 记录数据
 */
export async function getRecord(recordId: string) {
  const table = await getCurrentTable()
  return await table.getRecord(recordId)
}

/**
 * 将签名图片数据写入指定记录的指定字段
 *
 * @param recordId 目标记录ID
 * @param fieldName 目标字段名称
 * @param imageData 图片数据（base64 或 URL）
 * @param isAttachment 是否写入附件字段
 */
export async function saveSignatureToRecord(
  recordId: string,
  fieldName: string,
  imageData: string,
  isAttachment: boolean = false
): Promise<void> {
  const table = await getCurrentTable()
  const field = await table.getFieldByName(fieldName)
  if (!field) {
    throw new Error(`未找到字段: ${fieldName}`)
  }

  let fieldValue: unknown

  if (isAttachment) {
    // 附件字段写入 - 需要将 base64 转为文件对象
    fieldValue = await base64ToAttachmentValue(imageData, 'signature.png')
  } else {
    // URL/文本字段写入
    fieldValue = imageData
  }

  await table.setRecord(recordId, {
    fields: {
      [field.id]: fieldValue,
    },
  })
}

/**
 * 将 base64 图片数据转换为多维表格附件字段值
 */
async function base64ToAttachmentValue(
  base64Data: string,
  fileName: string
): Promise<unknown> {
  // 移除 data URL 前缀
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  // 转换为 Blob
  const byteCharacters = atob(base64)
  const byteArrays: Uint8Array[] = []
  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512)
    const byteNumbers = new Array(slice.length)
    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }
  const blob = new Blob(byteArrays, { type: 'image/png' })
  const file = new File([blob], fileName, { type: 'image/png' })

  // 返回多维表格附件字段期望的格式
  // 注意: 附件字段写入格式可能因 SDK 版本而异
  // 参考官方 API 文档确认具体格式
  return file
}

/**
 * 检查当前是否有编辑权限
 */
export async function checkEditable(): Promise<boolean> {
  return await bitable.base.isEditable()
}

/**
 * 获取当前选中的记录ID
 */
export async function getCurrentRecordId(): Promise<string | null> {
  try {
    const selection = await getSelection()
    return selection.recordId || null
  } catch {
    return null
  }
}
