// Runtime-configurable API endpoints (primary + optional fallback)
// You can override via inline script before this file:
//   window.POLLY_API_BASE = 'https://api.primary.com/';
//   window.POLLY_API_FALLBACK_BASE = 'https://api.backup.com/';
(function(){
  const DEFAULT_BASE = '/'; // same-origin (proxied by platform)
  const DEFAULT_GENERATE_PATH = 'generate';
  const DEFAULT_TASKS_CREATE_PATH = 'tasks';
  const DEFAULT_TASKS_STATUS_TEMPLATE = 'tasks/{id}';
  const normalize = (s) => {
    if (!s) return '';
    return s.endsWith('/') ? s : s + '/';
  };
  // Allow overriding via URL ?apiBase=... or <meta name="polly-api-base" content="...">
  const search = new URLSearchParams(window.location.search);
  const searchBase = search.get('apiBase');
  const searchFallbackBase = search.get('fallbackApiBase');
  const metaEl = document.querySelector('meta[name="polly-api-base"]');
  const metaBase = metaEl && metaEl.getAttribute('content');
  const chosenBase = window.POLLY_API_BASE || searchBase || metaBase || DEFAULT_BASE;
  const base = normalize(chosenBase);
  const metaFallbackEl = document.querySelector('meta[name="polly-fallback-api-base"]');
  const metaFallbackBase = metaFallbackEl && metaFallbackEl.getAttribute('content');
  const chosenFallbackBase = window.POLLY_API_FALLBACK_BASE || searchFallbackBase || metaFallbackBase || '';
  const fallbackBase = normalize(chosenFallbackBase);
  // Async tasks endpoints (optional)
  const tasksCreateOverride = window.POLLY_TASKS_CREATE_PATH || search.get('tasksCreate') || '';
  const tasksStatusTemplateOverride = window.POLLY_TASKS_STATUS_TEMPLATE || search.get('tasksStatusTemplate') || '';
  const tasksCreatePath = (tasksCreateOverride || DEFAULT_TASKS_CREATE_PATH);
  const tasksStatusTemplate = (tasksStatusTemplateOverride || DEFAULT_TASKS_STATUS_TEMPLATE);
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
    },
    // Async tasks helpers (optional)
    TASKS_CREATE_PATH: tasksCreatePath,
    TASKS_STATUS_TEMPLATE: tasksStatusTemplate,
    taskCreateUrl(){
      return this.url(this.TASKS_CREATE_PATH);
    },
    taskStatusUrl(id){
      const tmpl = String(this.TASKS_STATUS_TEMPLATE || '').replace('{id}', String(id));
      return this.url(tmpl);
    },
    hasTasks(){
      return !!(this.TASKS_CREATE_PATH && this.TASKS_STATUS_TEMPLATE);
    }
  };
  // Optional: Vercel Deployment Protection bypass (for testing/automation only)
  // Set via inline script: window.POLLY_PROTECTION_BYPASS_SECRET = '...';
  window.POLLY_AUTH = {
    PROTECTION_BYPASS_SECRET: window.POLLY_PROTECTION_BYPASS_SECRET || '',
    SET_BYPASS_COOKIE: true,
    CUSTOM_HEADERS: {},
    buildBypassHeaders(){
      const h = {};
      if (this.PROTECTION_BYPASS_SECRET) {
        h['x-vercel-protection-bypass'] = this.PROTECTION_BYPASS_SECRET;
        if (this.SET_BYPASS_COOKIE) {
          h['x-vercel-set-bypass-cookie'] = 'true';
        }
      }
      return h;
    },
    buildExtraHeaders(){
      const h = {};
      // Merge bypass headers
      Object.assign(h, this.buildBypassHeaders());
      // Allow simple runtime header injection via URL params
      try {
        const qs = new URLSearchParams(window.location.search);
        const apiKey = qs.get('apiKey');
        const authBearer = qs.get('authBearer');
        if (apiKey) h['x-api-key'] = apiKey;
        if (authBearer) h['Authorization'] = 'Bearer ' + authBearer;
      } catch(_) {}
      // Also merge any pre-set custom headers
      if (this.CUSTOM_HEADERS && typeof this.CUSTOM_HEADERS === 'object') {
        Object.assign(h, this.CUSTOM_HEADERS);
      }
      return h;
    }
  };
})();