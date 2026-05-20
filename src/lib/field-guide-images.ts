const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.82;

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件（JPG、PNG、WebP 等）。");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("单张图片不能超过 8MB，请先压缩后再上传。");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法处理图片。");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (dataUrl.length < 32) throw new Error("图片处理失败。");
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
