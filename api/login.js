// Same-origin login API for Vercel (@vercel/node)
// Proxies login credentials to the real backend and returns JSON (e.g., token).

module.exports = async (req, res) => {
  // Basic CORS for clarity
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    [
      'Content-Type',
      'Accept',
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
    const bodyStr = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    const defaultUrl = 'https://111.229.71.58:8086/login';
    const rawEnv = process.env.BACKEND_LOGIN_URL;
    const normalizeUrl = (val) => {
      if (!val) return '';
      let s = String(val).trim();
      s = s.replace(/^\s*[-•–]\s*/, '');
      s = s.replace(/^["'`]+/, '').replace(/["'`]+$/, '');
      s = s.replace(/[,;]+\s*$/, '');
      if (s && !/^https?:\/\//i.test(s)) s = 'http://' + s;
      return s;
    };
    let upstreamUrl = normalizeUrl(rawEnv) || defaultUrl;
    try { new URL(upstreamUrl); } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Invalid BACKEND_LOGIN_URL',
        message: 'Failed to parse upstream URL: ' + String((e && e.message) || e),
        original: rawEnv || null,
        normalized: upstreamUrl
      }));
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    // Optional Vercel bypass headers
    ['x-vercel-protection-bypass', 'x-vercel-set-bypass-cookie'].forEach(h => {
      if (req.headers[h]) headers[h] = req.headers[h];
    });

    const controller = new AbortController();
    const defaultTimeoutMs = (() => {
      const envVal = process.env.UPSTREAM_TIMEOUT_MS;
      const n = envVal ? parseInt(envVal, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : 60000; // login should be quick
    })();
    const timeoutId = setTimeout(() => controller.abort(), defaultTimeoutMs);

    const doUpstreamFetch = async (url) => {
      return await fetch(url, {
        method: 'POST',
        headers,
        body: bodyStr || '{}',
        signal: controller.signal
      });
    };

    let upstreamResp;
    try {
      upstreamResp = await doUpstreamFetch(upstreamUrl);
    } catch (fetchErr) {
      const msg = String((fetchErr && fetchErr.message) || fetchErr || '');
      const code = String((fetchErr && (fetchErr.code || (fetchErr.cause && fetchErr.cause.code) || (fetchErr.errno))) || '');
      const name = String((fetchErr && fetchErr.name) || '');
      const isTlsError = /TLS|CERT|SSL|self[- ]signed|verify|hostname|UNABLE_TO_VERIFY|CERT_/i.test(msg + ' ' + code);
      const isHttps = /^https:\/\//i.test(upstreamUrl);
      const isAbort = fetchErr && fetchErr.name === 'AbortError';
      const isConnLevel = /ECONN|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN/i.test(code) || (!isAbort && name === 'TypeError' && /fetch failed/i.test(msg));
      const httpsVariant = upstreamUrl.replace(/^http:/i, 'https:');
      const httpVariant = upstreamUrl.replace(/^https:/i, 'http:');
      if (isHttps && (isTlsError || isConnLevel)) {
        try {
          upstreamResp = await doUpstreamFetch(httpVariant);
          upstreamUrl = httpVariant;
        } catch (fallbackErr) {
          clearTimeout(timeoutId);
          res.statusCode = isAbort ? 504 : 502;
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('X-Proxy-Target', httpVariant);
          res.end([
            `HTTPS login error at <${upstreamUrl}>: ${String((fetchErr && fetchErr.message) || fetchErr)}`,
            `HTTP fallback failed at <${httpVariant}>: ${String((fallbackErr && fallbackErr.message) || fallbackErr)}`
          ].join('\n'));
          return;
        }
      } else if (!isAbort && !isHttps && isConnLevel && httpsVariant !== upstreamUrl) {
        try {
          upstreamResp = await doUpstreamFetch(httpsVariant);
          upstreamUrl = httpsVariant;
        } catch (httpsErr) {
          clearTimeout(timeoutId);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('X-Proxy-Target', httpsVariant);
          res.end([
            `HTTP login error at <${upstreamUrl}>: ${String((fetchErr && fetchErr.message) || fetchErr)}`,
            `HTTPS retry failed at <${httpsVariant}>: ${String((httpsErr && httpsErr.message) || httpsErr)}`
          ].join('\n'));
          return;
        }
      } else {
        clearTimeout(timeoutId);
        const statusCode = isAbort ? 504 : 502;
        const reasonText = isAbort ? `Upstream timeout after ${defaultTimeoutMs}ms` : `Upstream fetch error: ${String((fetchErr && fetchErr.message) || fetchErr)}`;
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('X-Proxy-Target', upstreamUrl);
        if (isAbort) res.setHeader('Retry-After', '10');
        res.end(reasonText);
        return;
      }
    }
    clearTimeout(timeoutId);

    const txt = await upstreamResp.text().catch(() => '');
    const ct = upstreamResp.headers.get('content-type') || 'application/json';
    res.statusCode = upstreamResp.status;
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Proxy-Target', upstreamUrl);
    res.end(txt);
  } catch (err) {
    console.error('api/login proxy error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: String((err && err.message) || err),
      hint: 'Check BACKEND_LOGIN_URL env and upstream availability.',
      target: process.env.BACKEND_LOGIN_URL || 'https://111.229.71.58:8086/login'
    }));
  }
};