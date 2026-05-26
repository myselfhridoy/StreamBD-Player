import { decodeBase64 } from "./base64";

export function jsdecode(text: string): { url: string; drm?: { type: "clearkey" | "widevine" | "playready"; rawKeyPair?: string; licenseServer?: string } } | null {
  try {
    let decrypted = "";

    // Check if it's the XOR encrypted payload
    const xorMatch = text.match(/function\s+xorDecrypt\(data,\s*key\)/i);
    const encryptedMatch = text.match(/let\s+encrypted\s*=\s*"(.*?)";/i) || text.match(/const\s+encrypted\s*=\s*"(.*?)";/i) || text.match(/var\s+encrypted\s*=\s*"(.*?)";/i);
    const keyMatch = text.match(/const\s+decryptionKey\s*=\s*"(.*?)";/i) || text.match(/let\s+decryptionKey\s*=\s*"(.*?)";/i) || text.match(/var\s+decryptionKey\s*=\s*"(.*?)";/i);

    if (xorMatch && encryptedMatch && keyMatch) {
      const encrypted = encryptedMatch[1];
      const key = keyMatch[1];

      // Decode base64 using polyfill
      let decoded = decodeBase64(encrypted);

      // XOR decrypt
      decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
    } else {
      // Check for generic eval packer
      const evalMatch = text.match(/<script>(var\s+_[0-9a-zA-Z]+=\[.*?\];\s*function\s+_[0-9a-zA-Z]+\(.*?\)\{.*?\}\s*)eval\((function\(.*?\)\{.*?\}\(.*?\))\)\s*<\/script>/);
      if (evalMatch) {
        const setupCode = evalMatch[1];
        const evalBody = evalMatch[2];
        const unpackerFn = new Function(`
          ${setupCode}
          return ${evalBody};
        `);
        decrypted = unpackerFn();
      }
    }

    if (decrypted) {
      // Now extract mpdUrl, kid, and key from the decrypted script
      const urlMatch = decrypted.match(/const\s+mpdUrl\s*=\s*'(.*?)';/i) || decrypted.match(/let\s+mpdUrl\s*=\s*'(.*?)';/i) || decrypted.match(/var\s+mpdUrl\s*=\s*'(.*?)';/i) || decrypted.match(/const\s+url\s*=\s*'(.*?)';/i);
      const kidMatch = decrypted.match(/const\s+kid\s*=\s*'(.*?)';/i) || decrypted.match(/let\s+kid\s*=\s*'(.*?)';/i);
      const keyStrMatch = decrypted.match(/const\s+key\s*=\s*'(.*?)';/i) || decrypted.match(/let\s+key\s*=\s*'(.*?)';/i);

      let finalUrl = "";
      if (urlMatch) {
        finalUrl = urlMatch[1];
      } else {
        // generic extraction
        const genericUrl = decrypted.match(/https?:\/\/[^\s'"]+/);
        if (genericUrl) finalUrl = genericUrl[0];
      }

      if (finalUrl) {
        let drm: { type: "clearkey" | "widevine" | "playready"; rawKeyPair?: string; licenseServer?: string } | undefined;
        
        // Check for Widevine
        const widevineUrlMatch = decrypted.match(/(?:widevine|licenseUrl|licenseServer)[a-zA-Z0-9_]*\s*[:=]\s*['"](https?:\/\/[^'"]+)['"]/i) || 
                                 decrypted.match(/['"]com\.widevine\.alpha['"]\s*:\s*['"](https?:\/\/[^'"]+)['"]/i);
        const playreadyUrlMatch = decrypted.match(/['"]com\.microsoft\.playready['"]\s*:\s*['"](https?:\/\/[^'"]+)['"]/i);

        if (widevineUrlMatch) {
          drm = { type: "widevine", licenseServer: widevineUrlMatch[1] };
        } else if (playreadyUrlMatch) {
          drm = { type: "playready", licenseServer: playreadyUrlMatch[1] };
        } else if (kidMatch && keyStrMatch) {
          drm = {
            type: "clearkey",
            rawKeyPair: `${kidMatch[1]}:${keyStrMatch[1]}`
          };
        } else {
          // Look for direct kid:key strings in the payload
          const rawPairMatch = decrypted.match(/([a-fA-F0-9]{32}):([a-fA-F0-9]{32})/);
          if (rawPairMatch) {
            drm = { type: "clearkey", rawKeyPair: `${rawPairMatch[1]}:${rawPairMatch[2]}` };
          }
        }

        return { url: finalUrl, drm };
      }
    }
  } catch (e) {
    console.error("jsdecode error:", e);
  }

  return null;
}
