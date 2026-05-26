import { fetchWithTimeout, STREAMBD_USER_AGENT, parseUrlHeaders, runBatched } from "./m3uParser";
import { resolveInfinityFreeToken } from "./infinityfree";
import { jsdecode } from "./jsdecode";

export const tokenResolveCache = new Map<string, { data: { url: string; headers?: Record<string, string>; drm?: any } | null; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearTokenCache() {
  tokenResolveCache.clear();
}

// --- Helpers ---

export function decodeEscapedPayload(input: string): string {
  if (!input) return "";
  return input
    .replace(/\\\//g, "/")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003A/gi, ":")
    .replace(/\\u0026/gi, "&");
}

export function parseTokenId(tokenId: string | number | undefined): number {
  if (tokenId == null) return 1;
  const n = Number(tokenId);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function getStreamHeaders(baseUrl: string, originalHeaders?: Record<string, string>): Record<string, string> {
  const streamHeaders = { ...(originalHeaders || {}) };
  try {
    const u = new URL(baseUrl);
    streamHeaders["Referer"] = u.origin + "/";
    streamHeaders["Origin"] = u.origin;
  } catch {}
  return streamHeaders;
}

// All stream extensions based on standard formats
const STREAM_EXTENSIONS = /\.(m3u8|mpd|mp4|mkv|ts|webm|flv|avi|mov|mpeg|mpg|m4s|f4m|ism|sdp)(\?|$)/i;
// All streaming protocols
const STREAM_PROTOCOLS = /^(rtmp|rtsp|udp|srt):\/\//i;

export function isStreamUrl(url: string): boolean {
  if (!url) return false;
  return STREAM_EXTENSIONS.test(url) || STREAM_PROTOCOLS.test(url);
}

// Extract all raw URLs from payload
function extractAllUrls(payload: string): string[] {
  const decoded = decodeEscapedPayload(payload);
  const candidates: string[] = [];

  // 1. Match standard http/https URLs
  const httpRegex = /https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+/gi;
  let match;
  while ((match = httpRegex.exec(decoded)) !== null) {
    const u = match[0].trim();
    if (u && !candidates.includes(u)) candidates.push(u);
  }

  // 2. Match special protocols
  const protoRegex = /(rtmp|rtsp|udp|srt):\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+/gi;
  while ((match = protoRegex.exec(decoded)) !== null) {
    const u = match[0].trim();
    if (u && !candidates.includes(u)) candidates.push(u);
  }

  return candidates;
}

export function extractDrmFromText(text: string): any | undefined {
  if (!text) return undefined;

  // 1. Check for Widevine / Playready
  const widevineUrlMatch = text.match(/(?:widevine|licenseUrl|licenseServer)[a-zA-Z0-9_]*\s*[:=]\s*['"](https?:\/\/[^'"]+)['"]/i) || 
                           text.match(/['"]com\.widevine\.alpha['"]\s*:\s*['"](https?:\/\/[^'"]+)['"]/i);
  const playreadyUrlMatch = text.match(/['"]com\.microsoft\.playready['"]\s*:\s*['"](https?:\/\/[^'"]+)['"]/i);

  if (widevineUrlMatch) {
    return { type: "widevine", licenseServer: widevineUrlMatch[1] };
  }
  if (playreadyUrlMatch) {
    return { type: "playready", licenseServer: playreadyUrlMatch[1] };
  }

  // 2. Check for ClearKey (kid:key pairs)
  // Match common json structures or script variables like: "kid":"xxx", "key":"yyy" or keyId
  const kidMatch = text.match(/(?:['"]?(?:kid|keyId|kId)['"]?\s*[:=]\s*['"]([^'"]+)['"])/i);
  const keyMatch = text.match(/(?:['"]?(?:key|k)['"]?\s*[:=]\s*['"]([^'"]+)['"])/i);

  // Exclude 'key' matches that might just be generic keys unless kid is also found
  if (kidMatch && keyMatch && kidMatch[1] && keyMatch[1]) {
    // Basic heuristic to avoid matching unrelated json keys
    if (kidMatch[1].length > 10 && keyMatch[1].length > 10) {
      return { type: "clearkey", rawKeyPair: `${kidMatch[1]}:${keyMatch[1]}` };
    }
  }

  // Look for direct kid:key strings in the payload (e.g. a raw pair)
  const rawPairMatch = text.match(/([a-fA-F0-9]{32}):([a-fA-F0-9]{32})/);
  if (rawPairMatch) {
    return { type: "clearkey", rawKeyPair: `${rawPairMatch[1]}:${rawPairMatch[2]}` };
  }

  return undefined;
}

// --- Handlers ---

// Handler 1: JSON/API payloads
function extractStreamFromJson(payload: string, tokenId?: string | number): string | undefined {
  const candidates = extractAllUrls(payload);
  const streams = candidates.filter(isStreamUrl);

  if (streams.length === 0) {
    // Fallback: look for common JSON keys if no explicit stream extension is found
    const keyRegex = /(?:"|')?(?:count_url|sourceURL|source_url|stream|stream_url|m3u8|url|play|file|src)(?:"|')?\s*[:=]\s*(?:"|')([^"']+)(?:"|')/gi;
    let keyMatch;
    const decoded = decodeEscapedPayload(payload);
    while ((keyMatch = keyRegex.exec(decoded)) !== null) {
      const u = keyMatch[1].trim();
      if (u && u.startsWith("http") && !streams.includes(u)) {
        streams.push(u);
      }
    }
  }

  const pool = streams.length > 0 ? streams : candidates;
  if (pool.length === 0) return undefined;

  const index = parseTokenId(tokenId) - 1;
  return pool[index] || pool[0];
}

// Handler 2: HTML pages
function extractStreamFromHtml(html: string, tokenId?: string | number): string | undefined {
  const candidates = extractAllUrls(html);
  const streams = candidates.filter(isStreamUrl);

  const pool = streams.length > 0 ? streams : candidates;
  if (pool.length === 0) return undefined;

  const index = parseTokenId(tokenId) - 1;
  return pool[index] || pool[0];
}

// --- Core Resolver ---

export function parseTokenHandlerId(tokenUrl: string | undefined): number | null {
  if (!tokenUrl) return null;
  const match = tokenUrl.trim().match(/^[/\\]?(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export async function resolveTokenByHandler(
  baseUrl: string,
  handlerId: number,
  tokenId?: string | number,
  headers?: Record<string, string>,
): Promise<{ url: string; headers?: Record<string, string>; drm?: any } | null> {
  try {
    const resp = await fetchWithTimeout(baseUrl, {
      headers: { "User-Agent": STREAMBD_USER_AGENT, Accept: "*/*", ...(headers || {}) },
    }, 4000);

    if (!resp.ok) return null;
    const body = await resp.text();
    if (!body) return null;

    let streamUrl: string | undefined;

    if (handlerId === 1) {
      streamUrl = extractStreamFromJson(body, tokenId);
    } else if (handlerId === 2) {
      streamUrl = extractStreamFromHtml(body, tokenId);
    } else if (handlerId === 3) {
      streamUrl = extractStreamFromJson(body, tokenId) || extractStreamFromHtml(body, tokenId);
    } else {
      // Fallback for any other handler id -> treat as JSON
      streamUrl = extractStreamFromJson(body, tokenId);
    }

    if (streamUrl) {
      // For /3 (or generically), try to extract DRM
      const drm = handlerId === 3 ? extractDrmFromText(body) : undefined;
      return { url: streamUrl, headers: getStreamHeaders(baseUrl, headers), drm };
    }

    // Fallback: If no stream found, treat response as token string
    const token = body.trim();
    if (token && token.length < 500 && !token.includes("<html") && !token.includes("{")) {
      const sep = baseUrl.includes("?") ? "&" : "?";
      return { url: `${baseUrl}${sep}token=${encodeURIComponent(token)}`, headers };
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveTokenForUrl(
  baseUrl: string,
  tokenUrl: string | undefined,
  tokenId?: string | number,
  headers?: Record<string, string>,
  tokenMatch?: string,
  tokenReplace?: string,
): Promise<{ url: string; headers?: Record<string, string>; drm?: any } | null> {
  if (!tokenUrl) return null;

  const cacheKey = `${baseUrl}||${tokenUrl}||${String(tokenId ?? "")}||${tokenMatch ?? ""}||${tokenReplace ?? ""}`;
  const cached = tokenResolveCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const result = await resolveTokenForUrlInternal(baseUrl, tokenUrl, tokenId, headers, tokenMatch, tokenReplace);
  if (result) {
    tokenResolveCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }
  return result;
}

async function resolveTokenForUrlInternal(
  baseUrl: string,
  tokenUrl: string | undefined,
  tokenId?: string | number,
  headers?: Record<string, string>,
  tokenMatch?: string,
  tokenReplace?: string,
): Promise<{ url: string; headers?: Record<string, string>; drm?: any } | null> {
  if (!tokenUrl) return null;

  const lowerTokenUrl = tokenUrl.toLowerCase();

  // infinityfree (if) handler
  if (lowerTokenUrl === "if") {
    const bypass = await resolveInfinityFreeToken(baseUrl, headers);
    if (bypass && bypass.content && bypass.content.includes("#EXTM3U")) {
      const lines = bypass.content.split("\n").map(l => l.trim());
      let streamUrl = "";
      const streamHeaders: Record<string, string> = { ...bypass.headers };
      let drm: any = undefined;
      let foundDRM = false;

      for (const line of lines) {
        if (!line || line.startsWith("#EXTM3U")) continue;
        
        if (line.startsWith("#KODIPROP:inputstream.adaptive.license_type=")) {
          const type = line.split("=")[1]?.toLowerCase().trim();
          if (!drm) drm = {};
          if (type?.includes("widevine")) drm.type = "widevine";
          else if (type?.includes("playready")) drm.type = "playready";
          else if (type?.includes("clearkey")) drm.type = "clearkey";
          foundDRM = true;
          continue;
        }

        if (line.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
          const licenseKeyValue = line.split("=").slice(1).join("=").trim();
          const isRawClearKeyPair = /^[0-9a-f]{32}:[0-9a-f]{32}$/i.test(licenseKeyValue);
          if (!drm) drm = {};
          if (isRawClearKeyPair) {
            drm.type = "clearkey";
            drm.rawKeyPair = licenseKeyValue;
          } else {
            drm.licenseServer = licenseKeyValue;
          }
          foundDRM = true;
          continue;
        }

        if (line.startsWith("#EXTVLCOPT:")) {
          const payload = line.substring("#EXTVLCOPT:".length).trim();
          const separatorIndex = payload.indexOf("=");
          if (separatorIndex !== -1) {
            const headerName = payload.substring(0, separatorIndex).trim();
            const headerValue = payload.substring(separatorIndex + 1).trim();
            const lower = headerName.toLowerCase();
            if (lower === "user-agent" || lower === "http-user-agent") streamHeaders["User-Agent"] = headerValue;
            else if (lower === "referer" || lower === "http-referer" || lower === "referrer") streamHeaders["Referer"] = headerValue;
            else if (lower === "origin" || lower === "http-origin") streamHeaders["Origin"] = headerValue;
            else streamHeaders[headerName] = headerValue;
          }
          continue;
        }

        if (line.startsWith("#EXTHTTP:")) {
           try {
             const h = JSON.parse(line.substring("#EXTHTTP:".length).trim());
             Object.assign(streamHeaders, h);
           } catch {}
           continue;
        }

        if (!line.startsWith("#")) {
          const { cleanUrl, headers: urlHeaders } = parseUrlHeaders(line) as any;
          streamUrl = cleanUrl;
          Object.assign(streamHeaders, urlHeaders);
          continue;
        }
      }
      if (streamUrl) {
         if (!streamUrl.startsWith('http')) {
           // It's the actual HLS playlist with relative chunk/playlist URLs (not a wrapper M3U).
           // Return the original PHP bypass URL so ExoPlayer (and player.tsx's fetch pre-flight) can follow the redirect natively.
           return { url: bypass.url, headers: bypass.headers };
         }
         return { url: streamUrl, headers: Object.keys(streamHeaders).length > 0 ? streamHeaders : undefined, drm: foundDRM ? drm : undefined };
      }
    } else if (bypass && bypass.content) {
      // It's not M3U, maybe it's an HTML player page (like crichd or generic iframe)
      // 1. Try crichd extraction
      const crichdRegex = /return\s*\(\s*\[(.*?)\]\.join\(/i;
      const crichdMatch = crichdRegex.exec(bypass.content);
      if (crichdMatch && crichdMatch[1]) {
        const chars = crichdMatch[1].match(/["']([^"']*)["']/g);
        if (chars) {
          let src = chars.map((c: string) => c.slice(1, -1)).join('').replace(/\\\//g, '/');
          if (tokenMatch && tokenReplace) src = src.replace(tokenMatch, tokenReplace);
          return { url: src, headers: getStreamHeaders(baseUrl, bypass.headers) };
        }
      }

      // 2. Try jsdecode extraction
      const decodedResult = jsdecode(bypass.content);
      if (decodedResult) {
        let finalUrl = decodedResult.url;
        if (tokenMatch && tokenReplace) finalUrl = finalUrl.replace(tokenMatch, tokenReplace);
        return { url: finalUrl, headers: getStreamHeaders(baseUrl, bypass.headers), drm: decodedResult.drm };
      }

      // 3. Try generic HTML stream extraction
      const extracted = extractStreamFromHtml(bypass.content, tokenId);
      if (extracted) {
        return { url: extracted, headers: getStreamHeaders(baseUrl, bypass.headers) };
      }
    }
    return bypass as any;
  }

  // jsdecode handler
  if (lowerTokenUrl === "jsdecode") {
    try {
      const resp = await fetchWithTimeout(baseUrl, {
        headers: { "User-Agent": STREAMBD_USER_AGENT, Accept: "*/*", ...(headers || {}) },
      }, 4000);

      if (!resp.ok) return null;
      const html = await resp.text();

      const decodedResult = jsdecode(html);
      if (decodedResult) {
        let finalUrl = decodedResult.url;
        if (tokenMatch && tokenReplace) {
          finalUrl = finalUrl.replace(tokenMatch, tokenReplace);
        }
        return { url: finalUrl, headers: getStreamHeaders(baseUrl, headers), drm: decodedResult.drm };
      }
      return null;
    } catch {
      return null;
    }
  }

  // crichd handler
  if (lowerTokenUrl === "crichd") {
    try {
      const resp = await fetchWithTimeout(baseUrl, {
        headers: { "User-Agent": STREAMBD_USER_AGENT, Accept: "*/*", ...(headers || {}) },
      }, 4000);

      if (!resp.ok) return null;
      const html = await resp.text();

      const regex = /return\s*\(\s*\[(.*?)\]\.join\(/i;
      const match = regex.exec(html);
      if (match && match[1]) {
        const arrStr = match[1];
        const chars = arrStr.match(/["']([^"']*)["']/g);
        if (chars) {
          let src = chars.map((c: string) => c.slice(1, -1)).join('').replace(/\\\//g, '/');
          if (tokenMatch && tokenReplace) {
            src = src.replace(tokenMatch, tokenReplace);
          }
          return { url: src, headers: getStreamHeaders(baseUrl, headers) };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // 1. fetchiframe (or fetchandreplace) handler
  if (lowerTokenUrl === "fetchiframe" || lowerTokenUrl === "fetchandreplace") {
    try {
      const resp = await fetchWithTimeout(baseUrl, {
        headers: { "User-Agent": STREAMBD_USER_AGENT, Accept: "*/*", ...(headers || {}) },
      }, 4000);

      if (!resp.ok) return null;
      const html = await resp.text();

      const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
      const iframes: string[] = [];
      let match;
      while ((match = iframeRegex.exec(html)) !== null) {
        iframes.push(match[1]);
      }

      if (iframes.length > 0) {
        const index = parseTokenId(tokenId) - 1;
        let src = iframes[index] || iframes[0];

        if (tokenMatch && tokenReplace) {
          src = src.replace(tokenMatch, tokenReplace);
        }
        return { url: src, headers: getStreamHeaders(baseUrl, headers) };
      }
      return null;
    } catch {
      return null;
    }
  }

  // 2. Handler ID logic (\1, \2)
  const handlerId = parseTokenHandlerId(tokenUrl);
  if (handlerId !== null) {
    const handled = await resolveTokenByHandler(baseUrl, handlerId, tokenId, headers);
    return handled;
  }

  // 3. Absolute / Relative URL endpoint logic (fetch token from tokenUrl)
  let endpoint = tokenUrl;
  try {
    if (!/^https?:\/\//i.test(tokenUrl)) {
      const base = new URL(baseUrl);
      if (tokenUrl.startsWith("/")) endpoint = base.origin + tokenUrl;
      else if (tokenUrl.startsWith("?")) endpoint = base.origin + base.pathname + tokenUrl;
      else endpoint = base.origin + base.pathname.replace(/\/[^/]*$/, "/") + tokenUrl;
    }
  } catch {
    endpoint = tokenUrl;
  }

  try {
    const resp = await fetchWithTimeout(endpoint, {
      headers: { "User-Agent": STREAMBD_USER_AGENT, Accept: "*/*" },
    }, 4000);

    if (!resp.ok) return null;
    const text = await resp.text();
    const trimmed = text.trim();

    // Try JSON stream extraction first
    const selectedUrl = extractStreamFromJson(trimmed, tokenId);
    if (selectedUrl) {
      const out = { url: selectedUrl, headers };
      return out;
    }

    // Try parsing as JSON for direct token string
    try {
      const j = JSON.parse(trimmed);
      const tokenVal = (j.token || j.key || j.data) as string | undefined;
      if (tokenVal && typeof tokenVal === "string") {
        const sep = baseUrl.includes("?") ? "&" : "?";
        const out = { url: baseUrl + sep + "token=" + encodeURIComponent(tokenVal), headers };
        return out;
      }
    } catch { }

    // Fallback: raw token text string
    if (trimmed.length > 0 && trimmed.length < 500 && !trimmed.includes("<html")) {
      const sep = baseUrl.includes("?") ? "&" : "?";
      const out = { url: baseUrl + sep + "token=" + encodeURIComponent(trimmed), headers };
      return out;
    }
  } catch { }

  return null;
}

export async function resolveCustomTokenUrl(
  baseUrl: string,
  tokenUrlPath: string | undefined,
  tokenId?: number,
  headers?: Record<string, string>,
  tokenMatch?: string,
  tokenReplace?: string,
): Promise<{ url: string; headers?: Record<string, string>; drm?: any }> {
  if (!tokenUrlPath) return { url: baseUrl, headers };

  const result = await resolveTokenForUrl(baseUrl, tokenUrlPath, tokenId, headers, tokenMatch, tokenReplace);
  return result || { url: baseUrl, headers };
}

export async function preprocessTokenUrls(input: string): Promise<string> {
  const lines = input.split(/\r?\n/);
  const tasks: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("tokenurl:") || lowerLine.includes("tokenurl=") || lowerLine.includes("token-url:") || lowerLine.includes("token-url=")) {
      const { cleanUrl, headers: urlHeaders, custom } = parseUrlHeaders(line) as any;
      const token = custom?.tokenUrl || custom?.tokenurl;
      tasks.push({
        index: i,
        cleanUrl,
        urlHeaders,
        token,
        tokenId: custom?.tokenId,
        tokenMatch: custom?.tokenMatch,
        tokenReplace: custom?.tokenReplace
      });
    }
  }

  if (tasks.length === 0) return lines.join("\n");

  const results = await runBatched(tasks, async (t) => {
    return await resolveTokenForUrl(t.cleanUrl, t.token, t.tokenId, t.urlHeaders, t.tokenMatch, t.tokenReplace);
  }, 6);

  for (let k = 0; k < tasks.length; k++) {
    const resolved = results[k] as any;
    if (!resolved) continue;
    const hdrs = resolved.headers || {};
    const headerPart = Object.entries(hdrs).map(([k, v]) => `|${k}=${v}`).join("");
    lines[tasks[k].index] = `${resolved.url}${headerPart}`;
  }

  return lines.join("\n");
}
