export default async function handler(req, res) {
  try {
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const defaultRedirect = `${proto}://${host}/`;
    const redirectUri = (req.query && req.query.redirect_uri) ? String(req.query.redirect_uri) : defaultRedirect;
    const state = (req.query && req.query.state) ? String(req.query.state) : '';
    const nonceFromQuery = (req.query && req.query.nonce) ? String(req.query.nonce) : '';

    // Prefer direct Apple OAuth if configured; otherwise fall back to upstream proxy
    const hasDirectApple = !!process.env.APPLE_CLIENT_ID;
    if (hasDirectApple) {
      const endpoint = process.env.APPLE_AUTH_ENDPOINT || 'https://appleid.apple.com/auth/authorize';
      const clientId = process.env.APPLE_CLIENT_ID;
      const scope = process.env.APPLE_SCOPE || 'name email';
      const responseType = process.env.APPLE_RESPONSE_TYPE || 'id_token';
      const responseMode = process.env.APPLE_RESPONSE_MODE || 'fragment'; // 'form_post' | 'query' | 'fragment'
      const url = new URL(endpoint);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', responseType);
      url.searchParams.set('response_mode', responseMode);
      url.searchParams.set('scope', scope);
      if (state) url.searchParams.set('state', state);
      if ((responseType || '').includes('id_token')) {
        const nonce = nonceFromQuery || (Math.random().toString(36).slice(2) + Date.now().toString(36));
        url.searchParams.set('nonce', nonce);
      }
      res.status(302).setHeader('Location', url.toString()).end();
      return;
    }

    // Fallback: redirect to upstream Apple OAuth start (may issue token/id_token and return here)
    const upstreamStart = process.env.BACKEND_OAUTH_APPLE_START_URL || 'https://111.229.71.58:8086/oauth/apple/start';
    const url = new URL(upstreamStart);
    url.searchParams.set('redirect_uri', redirectUri);
    if (state) url.searchParams.set('state', state);
    if (nonceFromQuery) url.searchParams.set('nonce', nonceFromQuery);
    res.status(302).setHeader('Location', url.toString()).end();
  } catch (e) {
    res.status(500).json({ error: 'Apple OAuth start failed', message: e && e.message ? e.message : String(e) });
  }
}