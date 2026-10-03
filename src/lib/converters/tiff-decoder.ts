import { canvasToBlob } from '@/lib/utils/canvas-helpers';

export async function decodeTiffToBlob(file: File | Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('TIFF decoding is only supported in browser environment');
  }
  const buffer = await file.arrayBuffer();
  // @ts-expect-error utif does not export full TS types
  const UTIFModule = await import('utif');
  const UTIF = UTIFModule.default || UTIFModule;
  const ifds = UTIF.decode(buffer);
  if (!ifds || ifds.length === 0) {
    throw new Error('Invalid TIFF file or empty image directory');
  }

  UTIF.decodeImage(buffer, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const width = ifds[0].width;
  const height = ifds[0].height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context for TIFF');

  const imgData = ctx.createImageData(width, height);
  imgData.data.set(rgba);
  ctx.putImageData(imgData, 0, 0);

  const blob = await canvasToBlob(canvas, 'image/png');
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
