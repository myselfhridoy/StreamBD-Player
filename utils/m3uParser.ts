export interface Channel {
  name: string;
  logo: string;
  group: string;
  url: string;
  userAgent?: string;
  cookie?: string;
  httpReferer?: string;
  origin?: string;
  isLiveEvent?: boolean;
  tokenUrl?: string;
  tokenMatch?: string;
  tokenReplace?: string;
  tokenId?: number;
  drm?: any;
}

export const STREAMBD_USER_AGENT = "StreamBD/1.0 (Mobile; Android)";

export async function fetchWithTimeout(resource: string | URL, options: RequestInit & { timeout?: number } = {}, timeoutMs = 8000) {
  const { timeout = timeoutMs, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...fetchOptions,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}

export function parseUrlHeaders(line: string) {
  const parts = line.split('|');
  const cleanUrl = parts[0].trim();
  const headers: Record<string, string> = {};
  const custom: Record<string, string> = {};

  for (let i = 1; i < parts.length; i++) {
    const headerPart = parts[i].trim();
    const equalIndex = headerPart.indexOf('=');
    if (equalIndex > -1) {
      const key = headerPart.substring(0, equalIndex).trim();
      const value = headerPart.substring(equalIndex + 1).trim();
      const lower = key.toLowerCase();
      
      if (lower === 'tokenurl' || lower === 'token-url' || lower === 'tokenid' || lower === 'tokenmatch' || lower === 'tokenreplace') {
        custom[key] = value;
        custom[lower] = value;
      } else {
        headers[key] = value;
        headers[lower] = value;
      }
    }
  }
  return { cleanUrl, headers, custom };
}

export async function runBatched<T, R>(items: T[], fn: (item: T) => Promise<R>, batchSize: number): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export const parseM3U = (content: string): Channel[] => {
  const channels: Channel[] = [];
  const lines = content.split('\n');

  let currentChannel: Partial<Channel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      if (currentChannel && currentChannel.url) {
        channels.push(currentChannel as Channel);
      }

      // Extract properties using regex
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      
      // The channel name is usually after the last comma
      const commaIndex = line.lastIndexOf(',');
      let name = '';
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      } else {
        // Fallback: try tvg-name
        const nameMatch = line.match(/tvg-name="([^"]+)"/);
        name = nameMatch ? nameMatch[1] : 'Unknown Channel';
      }

      currentChannel = {
        name: name,
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Uncategorized',
      };
    } else if (line.startsWith('#EXTVLCOPT:')) {
      if (currentChannel) {
        const opt = line.substring(11).trim();
        if (opt.toLowerCase().startsWith('http-user-agent=')) {
          currentChannel.userAgent = opt.substring(16).trim();
        } else if (opt.toLowerCase().startsWith('http-referrer=') || opt.toLowerCase().startsWith('http-referer=')) {
          currentChannel.httpReferer = opt.substring(opt.indexOf('=') + 1).trim();
        } else if (opt.toLowerCase().startsWith('http-origin=')) {
          currentChannel.origin = opt.substring(opt.indexOf('=') + 1).trim();
        }
      }
    } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=')) {
      if (currentChannel) {
        const type = line.split('=')[1]?.trim().toLowerCase();
        if (!currentChannel.drm) currentChannel.drm = {};
        if (type?.includes('widevine')) currentChannel.drm.type = 'widevine';
        else if (type?.includes('playready')) currentChannel.drm.type = 'playready';
        else if (type?.includes('clearkey')) currentChannel.drm.type = 'clearkey';
      }
    } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      if (currentChannel) {
        const key = line.substring(line.indexOf('=') + 1).trim();
        if (!currentChannel.drm) currentChannel.drm = {};
        const isRawClearKeyPair = /^[0-9a-fA-F]{32}:[0-9a-fA-F]{32}$/.test(key);
        if (isRawClearKeyPair) {
          currentChannel.drm.type = 'clearkey';
          currentChannel.drm.rawKeyPair = key;
        } else {
          currentChannel.drm.licenseServer = key;
        }
      }
    } else if (line.startsWith('#EXTHTTP:')) {
      if (currentChannel) {
        try {
          const jsonStr = line.replace('#EXTHTTP:', '').trim();
          const parsedHttp = JSON.parse(jsonStr);
          if (parsedHttp.cookie) {
            currentChannel.cookie = parsedHttp.cookie;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    } else if (line.startsWith('#EXTATTRFROMURL:')) {
      if (currentChannel) {
        const attrUrl = line.replace('#EXTATTRFROMURL:', '').trim();
        if (attrUrl.includes('|')) {
          const { headers, custom } = parseUrlHeaders(attrUrl);
          if (headers['referer']) currentChannel.httpReferer = headers['referer'];
          if (headers['user-agent']) currentChannel.userAgent = headers['user-agent'];
          if (headers['origin']) currentChannel.origin = headers['origin'];
          if (headers['cookie']) currentChannel.cookie = headers['cookie'];

          if (custom['tokenurl']) currentChannel.tokenUrl = custom['tokenurl'];
          if (custom['tokenmatch']) currentChannel.tokenMatch = custom['tokenmatch'];
          if (custom['tokenreplace']) currentChannel.tokenReplace = custom['tokenreplace'];
          if (custom['tokenid']) {
             const tid = Number(custom['tokenid']);
             if (!isNaN(tid)) currentChannel.tokenId = tid;
          }
        }
      }
    } else if (!line.startsWith('#')) {
      // This should be the URL line
      if (currentChannel) {
        if (line.includes('|')) {
          const { cleanUrl, headers, custom } = parseUrlHeaders(line);
          currentChannel.url = cleanUrl;
          
          if (headers['referer']) currentChannel.httpReferer = headers['referer'];
          if (headers['user-agent']) currentChannel.userAgent = headers['user-agent'];
          if (headers['origin']) currentChannel.origin = headers['origin'];
          if (headers['cookie']) currentChannel.cookie = headers['cookie'];

          if (custom['tokenurl']) currentChannel.tokenUrl = custom['tokenurl'];
          if (custom['tokenmatch']) currentChannel.tokenMatch = custom['tokenmatch'];
          if (custom['tokenreplace']) currentChannel.tokenReplace = custom['tokenreplace'];
          if (custom['tokenid']) {
             const tid = Number(custom['tokenid']);
             if (!isNaN(tid)) currentChannel.tokenId = tid;
          }
        } else {
          currentChannel.url = line.trim();
        }
      }
    }
  }

  // Push the last channel if it exists
  if (currentChannel && currentChannel.url) {
    channels.push(currentChannel as Channel);
  }

  return channels;
};
