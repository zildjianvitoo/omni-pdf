export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;

export const MARGINS = {
  none: 0,
  small: 28.35, // 10mm in points
  large: 56.7,  // 20mm in points
} as const;

export function getPageSizePoints(size: 'a4' | 'letter'): { width: number; height: number } {
  return PAGE_SIZES[size] || PAGE_SIZES.a4;
}

export function getMarginPoints(margin: 'none' | 'small' | 'large'): number {
  return MARGINS[margin] ?? 0;
}

export function calculateFitDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
  if (imgWidth <= 0 || imgHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0, scale: 0 };
  }
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  return {
    width: imgWidth * scale,
    height: imgHeight * scale,
    scale,
  };
}

export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image from blob: ' + err));
    };
    img.src = url;
  });
}

/**
 * Draws image onto a clean canvas with solid white fill to prevent transparent
 * PNG/WebP alpha channels turning black upon JPEG or PDF embedding.
 */
export async function flattenImageToCanvas(
  imgSource: HTMLImageElement | ImageBitmap,
  width: number,
  height: number,
  rotation = 0
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const isRotated90or270 = rotation === 90 || rotation === 270;
  canvas.width = isRotated90or270 ? height : width;
  canvas.height = isRotated90or270 ? width : height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill solid white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply rotation
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(imgSource, -width / 2, -height / 2, width, height);
  ctx.restore();

  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export canvas to blob'));
        },
        mimeType,
        quality
      );
    } else {
      // Fallback for environments lacking canvas.toBlob
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const binary = atob(dataUrl.split(',')[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        resolve(new Blob([bytes], { type: mimeType }));
      } catch (err) {
        reject(err);
      }
    }
  });
}
