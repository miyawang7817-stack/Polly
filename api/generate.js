// Same-origin generate API for Vercel (@vercel/node)
// Proxies the request to the real backend and returns the GLB binary.

module.exports = async (req, res) => {
  // Basic CORS (not required for same-origin page, but helpful for clarity)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

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

    const upstreamUrl = process.env.BACKEND_GENERATE_URL || 'http://111.229.71.58:8086/generate';

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

    const upstreamResp = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: bodyStr || '{}'
    });

    // Forward non-OK as text for easier debugging on the client
    if (!upstreamResp.ok) {
      const txt = await upstreamResp.text().catch(() => '');
      res.statusCode = upstreamResp.status;
      res.setHeader('Content-Type', 'text/plain');
      res.end(txt || `Upstream error ${upstreamResp.status}`);
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
    res.end(JSON.stringify({ error: 'Internal Server Error', message: String(err && err.message || err) }));
  }
};