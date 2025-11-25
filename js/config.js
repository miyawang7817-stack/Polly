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
  const enableFallbackFlag = (search.get('fallback') === '1');
  const metaEl = document.querySelector('meta[name="polly-api-base"]');
  const metaBase = metaEl && metaEl.getAttribute('content');
  // Only honor meta-defined base on local to avoid breaking production with localhost
  const hostname = (window.location && window.location.hostname) || '';
  const isLocalHost = /^(localhost|127\.0\.0\.1|::1)$/.test(hostname);
  const chosenBase = window.POLLY_API_BASE || searchBase || (isLocalHost ? metaBase : '') || DEFAULT_BASE;
  const base = normalize(chosenBase);
  const metaFallbackEl = document.querySelector('meta[name="polly-fallback-api-base"]');
  const metaFallbackBase = metaFallbackEl && metaFallbackEl.getAttribute('content');
  // Respect explicit empty-string override: if window.POLLY_API_FALLBACK_BASE is set (even ''), use it
  const hasWindowFallbackOverride = (typeof window.POLLY_API_FALLBACK_BASE !== 'undefined');
  // Local dev guard: on localhost, ignore meta-defined fallback unless explicitly enabled via URL or window override
  const chosenFallbackBase = (function(){
    if (hasWindowFallbackOverride) return window.POLLY_API_FALLBACK_BASE;
    if (isLocalHost) {
      // On localhost, prefer query-provided fallback; otherwise disable unless ?fallback=1
      return searchFallbackBase || (enableFallbackFlag ? 'https://polly-3d.vercel.app/api/' : '');
    }
    // Non-localhost: allow meta/URL fallbacks as configured
    return searchFallbackBase || metaFallbackBase || (enableFallbackFlag ? 'https://polly-3d.vercel.app/api/' : '');
  })();
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
    loginUrl(){
      return this.url('login');
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
    PROTECTION_BYPASS_SECRET: (function(){
      // Allow specifying bypass secret via URL (?vercelBypass=... or ?protectionBypass=...)
      try {
        const qs = new URLSearchParams(window.location.search);
        const fromQuery = qs.get('vercelBypass') || qs.get('protectionBypass');
        if (fromQuery) return fromQuery;
      } catch(_) {}
      return window.POLLY_PROTECTION_BYPASS_SECRET || '';
    })(),
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