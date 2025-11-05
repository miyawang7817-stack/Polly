// Runtime-configurable API endpoints
// You can override these via inline script before this file or by setting window.POLLY_API_BASE.
(function(){
  const defaultBase = '/'; // same-origin (proxied by platform)
  const defaultGeneratePath = 'generate';
  // Allow override: e.g., window.POLLY_API_BASE = 'https://api.yourdomain.com/';
  const base = (window.POLLY_API_BASE || defaultBase);
  const normalize = (s) => (s.endsWith('/') ? s : s + '/');
  window.POLLY_API = {
    BASE: normalize(base),
    GENERATE_PATH: defaultGeneratePath,
    url(path){
      const p = path || defaultGeneratePath;
      return this.BASE + p.replace(/^\//,'');
    }
  };
})();