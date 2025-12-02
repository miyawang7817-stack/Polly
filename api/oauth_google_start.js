export default async function handler(req, res) {
  try {
    // Prefer direct Google OAuth if configured, otherwise fall back to upstream proxy
    const hasDirectGoogle = !!process.env.GOOGLE_CLIENT_ID;
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const defaultRedirect = `${proto}://${host}/`;
    const redirectUri = (req.query && req.query.redirect_uri) ? String(req.query.redirect_uri) : defaultRedirect;
    const state = (req.query && req.query.state) ? String(req.query.state) : '';
    const nonceFromQuery = (req.query && req.query.nonce) ? String(req.query.nonce) : '';

    if (hasDirectGoogle) {
      const endpoint = process.env.GOOGLE_AUTH_ENDPOINT || 'https://accounts.google.com/o/oauth2/v2/auth';
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const scope = process.env.GOOGLE_OAUTH_SCOPE || 'openid email profile';
      const responseType = process.env.GOOGLE_RESPONSE_TYPE || 'token'; // can be 'token id_token' if using implicit hybrid
      const prompt = process.env.GOOGLE_OAUTH_PROMPT || '';
      const url = new URL(endpoint);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', responseType);
      url.searchParams.set('scope', scope);
      if (prompt) url.searchParams.set('prompt', prompt);
      if (state) url.searchParams.set('state', state);
      if ((responseType || '').includes('id_token')) {
        const nonce = nonceFromQuery || (Math.random().toString(36).slice(2) + Date.now().toString(36));
        url.searchParams.set('nonce', nonce);
      }
      res.status(302).setHeader('Location', url.toString()).end();
      return;
    }

    // Redirect to upstream Google OAuth start URL, carrying redirect_uri back to this site
    const upstreamStart = process.env.BACKEND_OAUTH_GOOGLE_START_URL || 'https://111.229.71.58:8086/oauth/google/start';
    const url = new URL(upstreamStart);
    url.searchParams.set('redirect_uri', redirectUri);
    if (state) url.searchParams.set('state', state);
    if (nonceFromQuery) url.searchParams.set('nonce', nonceFromQuery);
    res.status(302).setHeader('Location', url.toString()).end();
  } catch (e) {
    res.status(500).json({ error: 'OAuth start failed', message: e && e.message ? e.message : String(e) });
  }
}