export default async function handler(req, res) {
  const upstreamStart = process.env.BACKEND_OAUTH_APPLE_START_URL || 'https://111.229.71.58:8086/oauth/apple/start';
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const defaultRedirect = `${proto}://${host}/`;
  const redirectUri = (req.query && req.query.redirect_uri) ? req.query.redirect_uri : defaultRedirect;
  const url = new URL(upstreamStart);
  url.searchParams.set('redirect_uri', redirectUri);
  if (req.query && req.query.state) url.searchParams.set('state', req.query.state);
  res.status(302).setHeader('Location', url.toString()).end();
}