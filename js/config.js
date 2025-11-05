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
  const base = normalize(window.POLLY_API_BASE || DEFAULT_BASE);
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
})();