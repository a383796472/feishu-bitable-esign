/**
 * 二维码生成服务
 */
import QRCode from 'qrcode';

/**
 * 生成二维码 base64 data URL
 * @param text 要编码的文本 (通常是 URL)
 * @returns base64 编码的 data URL, 可直接用于 <img src="...">
 */
export async function generateQRCode(text: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
  return dataUrl;
}
