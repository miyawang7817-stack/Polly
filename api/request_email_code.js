export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const upstream = process.env.BACKEND_EMAIL_CODE_REQUEST_URL || 'https://111.229.71.58:8086/request-email-code';
  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const r = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body,
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: 'Email code request failed', message: e.message });
  }
}