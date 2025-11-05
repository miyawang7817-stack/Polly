// Same-origin generate API for Vercel (@vercel/node)
// Proxies the request to the real backend and returns the GLB binary.

export default async function handler(req, res) {
  // Basic CORS (not required for same-origin page, but helpful for clarity)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // Allow common auth and Vercel bypass headers for cross-origin testing/debugging
  res.setHeader(
    'Access-Control-Allow-Headers',
    [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-KEY',
      'X-AUTH-TOKEN',
      'x-api-key',
      'x-auth-token',
      'x-vercel-protection-bypass',
      'x-vercel-set-bypass-cookie'
    ].join(', ')
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed', allowed: ['POST', 'OPTIONS'] }));
    return;
  }

  try {
    // Read incoming JSON body (contains base64 image and face_count)
    const bodyStr = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    // Normalize BACKEND_GENERATE_URL to avoid copy-paste artifacts (quotes/backticks/bullets)
    // Use HTTPS by default to avoid mixed-content in browsers
    const defaultUrl = 'https://111.229.71.58:8086/generate';
    const rawEnv = process.env.BACKEND_GENERATE_URL;
    const normalizeUrl = (val) => {
      if (!val) return '';
      let s = String(val).trim();
      // Remove leading bullets like "- " or "• "
      s = s.replace(/^\s*[-•–]\s*/, '');
      // Strip wrapping quotes/backticks
      s = s.replace(/^['"`]+/, '').replace(/['"`]+$/, '');
      // Remove trailing commas
      s = s.replace(/[,;]+\s*$/, '');
      // If missing scheme, assume http
      if (s && !/^https?:\/\//i.test(s)) s = 'http://' + s;
      return s;
    };
    let upstreamUrl = normalizeUrl(rawEnv) || defaultUrl;
    // Validate URL
    try {
      // eslint-disable-next-line no-new
      new URL(upstreamUrl);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Invalid BACKEND_GENERATE_URL',
        message: 'Failed to parse upstream URL: ' + String(e && e.message || e),
        original: rawEnv || null,
        normalized: upstreamUrl
      }));
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'model/gltf-binary,application/octet-stream'
    };
    // Forward common auth headers from client to upstream if present
    const passThrough = ['authorization', 'x-api-key', 'x-auth-token'];
    passThrough.forEach(h => {
      if (req.headers[h]) headers[h] = req.headers[h];
    });
    // Or inject from environment (configure in platform settings)
    if (process.env.BACKEND_AUTHORIZATION) headers['Authorization'] = process.env.BACKEND_AUTHORIZATION;
    if (process.env.BACKEND_X_API_KEY) headers['x-api-key'] = process.env.BACKEND_X_API_KEY;
    if (process.env.BACKEND_X_AUTH_TOKEN) headers['x-auth-token'] = process.env.BACKEND_X_AUTH_TOKEN;

    // Upstream timeout to avoid platform killing long-running requests without a clear error
    const defaultTimeoutMs = (() => {
      const envVal = process.env.UPSTREAM_TIMEOUT_MS;
      const n = envVal ? parseInt(envVal, 10) : NaN;
      // Default to 300s (5 minutes) to accommodate long-running generation
      return Number.isFinite(n) && n > 0 ? n : 300000;
    })();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), defaultTimeoutMs);
    // Optional: allow insecure TLS (skip cert verification) via env for HTTPS targets
    // BACKEND_INSECURE=1 enables this. Prefer proper certificates in production.
    let dispatcher = undefined;
    const wantInsecure = String(process.env.BACKEND_INSECURE || '').trim().toLowerCase();
    const isInsecureEnabled = (wantInsecure === '1' || wantInsecure === 'true' || wantInsecure === 'yes');
    if (isInsecureEnabled) {
      try {
        // Node 18+ global fetch is powered by undici; use Agent to disable verification safely (ESM)
        const mod = await import('undici');
        const Agent = mod.Agent;
        dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
      } catch (_) {
        // As a last resort, relax global TLS (not recommended). Only set if undici agent fails.
        try { process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; } catch (_) {}
      }
    }
    // Helper to perform upstream fetch
    const doUpstreamFetch = async (url) => {
      const opts = {
        method: 'POST',
        headers,
        body: bodyStr || '{}',
        signal: controller.signal
      };
      if (dispatcher && /^https:\/\//i.test(url)) {
        // Only attach dispatcher for HTTPS
        opts.dispatcher = dispatcher;
      }
      return await fetch(url, opts);
    };
    let upstreamResp;
    try {
      upstreamResp = await doUpstreamFetch(upstreamUrl);
    } catch (fetchErr) {
      // Detect TLS/certificate errors when using HTTPS against an IP and fallback to HTTP
      const msg = String((fetchErr && fetchErr.message) || fetchErr || '');
      const code = String((fetchErr && (fetchErr.code || (fetchErr.cause && fetchErr.cause.code) || (fetchErr.errno))) || '');
      const name = String((fetchErr && fetchErr.name) || '');
      const isTlsError = /TLS|CERT|SSL|self[- ]signed|verify|hostname|UNABLE_TO_VERIFY|CERT_/i.test(msg + ' ' + code);
      const isHttps = /^https:\/\//i.test(upstreamUrl);
      const isAbort = fetchErr && fetchErr.name === 'AbortError';
      // If the initial attempt fails for connection-level reasons on HTTP, try HTTPS variant once.
      const isConnLevel = /ECONN|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN/i.test(code) || (!isAbort && name === 'TypeError' && /fetch failed/i.test(msg));
      const httpsVariant = upstreamUrl.replace(/^http:/i, 'https:');
      const httpVariant = upstreamUrl.replace(/^https:/i, 'http:');
      if (isHttps && (isTlsError || isConnLevel)) {
        const httpFallbackUrl = httpVariant;
        try {
          upstreamResp = await doUpstreamFetch(httpFallbackUrl);
          // Mark that HTTP fallback was used
          upstreamUrl = httpFallbackUrl;
        } catch (fallbackErr) {
          clearTimeout(timeoutId);
          const bodyInfo = `request_body_length=${(bodyStr || '').length}`;
          const composed = [
            `HTTPS fetch error at <${upstreamUrl}>: ${String((fetchErr && fetchErr.message) || fetchErr)}`,
            `HTTP fallback failed at <${httpFallbackUrl}>: ${String((fallbackErr && fallbackErr.message) || fallbackErr)}`,
            bodyInfo
          ].join('\n').trim();
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('X-Proxy-Target', httpFallbackUrl);
          res.end(composed);
          return;
        }
      } else if (!isAbort && !isHttps && isConnLevel && httpsVariant !== upstreamUrl) {
        // Try upgrading to HTTPS once if HTTP fails with a connection-level error.
        try {
          upstreamResp = await doUpstreamFetch(httpsVariant);
          upstreamUrl = httpsVariant; // mark variant used
        } catch (httpsErr) {
          clearTimeout(timeoutId);
          const bodyInfo = `request_body_length=${(bodyStr || '').length}`;
          const nameInfoA = `error_name_primary=${String((fetchErr && fetchErr.name) || '')}`;
          const codeInfoA = `error_code_primary=${String((fetchErr && (fetchErr.code || (fetchErr.cause && fetchErr.cause.code) || (fetchErr.errno))) || '')}`;
          let stackInfoA = '';
          try {
            const st = String((fetchErr && fetchErr.stack) || '').split('\n').slice(0, 5).join('\n');
            if (st) stackInfoA = `stack_primary=\n${st}`;
          } catch (_) {}
          const nameInfoB = `error_name_https=${String((httpsErr && httpsErr.name) || '')}`;
          const codeInfoB = `error_code_https=${String((httpsErr && (httpsErr.code || (httpsErr.cause && httpsErr.cause.code) || (httpsErr.errno))) || '')}`;
          let stackInfoB = '';
          try {
            const st2 = String((httpsErr && httpsErr.stack) || '').split('\n').slice(0, 5).join('\n');
            if (st2) stackInfoB = `stack_https=\n${st2}`;
          } catch (_) {}
          const composed = [
            `HTTP fetch error at <${upstreamUrl}>: ${String((fetchErr && fetchErr.message) || fetchErr)}`,
            `HTTPS retry failed at <${httpsVariant}>: ${String((httpsErr && httpsErr.message) || httpsErr)}`,
            bodyInfo,
            nameInfoA,
            codeInfoA,
            stackInfoA,
            nameInfoB,
            codeInfoB,
            stackInfoB
          ].filter(Boolean).join('\n').trim();
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('X-Proxy-Target', httpsVariant);
          res.end(composed);
          return;
        }
      } else {
        clearTimeout(timeoutId);
        const statusCode = isAbort ? 504 : 502;
        const reasonText = isAbort ? `Upstream timeout after ${defaultTimeoutMs}ms` : `Upstream fetch error: ${String(fetchErr && fetchErr.message || fetchErr)}`;
        const bodyInfo = `request_body_length=${(bodyStr || '').length}`;
        const nameInfo = `error_name=${String((fetchErr && fetchErr.name) || '')}`;
        const codeInfo = `error_code=${String((fetchErr && (fetchErr.code || (fetchErr.cause && fetchErr.cause.code) || (fetchErr.errno))) || '')}`;
        let stackInfo = '';
        try {
          const st = String((fetchErr && fetchErr.stack) || '').split('\n').slice(0, 6).join('\n');
          if (st) stackInfo = `stack=\n${st}`;
        } catch (_) {}
        const composed = [
          `${reasonText} at <${upstreamUrl}>`,
          bodyInfo,
          nameInfo,
          codeInfo,
          stackInfo
        ].filter(Boolean).join('\n').trim();
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('X-Proxy-Target', upstreamUrl);
        if (isAbort) res.setHeader('Retry-After', '10');
        res.end(composed);
        return;
      }
    }
    clearTimeout(timeoutId);

    // Forward non-OK as text for easier debugging on the client
    if (!upstreamResp.ok) {
      const txt = await upstreamResp.text().catch(() => '');
      const headerDump = [];
      try {
        upstreamResp.headers.forEach((v, k) => headerDump.push(`${k}: ${v}`));
      } catch (_) {}
      const bodyInfo = `request_body_length=${(bodyStr || '').length}`;
      const composed = [
        `Upstream ${upstreamResp.status} ${upstreamResp.statusText} at <${upstreamUrl}>`,
        bodyInfo,
        headerDump.join('\n'),
        '',
        txt
      ].join('\n').trim();
      res.statusCode = upstreamResp.status;
      res.setHeader('Content-Type', 'text/plain');
      // Surface target url for client-side logs
      res.setHeader('X-Proxy-Target', upstreamUrl);
      res.end(composed);
      return;
    }

    const ab = await upstreamResp.arrayBuffer();
    const buf = Buffer.from(ab);
    const ct = upstreamResp.headers.get('content-type') || 'model/gltf-binary';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', buf.length);
    res.statusCode = 200;
    res.end(buf);
  } catch (err) {
    console.error('api/generate proxy error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: String((err && err.message) || err),
      hint: 'Check BACKEND_GENERATE_URL env and upstream availability.',
      target: process.env.BACKEND_GENERATE_URL || 'https://111.229.71.58:8086/generate'
    }));
  }
}