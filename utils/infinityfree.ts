import * as CryptoJS from 'crypto-js';
import { STREAMBD_USER_AGENT as PRYSM_USER_AGENT } from './m3uParser';

function decrypt_slowAES(encryptedHex: string, keyHex: string, ivHex: string): string {
  const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: encrypted
  });

  const decrypted = CryptoJS.AES.decrypt(
    cipherParams,
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.NoPadding
    }
  );

  return CryptoJS.enc.Hex.stringify(decrypted);
}

/**
 * Raw XHR fetch that completely bypasses native cookie jar.
 * React Native's `fetch` polyfill uses XHR internally, but OkHttp's
 * BridgeInterceptor can still replace our explicit Cookie header with jar
 * cookies even when credentials:'omit' is set. Using XHR directly with
 * withCredentials=false gives us full control.
 */
function xhrGet(url: string, headers: Record<string, string>, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.withCredentials = false;
    xhr.timeout = timeoutMs;
    xhr.responseType = 'text';

    Object.entries(headers).forEach(([key, value]) => {
      try { xhr.setRequestHeader(key, value); } catch {}
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('XHR network error'));
    xhr.ontimeout = () => reject(new Error('XHR timeout'));
    xhr.send();
  });
}

/**
 * InfinityFree bypass - tokenUrl=if
 * Challenge will always exist. Solve to get cookie, fetch redirect URL with cookie.
 * Uses XHR to avoid native cookie jar.
 */
export async function resolveInfinityFreeToken(
  url: string,
  headers?: Record<string, string>
): Promise<{ url: string; headers?: Record<string, string>; content?: string } | null> {
  console.log(`[IF Bypass] Started for URL: ${url}`);
    try {
      // Append a cache-buster query parameter to the URL to ensure a fresh challenge
      const bypassUrl = new URL(url);
      bypassUrl.searchParams.append('_t', Date.now().toString());
      
      const reqHeaders: Record<string, string> = {
        "User-Agent": PRYSM_USER_AGENT,
        "Accept": "*/*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...(headers || {})
      };

      // Step 1: Fetch challenge page (NO cookies — xhrGet bypasses jar)
      console.log(`[IF Bypass] Step 1: Fetching challenge page (cache busted)...`);
      const htmlContent = await xhrGet(bypassUrl.toString(), reqHeaders, 5000);
      console.log(`[IF Bypass] Step 1: Challenge page fetched. Length: ${htmlContent.length}`);

    // Step 2: Extract AES parameters - challenge will always exist
    const aMatch = htmlContent.match(/var\s+a\s*=\s*toNumbers\("([a-fA-F0-9]+)"\)/);
    const bMatch = htmlContent.match(/b\s*=\s*toNumbers\("([a-fA-F0-9]+)"\)/);
    const cMatch = htmlContent.match(/c\s*=\s*toNumbers\("([a-fA-F0-9]+)"\)/);
    const urlMatch = htmlContent.match(/location\.href\s*=\s*"([^"]+)"/);

    if (!aMatch || !bMatch || !cMatch || !urlMatch) {
      console.error("[IF Bypass] IF Challenge not found in response.");
      return null;
    }

    console.log(`[IF Bypass] Step 2: Extracted params - a:${aMatch[1].substring(0,6)}... b:${bMatch[1].substring(0,6)}... c:${cMatch[1].substring(0,6)}...`);
    console.log(`[IF Bypass] Step 2: Extracted redirect path: ${urlMatch[1]}`);

    // Step 3: Solve AES challenge → cookie
    const decryptedValue = decrypt_slowAES(cMatch[1], aMatch[1], bMatch[1]);
    const payloadCookie = `__test=${decryptedValue}`;
    console.log(`[IF Bypass] Step 3: Generated cookie: ${payloadCookie}`);

    // Step 4: Build redirect URL
    const redirectPath = urlMatch[1];
    const baseUrl = new URL(url);
    let redirectUrl: string;
    try {
      redirectUrl = new URL(redirectPath, baseUrl.origin).href;
    } catch {
      if (redirectPath.startsWith('/')) {
        redirectUrl = baseUrl.origin + redirectPath;
      } else {
        redirectUrl = baseUrl.origin + baseUrl.pathname.replace(/\/[^/]*$/, "/") + redirectPath;
      }
    }
    console.log(`[IF Bypass] Step 4: Full redirect URL: ${redirectUrl}`);

    // Step 5: Cookie header build
    const outHeaders: Record<string, string> = { ...(headers || {}) };
    if (outHeaders['Cookie'] || outHeaders['cookie']) {
      const cookieKey = outHeaders['Cookie'] ? 'Cookie' : 'cookie';
      outHeaders[cookieKey] = `${outHeaders[cookieKey]}; ${payloadCookie}`;
    } else {
      outHeaders['Cookie'] = payloadCookie;
    }

    // Step 6: Fetch redirect URL with cookie -> return content
    // IF Server often drops connections abruptly (Rate limit / PHP limits).
    // If the user zaps channels quickly, concurrent requests will be dropped.
    // We use a robust retry mechanism with exponential backoff.
    console.log(`[IF Bypass] Step 6: Fetching redirect URL with cookie via XHR...`);
    let content = "";
    let fetchSuccess = false;
    
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        if (attempt > 1) {
          const delay = attempt === 2 ? 1000 : attempt === 3 ? 2000 : 3000;
          console.log(`[IF Bypass] Step 6: Attempt ${attempt}... (Waiting ${delay}ms)`);
          await new Promise(r => setTimeout(r, delay));
        }
        content = await xhrGet(redirectUrl, { ...reqHeaders, 'Cookie': payloadCookie }, 10000); // 10s timeout
        fetchSuccess = true;
        break;
      } catch (err: any) {
        console.error(`[IF Bypass] Step 6 Failed (attempt ${attempt}):`, err.message);
      }
    }

    if (fetchSuccess) {
      console.log(`[IF Bypass] Step 6: Success! Content fetched, length: ${content.length}`);
      return { url: redirectUrl, headers: outHeaders, content };
    } else {
      console.error(`[IF Bypass] Step 6: All attempts failed.`);
      return { url: redirectUrl, headers: outHeaders };
    }
  } catch (error) {
    console.error("[IF Bypass] Error in bypass flow:", error);
    return null;
  }
}
