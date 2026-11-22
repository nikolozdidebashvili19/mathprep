/** Longest side of an uploaded work photo: plenty for handwriting, small enough for MongoDB storage and fast upload. */
export const WORK_PHOTO_MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;

/** Scales (width, height) down so the longer side is at most `maxSide`; never scales up. */
export function scaledSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Browser only: re-encodes a camera photo as a downscaled JPEG (EXIF rotation applied by createImageBitmap).
 * Phone photos are 3–8 MB; the result is usually 150–400 KB.
 */
export async function compressImage(file: File, maxSide = WORK_PHOTO_MAX_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = scaledSize(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/jpeg', JPEG_QUALITY);
  });
}
