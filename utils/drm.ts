export const hexToBase64Url = (hex: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let b64 = '';
  let i = 0;
  while (i < hex.length) {
    const b1 = parseInt(hex.substring(i, i + 2) || '00', 16);
    const b2 = parseInt(hex.substring(i + 2, i + 4) || '00', 16);
    const b3 = parseInt(hex.substring(i + 4, i + 6) || '00', 16);
    b64 += chars[(b1 >> 2) & 0x3f];
    b64 += chars[((b1 & 0x03) << 4) | ((b2 >> 4) & 0x0f)];
    if (i + 2 < hex.length) b64 += chars[((b2 & 0x0f) << 2) | ((b3 >> 6) & 0x03)];
    if (i + 4 < hex.length) b64 += chars[b3 & 0x3f];
    i += 6;
  }
  return b64;
};
