// Same-origin image generation API for Vercel (@vercel/node)
// Proxies a request to CLOUDSWAY chat completions endpoint and returns generated image.

export default async function handler(req, res) {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-KEY',
      'x-api-key'
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

  // Read body as text and parse JSON
  const bodyBuf = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(Buffer.concat(chunks)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
  let jsonBody = {};
  try {
    const str = bodyBuf && bodyBuf.length ? bodyBuf.toString('utf8') : '{}';
    jsonBody = JSON.parse(str);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid JSON body', message: String(e && e.message || e) }));
    return;
  }

  // Inputs
  const prompt = String(jsonBody.prompt || '').trim();
  const imageBase64Raw = String(jsonBody.image_base64 || '').trim();
  const aspectRatio = String(jsonBody.aspect_ratio || '2:3').trim();
  const imageSize = String(jsonBody.image_size || '2k').trim();

  // Compose messages for CLOUDSWAY
  const messages = [];
  if (prompt) messages.push({ role: 'user', content: [{ type: 'text', text: prompt }] });
  let dataUrl = '';
  if (imageBase64Raw) {
    dataUrl = imageBase64Raw.startsWith('data:image/') ? imageBase64Raw : `data:image/png;base64,${imageBase64Raw}`;
    const content = messages.length && messages[messages.length - 1].role === 'user'
      ? messages[messages.length - 1].content
      : (messages.push({ role: 'user', content: [] }), messages[messages.length - 1].content);
    content.push({ type: 'image_url', image_url: { url: dataUrl } });
  }
  if (!messages.length) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing inputs', message: 'Provide at least prompt or image_base64' }));
    return;
  }

  // Endpoint and auth
  const defaultEndpoint = 'https://genaiapi.cloudsway.net/v1/ai/FXXQLKWBHfsWMGIl/chat/completions';
  const endpoint = String(process.env.CLOUDSWAY_API_ENDPOINT || defaultEndpoint).trim();
  const apiKey = String(process.env.CLOUDSWAY_API_KEY || '').trim();
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing CLOUDSWAY_API_KEY', hint: 'Configure env CLOUDSWAY_API_KEY' }));
    return;
  }

  // Payload for CLOUDSWAY
  const payload = {
    messages,
    imageConfig: {
      aspectRatio,
      imageSize
    }
  };

  // Timeout control
  const timeoutMs = (() => {
    const n = process.env.UPSTREAM_TIMEOUT_MS ? parseInt(process.env.UPSTREAM_TIMEOUT_MS, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 120000;
  })();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      res.statusCode = resp.status || 502;
      res.setHeader('Content-Type', 'text/plain');
      res.end(`Upstream error ${resp.status}: ${txt}`);
      return;
    }

    const result = await resp.json();
    const choice = result && result.choices && result.choices[0];
    const images = choice && choice.message && choice.message.images || [];
    if (!images.length) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'No image returned', upstream: result }));
      return;
    }

    const first = images[0];
    const url = first && first.image_url && first.image_url.url || '';
    if (!url) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid image object', upstream: first }));
      return;
    }

    // If client requests raw PNG, stream binary; otherwise return JSON with data URL
    const wantPng = /image\/png/i.test(String(req.headers['accept'] || '')) || /(^|&)format=png(&|$)/.test(String(req.url || ''));
    if (wantPng) {
      try {
        const b64 = url.includes(',') ? url.split(',', 1)[1] : url;
        const buf = Buffer.from(b64, 'base64');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/png');
        res.end(buf);
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to decode image', message: String(e && e.message || e) }));
      }
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ image_data_url: url }));
  } catch (err) {
    const isAbort = err && err.name === 'AbortError';
    res.statusCode = isAbort ? 504 : 502;
    if (isAbort) res.setHeader('Retry-After', '10');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: isAbort ? 'Upstream timeout' : 'Upstream fetch error', message: String(err && err.message || err) }));
  }
}