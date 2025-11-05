// Same-origin generate API for Vercel (@vercel/node)
// Returns a bundled sample GLB to verify end-to-end flow without external backend.
// Handles CORS preflight and sets appropriate headers.

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Basic CORS (not required for same-origin, but helpful for clarity)
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
    // Read request body (image base64, face_count, etc.) — not used for mock
    // This ensures clients sending JSON won’t cause errors.
    const bodyStr = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    // Try parse, but ignore failures
    try { JSON.parse(bodyStr || '{}'); } catch (_) {}

    // Serve a bundled GLB from repo root as generated result
    const glbPath = path.join(process.cwd(), 'inspiration-1.glb');
    const glb = fs.readFileSync(glbPath);

    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', Buffer.byteLength(glb));
    res.statusCode = 200;
    res.end(glb);
  } catch (err) {
    console.error('api/generate error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal Server Error', message: String(err && err.message || err) }));
  }
};