// Lightweight design tokens loader
// Usage options:
// 1) Set a URL to your exported tokens JSON:
//    window.FIGMA_TOKENS_URL = 'https://your.cdn/tokens.json';
// 2) Or add URL param: ?figmaTokensUrl=https://your.cdn/tokens.json
// 3) For a quick demo, use ?useSampleTokens=1 to load assets/tokens.sample.json
//
// JSON shape example:
// {
//   "colors": {
//     "primary": "#2E90FA",
//     "secondary": "#98A2B3",
//     "background": "#0B0D12",
//     "surface": "#111827",
//     "text": "#E6EDF3",
//     "lightGray": "#1F2A37"
//   },
//   "radii": { "button": "16px", "card": "12px" },
//   "shadows": { "card": "0 6px 18px rgba(0,0,0,0.22)" }
// }
//
// This script maps tokens to existing CSS variables used in styles.css.
(function(){
  function getQueryParam(name){
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get(name);
    } catch(_) { return null; }
  }

  function logDebug(msg){
    try {
      const panel = document.getElementById('debug-content');
      if (panel) panel.textContent = String(msg);
    } catch(_) {}
    console.log('[Tokens]', msg);
  }

  function applyTokens(tokens){
    if (!tokens || typeof tokens !== 'object') return;
    const root = document.documentElement;
    const colors = tokens.colors || {};
    const radii = tokens.radii || {};
    const shadows = tokens.shadows || {};

    // Map color tokens to existing CSS variables
    if (colors.primary) root.style.setProperty('--primary-color', colors.primary);
    if (colors.secondary) root.style.setProperty('--secondary-color', colors.secondary);
    if (colors.background) root.style.setProperty('--background-color', colors.background);
    if (colors.surface) root.style.setProperty('--surface-color', colors.surface);
    if (colors.text) root.style.setProperty('--text-color', colors.text);
    if (colors.lightGray) root.style.setProperty('--light-gray', colors.lightGray);

    // Optional radii that can be used by components via CSS custom props
    if (radii.button) root.style.setProperty('--radius-button', radii.button);
    if (radii.card) root.style.setProperty('--radius-card', radii.card);

    // Optional shadows
    if (shadows.card) root.style.setProperty('--shadow-card', shadows.card);

    logDebug('Design tokens applied.');
  }

  async function fetchJson(url){
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to load tokens: ' + res.status);
    return res.json();
  }

  async function init(){
    try {
      let url = window.FIGMA_TOKENS_URL || getQueryParam('figmaTokensUrl');
      const useSample = getQueryParam('useSampleTokens');
      if (!url && String(useSample) === '1') {
        url = 'assets/tokens.sample.json';
      }
      if (!url) {
        logDebug('No tokens URL configured. Skip applying.');
        return;
      }
      const tokens = await fetchJson(url);
      applyTokens(tokens);
    } catch (err) {
      logDebug(err && err.message ? err.message : String(err));
    }
  }

  // Defer until DOM is ready so debug panel exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();