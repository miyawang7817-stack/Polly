// Runtime-configurable API endpoints (primary + optional fallback)
// You can override via inline script before this file:
//   window.POLLY_API_BASE = 'https://api.primary.com/';
//   window.POLLY_API_FALLBACK_BASE = 'https://api.backup.com/';
(function(){
  const DEFAULT_BASE = '/'; // same-origin (proxied by platform)
  const DEFAULT_GENERATE_PATH = 'generate';
  const normalize = (s) => {
    if (!s) return '';
    return s.endsWith('/') ? s : s + '/';
  };
  // Allow overriding via URL ?apiBase=... or <meta name="polly-api-base" content="...">
  const search = new URLSearchParams(window.location.search);
  const searchBase = search.get('apiBase');
  const metaEl = document.querySelector('meta[name="polly-api-base"]');
  const metaBase = metaEl && metaEl.getAttribute('content');
  const chosenBase = window.POLLY_API_BASE || searchBase || metaBase || DEFAULT_BASE;
  const base = normalize(chosenBase);
  const fallbackBase = normalize(window.POLLY_API_FALLBACK_BASE || '');
  window.POLLY_API = {
    BASE: base,
    FALLBACK_BASE: fallbackBase || null,
    GENERATE_PATH: DEFAULT_GENERATE_PATH,
    url(path){
      const p = path || DEFAULT_GENERATE_PATH;
      return this.BASE + p.replace(/^\//,'');
    },
    urlFrom(customBase, path){
      const p = (path || DEFAULT_GENERATE_PATH).replace(/^\//,'');
      const b = normalize(customBase);
      return (b || this.BASE) + p;
    },
    hasFallback(){
      return !!this.FALLBACK_BASE;
    }
  };
  // Optional: Vercel Deployment Protection bypass (for testing/automation only)
  // Set via inline script: window.POLLY_PROTECTION_BYPASS_SECRET = '...';
  window.POLLY_AUTH = {
    PROTECTION_BYPASS_SECRET: window.POLLY_PROTECTION_BYPASS_SECRET || '',
    SET_BYPASS_COOKIE: true,
    buildBypassHeaders(){
      const h = {};
      if (this.PROTECTION_BYPASS_SECRET) {
        h['x-vercel-protection-bypass'] = this.PROTECTION_BYPASS_SECRET;
        if (this.SET_BYPASS_COOKIE) {
          h['x-vercel-set-bypass-cookie'] = 'true';
        }
      }
      return h;
    }
  };
})();