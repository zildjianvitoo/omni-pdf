export async function decodeHeicToBlob(file: File | Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('HEIC decoding is only supported in browser environment');
  }
  // Dynamically import heic2any to avoid SSR evaluation errors
  const heic2anyModule = await import('heic2any');
  const heic2any = heic2anyModule.default || heic2anyModule;
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });

  return Array.isArray(result) ? result[0] : result;
}
