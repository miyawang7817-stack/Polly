// DOM Elements
const uploadBox = document.getElementById('upload-box');
const fileInput = document.getElementById('file-input');
const uploadedImageContainer = document.getElementById('uploaded-image-container');
const uploadedImage = document.getElementById('uploaded-image');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const resetButton = document.getElementById('reset-button');
const generateButton = document.getElementById('generate-button');
const previewContainer = document.getElementById('preview-container');
const generateBtnText = document.querySelector('#generate-button .btn-text');
const uploadClose = document.getElementById('upload-close');
const previewPlaceholder = document.getElementById('preview-placeholder');
const modelViewer = document.getElementById('model-viewer');
const previewControls = document.getElementById('preview-controls');
const solidModeBtn = document.getElementById('solid-view');
const wireframeModeBtn = document.getElementById('wireframe-view');
const resetViewBtn = document.getElementById('reset-view');
const downloadBtn = document.getElementById('download-button');
const printBtn = document.getElementById('print-button');
const printModal = document.getElementById('print-modal');
const printClose = document.getElementById('print-close');
const printCancel = document.getElementById('print-cancel');
const printSubmit = document.getElementById('print-submit');
const printError = document.getElementById('print-error');
const printName = document.getElementById('print-name');
const printPhone = document.getElementById('print-phone');
const printEmail = document.getElementById('print-email');
const printAddress1 = document.getElementById('print-address1');
const printAddress2 = document.getElementById('print-address2');
const printCity = document.getElementById('print-city');
const printState = document.getElementById('print-state');
const printPostal = document.getElementById('print-postal');
const printCountry = document.getElementById('print-country');
const modelInfo = document.getElementById('model-info');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const previewLoading = document.getElementById('preview-loading');
const previewLoadingText = document.getElementById('preview-loading-text');
const previewEstimateEl = document.getElementById('preview-estimate-seconds');
const debugPanel = document.getElementById('debug-panel');
const debugContent = document.getElementById('debug-content');
const isDebug = (new URLSearchParams(window.location.search).get('debug') === '1');
const isMock = (new URLSearchParams(window.location.search).get('mock') === '1');
// Login elements
const loginLink = document.getElementById('login-link');
const loginModal = document.getElementById('login-modal');
const loginClose = document.getElementById('login-close');
const loginError = document.getElementById('login-error');
// User menu elements
const userMenu = document.getElementById('user-menu');
const avatarButton = document.getElementById('avatar-button');
const avatarImage = document.getElementById('avatar-image');
const userPopover = document.getElementById('user-popover');
const menuAssets = document.getElementById('menu-assets');
const menuOrder = document.getElementById('menu-order');
const menuSignout = document.getElementById('menu-signout');
// Step containers
const loginStepSelect = document.getElementById('login-step-select');
const loginStepForms = document.getElementById('login-step-forms');
const loginBack = document.getElementById('login-back');
const selectEmailOrPhone = document.getElementById('select-email-or-phone');
const selectApple = document.getElementById('select-apple');
const selectGoogle = document.getElementById('select-google');
// Tabs & OTP elements
const tabEmailOtp = document.getElementById('tab-email-otp');
const tabSmsOtp = document.getElementById('tab-sms-otp');
const formPassword = document.getElementById('login-form-password');
const formEmailOtp = document.getElementById('login-form-email-otp');
const formSmsOtp = document.getElementById('login-form-sms-otp');
const googleLoginBtn = document.getElementById('google-login');
const emailOtpEmail = document.getElementById('email-otp-email');
const emailOtpSend = document.getElementById('email-otp-send');
const emailOtpCode = document.getElementById('email-otp-code');
const emailOtpLogin = document.getElementById('email-otp-login');
const smsCountry = document.getElementById('sms-country');
const smsOtpPhone = document.getElementById('sms-otp-phone');
const smsOtpSend = document.getElementById('sms-otp-send');
const smsOtpCode = document.getElementById('sms-otp-code');
const smsOtpLogin = document.getElementById('sms-otp-login');
// Show debug panel immediately when ?debug=1 is present
if (isDebug && debugPanel && debugContent) {
  debugPanel.style.display = 'block';
  debugContent.textContent = 'Debug mode is ON. Upload an image and click Generate to capture request details here.';
}

// Three.js variables
let scene, camera, renderer, controls, model, wireframeMaterial;
let imageData = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
uploadBox && uploadBox.addEventListener('dragover', handleDragOver);
uploadBox && uploadBox.addEventListener('dragleave', handleDragLeave);
uploadBox && uploadBox.addEventListener('drop', handleDrop);
fileInput && fileInput.addEventListener('change', handleFileSelect);
resetButton && resetButton.addEventListener('click', resetUpload);
generateButton && generateButton.addEventListener('click', generate3DModel);
uploadClose && uploadClose.addEventListener('click', resetUpload);
 solidModeBtn && solidModeBtn.addEventListener('click', () => setModelMode('solid'));
 wireframeModeBtn && wireframeModeBtn.addEventListener('click', () => setModelMode('wireframe'));
 resetViewBtn && resetViewBtn.addEventListener('click', resetView);
downloadBtn && downloadBtn.addEventListener('click', downloadModel);
printBtn && printBtn.addEventListener('click', openPrintModal);
printClose && printClose.addEventListener('click', closePrintModal);
printCancel && printCancel.addEventListener('click', closePrintModal);
printSubmit && printSubmit.addEventListener('click', submitPrintOrder);
// Login events
loginLink && loginLink.addEventListener('click', (e) => { e.preventDefault(); openLoginModal(); });
loginClose && loginClose.addEventListener('click', closeLoginModal);
// User menu events
avatarButton && avatarButton.addEventListener('click', toggleUserPopover);
menuSignout && menuSignout.addEventListener('click', signOut);
// Step selection
selectEmailOrPhone && selectEmailOrPhone.addEventListener('click', () => { showFormsStep(); showLoginTab('sms-otp'); });
selectApple && selectApple.addEventListener('click', loginWithApple);
selectGoogle && selectGoogle.addEventListener('click', loginWithGoogle);
loginBack && loginBack.addEventListener('click', showSelectStep);
// Tabs
tabEmailOtp && tabEmailOtp.addEventListener('click', () => showLoginTab('email-otp'));
tabSmsOtp && tabSmsOtp.addEventListener('click', () => showLoginTab('sms-otp'));
// Email OTP
emailOtpSend && emailOtpSend.addEventListener('click', requestEmailCode);
emailOtpLogin && emailOtpLogin.addEventListener('click', loginWithEmailCode);
// SMS OTP
smsOtpSend && smsOtpSend.addEventListener('click', requestSmsCode);
smsOtpLogin && smsOtpLogin.addEventListener('click', loginWithSmsCode);
// Google
// (Google handled by selectGoogle)

function isAuthenticated() {
  try {
    const token = localStorage.getItem('POLLY_AUTH_TOKEN');
    return !!(token && token.length > 0);
  } catch (_) { return false; }
}

// Require authentication before sensitive actions like uploading
function requireAuthOrPrompt() {
  const authed = isAuthenticated();
  if (!authed) {
    try { showNotification('Please login to upload photos.', 'warning'); } catch(_) {}
    openLoginModal && openLoginModal();
    return false;
  }
  return true;
}

function setAuthHeaderFromStorage() {
  try {
    const token = localStorage.getItem('POLLY_AUTH_TOKEN');
    if (token) {
      window.POLLY_AUTH = window.POLLY_AUTH || { CUSTOM_HEADERS: {} };
      window.POLLY_AUTH.CUSTOM_HEADERS = window.POLLY_AUTH.CUSTOM_HEADERS || {};
      window.POLLY_AUTH.CUSTOM_HEADERS['Authorization'] = 'Bearer ' + token;
    }
  } catch (_) {}
}

function openLoginModal() {
  if (loginModal) {
    loginError && (loginError.style.display = 'none');
    loginModal.style.display = 'flex';
    showSelectStep();
  }
}

function closeLoginModal() {
  if (loginModal) loginModal.style.display = 'none';
}

function showLoginTab(name){
  if (!formEmailOtp || !formSmsOtp) return;
  formEmailOtp.style.display = (name === 'email-otp') ? 'flex' : 'none';
  formSmsOtp.style.display = (name === 'sms-otp') ? 'flex' : 'none';
}

function showSelectStep(){
  if (!loginStepSelect || !loginStepForms) return;
  loginStepSelect.style.display = 'block';
  loginStepForms.style.display = 'none';
}

function showFormsStep(){
  if (!loginStepSelect || !loginStepForms) return;
  loginStepSelect.style.display = 'none';
  loginStepForms.style.display = 'block';
}

// Disable continue buttons until code present
emailOtpCode && emailOtpCode.addEventListener('input', () => { emailOtpLogin.disabled = !(emailOtpCode.value && emailOtpCode.value.trim().length > 0); });
smsOtpCode && smsOtpCode.addEventListener('input', () => { smsOtpLogin.disabled = !(smsOtpCode.value && smsOtpCode.value.trim().length > 0); });

async function requestEmailCode(){
  const email = (emailOtpEmail && emailOtpEmail.value) ? emailOtpEmail.value.trim() : '';
  if (!email) return setLoginError('Please enter email');
  try {
    emailOtpSend.disabled = true;
    const url = (function(path){
      try {
        if (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function') {
          return window.POLLY_API.urlFrom(window.POLLY_AUTH_BASE || '', path);
        }
      } catch(_){ }
      return '/' + path.replace(/^\//,'');
    })('request-email-code');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ email }) });
    const txt = await res.text(); let json={}; try{ json = JSON.parse(txt); }catch(_){}
    if (!res.ok) throw new Error(json.error || 'Failed to send verification code');
    showNotification('Verification code sent to email', 'success');
  } catch(e){ setLoginError(e.message || 'Send failed'); }
  finally { emailOtpSend.disabled = false; }
}

async function loginWithEmailCode(){
  const email = (emailOtpEmail && emailOtpEmail.value) ? emailOtpEmail.value.trim() : '';
  const code = (emailOtpCode && emailOtpCode.value) ? emailOtpCode.value.trim() : '';
  if (!email || !code) return setLoginError('Please enter email and verification code');
  try {
    const url = (function(path){
      try {
        if (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function') {
          return window.POLLY_API.urlFrom(window.POLLY_AUTH_BASE || '', path);
        }
      } catch(_){ }
      return '/' + path.replace(/^\//,'');
    })('login-email-code');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ email, code }) });
    const txt = await res.text(); let json={}; try{ json = JSON.parse(txt); }catch(_){}
    if (!res.ok) throw new Error(json.error || 'Verification code sign-in failed');
    const token = json.token || json.access_token || (json.data && (json.data.token || json.data.access_token)) || '';
    if (!token) throw new Error('No token returned');
    try { localStorage.setItem('POLLY_AUTH_TOKEN', token); } catch(_){}
    setAuthHeaderFromStorage();
    closeLoginModal();
    showNotification('Signed in successfully', 'success');
    updateAuthUI();
    if (generateButton) { generateButton.disabled = false; }
    if (generateBtnText) generateBtnText.textContent = 'Generate';
  } catch(e){ setLoginError(e.message || 'Sign-in failed'); }
}

async function requestSmsCode(){
  let phone = (smsOtpPhone && smsOtpPhone.value) ? smsOtpPhone.value.trim() : '';
  const cc = (smsCountry && smsCountry.value) ? smsCountry.value : '';
  if (cc) phone = `${cc}${phone || ''}`;
  if (!phone) return setLoginError('Please enter phone number');
  try {
    smsOtpSend.disabled = true;
    const url = (function(path){
      try {
        if (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function') {
          return window.POLLY_API.urlFrom(window.POLLY_AUTH_BASE || '', path);
        }
      } catch(_){ }
      return '/' + path.replace(/^\//,'');
    })('request-sms-code');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ phone }) });
    const txt = await res.text(); let json={}; try{ json = JSON.parse(txt); }catch(_){}
    if (!res.ok) throw new Error(json.error || 'Failed to send verification code');
    showNotification('Verification code sent to phone', 'success');
  } catch(e){ setLoginError(e.message || 'Send failed'); }
  finally { smsOtpSend.disabled = false; }
}

async function loginWithSmsCode(){
  const phone = (smsOtpPhone && smsOtpPhone.value) ? smsOtpPhone.value.trim() : '';
  const code = (smsOtpCode && smsOtpCode.value) ? smsOtpCode.value.trim() : '';
  if (!phone || !code) return setLoginError('Please enter phone number and verification code');
  try {
    const url = (function(path){
      try {
        if (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function') {
          return window.POLLY_API.urlFrom(window.POLLY_AUTH_BASE || '', path);
        }
      } catch(_){ }
      return '/' + path.replace(/^\//,'');
    })('login-sms-code');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ phone, code }) });
    const txt = await res.text(); let json={}; try{ json = JSON.parse(txt); }catch(_){}
    if (!res.ok) throw new Error(json.error || 'Verification code sign-in failed');
    const token = json.token || json.access_token || (json.data && (json.data.token || json.data.access_token)) || '';
    if (!token) throw new Error('No token returned');
    try { localStorage.setItem('POLLY_AUTH_TOKEN', token); } catch(_){}
    setAuthHeaderFromStorage();
    closeLoginModal();
    showNotification('Signed in successfully', 'success');
    updateAuthUI();
    if (generateButton) { generateButton.disabled = false; }
    if (generateBtnText) generateBtnText.textContent = 'Generate';
  } catch(e){ setLoginError(e.message || 'Sign-in failed'); }
}

function loginWithGoogle(){
  try {
    const sp = new URLSearchParams(window.location.search);
    const forceDirect = (sp.get('forceGoogleDirect') === '1') || !!window.POLLY_GOOGLE_FORCE_DIRECT;
    const clientId = window.POLLY_GOOGLE_CLIENT_ID || sp.get('googleClientId');
    const scope = window.POLLY_GOOGLE_SCOPE || 'openid email profile';
    const responseType = window.POLLY_GOOGLE_RESPONSE_TYPE || 'token id_token';
    const redirectUri = getGoogleRedirectUri();

    if (forceDirect && clientId) {
      const endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
      const url = new URL(endpoint);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', responseType);
      url.searchParams.set('scope', scope);
      const prompt = window.POLLY_GOOGLE_PROMPT || sp.get('googlePrompt');
      if (prompt) url.searchParams.set('prompt', prompt);
      if ((responseType || '').includes('id_token')) {
        const givenNonce = sp.get('nonce');
        const nonce = givenNonce || (Math.random().toString(36).slice(2) + Date.now().toString(36));
        try { sessionStorage.setItem('POLLY_OAUTH_NONCE', nonce); } catch(_){}
        url.searchParams.set('nonce', nonce);
      }
      window.location.href = url.toString();
      return;
    }

    const base = (function(path){
      try {
        if (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function') {
          return window.POLLY_API.urlFrom(window.POLLY_AUTH_BASE || '', path);
        }
      } catch(_){ }
      return '/' + path.replace(/^\//,'');
    })('oauth/google/start');
    const url = base + (base.includes('?') ? '&' : '?') + 'redirect_uri=' + encodeURIComponent(redirectUri);
    window.location.href = url;
  } catch(_) {
    const base = (window.POLLY_API && typeof window.POLLY_API.url === 'function') ? window.POLLY_API.url('oauth/google/start') : '/oauth/google/start';
    const redirectUri = getGoogleRedirectUri();
    const url = base + (base.includes('?') ? '&' : '?') + 'redirect_uri=' + encodeURIComponent(redirectUri);
    window.location.href = url;
  }
}

function loginWithApple(){
  try {
    const sp = new URLSearchParams(window.location.search);
    const forceDirect = (sp.get('forceAppleDirect') === '1') || !!window.POLLY_APPLE_FORCE_DIRECT;
    const clientId = window.POLLY_APPLE_CLIENT_ID || sp.get('appleClientId');
    const scope = window.POLLY_APPLE_SCOPE || 'name email';
    const responseType = window.POLLY_APPLE_RESPONSE_TYPE || 'id_token';
    const responseMode = window.POLLY_APPLE_RESPONSE_MODE || 'fragment';
    const redirectUri = getGoogleRedirectUri();

    if (forceDirect && clientId) {
      const endpoint = 'https://appleid.apple.com/auth/authorize';
      const url = new URL(endpoint);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', responseType);
      url.searchParams.set('response_mode', responseMode);
      url.searchParams.set('scope', scope);
      if ((responseType || '').includes('id_token')) {
        const givenNonce = sp.get('nonce');
        const nonce = givenNonce || (Math.random().toString(36).slice(2) + Date.now().toString(36));
        try { sessionStorage.setItem('POLLY_OAUTH_NONCE', nonce); } catch(_){ }
        url.searchParams.set('nonce', nonce);
      }
      const state = sp.get('state') || '';
      if (state) url.searchParams.set('state', state);
      window.location.href = url.toString();
      return;
    }

    const base = (function(path){
      try {
        if (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function') {
          return window.POLLY_API.urlFrom(window.POLLY_AUTH_BASE || '', path);
        }
      } catch(_){ }
      return '/' + path.replace(/^\//,'');
    })('oauth/apple/start');
    const url = base + (base.includes('?') ? '&' : '?') + 'redirect_uri=' + encodeURIComponent(redirectUri);
    window.location.href = url;
  } catch(_) {
    const base = (window.POLLY_API && typeof window.POLLY_API.url === 'function') ? window.POLLY_API.url('oauth/apple/start') : '/oauth/apple/start';
    const redirectUri = getGoogleRedirectUri();
    const url = base + (base.includes('?') ? '&' : '?') + 'redirect_uri=' + encodeURIComponent(redirectUri);
    window.location.href = url;
  }
}

function getGoogleRedirectUri(){
  try {
    const sp = new URLSearchParams(window.location.search);
    const override = window.POLLY_GOOGLE_REDIRECT_URI || sp.get('googleRedirectUri');
    if (!override) {
      const metaEl = document.querySelector('meta[name="polly-google-redirect-uri"]');
      const metaVal = metaEl && metaEl.getAttribute('content');
      if (metaVal) return metaVal;
    }
    if (override) return override;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      const devPort = String(window.POLLY_GOOGLE_DEV_REDIRECT_PORT || '5500');
      return `http://${host}:${devPort}/`;
    }
    return window.location.origin + '/';
  } catch(_) {
    return window.location.origin + '/';
  }
}

function setLoginError(msg){
  if (loginError) { loginError.textContent = msg; loginError.style.display = 'block'; }
}

// Ensure Three.js addon modules are available under CSP-safe loading
async function ensureThreeAddonsLoaded() {
  // Ensure core THREE is available via ESM without unsafe-eval
  try {
    if (!window.THREE) {
      const core = await import('https://cdn.skypack.dev/three@0.132.2');
      window.THREE = core;
    }
  } catch (_) {}
  // Load addons from Skypack (rewrites bare imports)
  try {
    if (!window.OrbitControls) {
      const mod = await import('https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js');
      window.OrbitControls = mod.OrbitControls;
    }
  } catch (_) {}
  try {
    if (!window.GLTFLoader) {
      const mod = await import('https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js');
      window.GLTFLoader = mod.GLTFLoader;
    }
  } catch (_) {}
}

async function waitForGlobals(keys, timeoutMs = 10000) {
  const start = Date.now();
  while (true) {
    const ready = keys.every(k => !!window[k]);
    if (ready) return true;
    if (Date.now() - start > timeoutMs) return false;
    await new Promise(r => setTimeout(r, 50));
  }
}

// Lazy boot: only load Three.js addons and init scene when needed
async function bootThreeIfNeeded() {
  if (renderer) return true;
  await ensureThreeAddonsLoaded();
  const ready = await waitForGlobals(['THREE', 'OrbitControls', 'GLTFLoader']);
  if (!ready) {
    showNotification('Three.js modules failed to load. Please check network.', 'error');
    return false;
  }
  initThreeJS();
  return true;
}

// Initialize the application (no heavy libs on first paint)
async function initApp() {
    // Default preview state when no model has been generated
    setPreviewState('default');
    // Initialize auth from localStorage
    setAuthHeaderFromStorage();
    // Capture tokens returned via OAuth redirects in URL
    captureTokenFromUrl();
    // Capture id_token specifically for avatar rendering
    captureIdTokenFromUrl();
    // Update nav based on auth state
    updateAuthUI();
    // Allow generation immediately
    if (generateButton) { generateButton.disabled = false; }
    if (generateBtnText) generateBtnText.textContent = 'Generate';
    // If on order page, render orders dynamically
    try {
      const isOrderPage = document.querySelector('.orders-section');
      if (isOrderPage) renderOrders();
    } catch(_) {}
  }

function captureTokenFromUrl(){
  try {
    const u = new URL(window.location.href);
    const params = new URLSearchParams(u.search);
    const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''));
    const accessToken =
      params.get('token') ||
      params.get('access_token') ||
      hashParams.get('token') ||
      hashParams.get('access_token');
    const idToken = params.get('id_token') || hashParams.get('id_token');
    if (accessToken) {
      try { localStorage.setItem('POLLY_AUTH_TOKEN', accessToken); } catch(_){}
      setAuthHeaderFromStorage();
    }
    if (idToken) {
      try { localStorage.setItem('POLLY_ID_TOKEN', idToken); } catch(_){}
    }
    // Clean token params from URL
    params.delete('token'); params.delete('access_token'); params.delete('id_token');
    const newSearch = params.toString();
    history.replaceState({}, document.title, u.pathname + (newSearch ? ('?' + newSearch) : '') );
  } catch(_){}
}

function captureIdTokenFromUrl(){
  try {
    const u = new URL(window.location.href);
    const params = new URLSearchParams(u.search);
    const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''));
    const idToken = params.get('id_token') || hashParams.get('id_token');
    if (idToken) {
      try { localStorage.setItem('POLLY_ID_TOKEN', idToken); } catch(_){}
      // Clean id_token from URL (if present)
      params.delete('id_token');
      const newSearch = params.toString();
      history.replaceState({}, document.title, u.pathname + (newSearch ? ('?' + newSearch) : '') );
    }
  } catch(_){}
}

function parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (b64url.length % 4)) % 4;
    const padded = b64url + '='.repeat(padLen);
    const json = atob(padded);
    return JSON.parse(json);
  } catch(_) { return null; }
}

function updateAuthUI(){
  const authed = isAuthenticated();
  if (authed) {
    if (loginLink) loginLink.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    let pic = '';
    try {
      const idToken = localStorage.getItem('POLLY_ID_TOKEN');
      const claims = idToken ? parseJwt(idToken) : null;
      pic = (claims && (claims.picture || claims.avatar)) || '';
    } catch(_){}
    const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EEC2F8"/><stop offset="1" stop-color="#FFC4C8"/></linearGradient></defs><rect width="64" height="64" rx="32" fill="#fff"/><circle cx="32" cy="26" r="12" fill="url(#g)"/><path d="M16 52c0-9 7-16 16-16s16 7 16 16" fill="url(#g)"/></svg>');
    if (avatarImage) {
      try {
        avatarImage.src = fallbackSvg; // default to fallback to avoid broken image
        avatarImage.referrerPolicy = 'no-referrer';
        avatarImage.onerror = function(){ this.onerror = null; this.src = fallbackSvg; };
        if (pic) { avatarImage.src = pic; }
      } catch(_){ }
    }
  } else {
    if (loginLink) loginLink.style.display = 'inline-flex';
    if (userMenu) { userMenu.style.display = 'none'; }
    if (userPopover) userPopover.style.display = 'none';
  }
}

function toggleUserPopover(e){
  e && e.preventDefault();
  // Avoid bubbling to document click that may immediately close
  e && e.stopPropagation && e.stopPropagation();
  if (!userPopover) return;
  // Use computed style to correctly detect initial state ('' vs 'none')
  const isShown = window.getComputedStyle(userPopover).display !== 'none';
  if (isShown) {
    userPopover.style.display = 'none';
    userPopover.classList.remove('is-floating');
  } else {
    userPopover.style.display = 'block';
    userPopover.classList.add('is-floating');
  }
  if (!isShown) {
    const onDocClick = (evt) => {
      const target = evt.target;
      // Close only when clicking outside both popover and avatar button
      if (!userPopover.contains(target) && !(avatarButton && avatarButton.contains(target))) {
        userPopover.style.display = 'none';
        userPopover.classList.remove('is-floating');
        document.removeEventListener('click', onDocClick);
      }
    };
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }
}

function signOut(){
  try { localStorage.removeItem('POLLY_AUTH_TOKEN'); } catch(_){}
  try { localStorage.removeItem('POLLY_ID_TOKEN'); } catch(_){}
  try {
    if (window.POLLY_AUTH && window.POLLY_AUTH.CUSTOM_HEADERS) {
      delete window.POLLY_AUTH.CUSTOM_HEADERS['Authorization'];
    }
  } catch(_){}
  updateAuthUI();
  showNotification('Signed out', 'success');
}

// File Upload Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadBox.classList.remove('drag-over');
  // Block upload when not logged in
  if (!requireAuthOrPrompt()) { return; }
  
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0];
    if (isValidImageFile(file)) {
      processImageFile(file);
        } else {
            showNotification('Please upload a valid image file.', 'error');
        }
    }
}

function handleFileSelect(e) {
    // Block upload when not logged in
    if (!requireAuthOrPrompt()) {
        try { fileInput && (fileInput.value = ''); } catch(_) {}
        return;
    }
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (isValidImageFile(file)) {
            processImageFile(file);
        } else {
            showNotification('Please upload a valid image file (JPEG, PNG, or WebP).', 'error');
        }
    }
}

function isValidImageFile(file) {
    // 放宽类型校验：接受所有 image/*；若缺少 MIME，则按扩展名兜底
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    const name = (file.name || '').toLowerCase();
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name);
}

function processImageFile(file) {
    // Check image resolution
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = function() {
        if (img.width < 500 || img.height < 500) {
            if (confirm('Low resolution may affect model accuracy. Continue?')) {
                displayUploadedImage(objectUrl);
                // Convert image to base64 for API request
                const reader = new FileReader();
                reader.onload = (e) => {
                    imageData = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                URL.revokeObjectURL(objectUrl);
            }
        } else {
            displayUploadedImage(objectUrl);
            // Convert image to base64 for API request
            const reader = new FileReader();
            reader.onload = (e) => {
                imageData = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    
    img.src = objectUrl;
}

function displayUploadedImage(src) {
    uploadedImage.src = src;
    uploadedImageContainer.style.display = 'block';
    document.querySelector('.upload-placeholder').style.display = 'none';
    const uploadBrowse = document.querySelector('.upload-browse');
    if (uploadBrowse) uploadBrowse.style.display = 'none';
    if (uploadArea) uploadArea.classList.add('has-image');
    // 使用右上角关闭按钮，隐藏旧 Reset
    resetButton.style.display = 'none';
    generateButton.style.display = 'inline-block';
    // Update button copy after upload
    resetButton.textContent = 'Delete';
    // Temporarily allow generation without login
    if (generateBtnText) generateBtnText.textContent = 'Generate';
    generateButton.disabled = false;
  }

function resetUpload() {
    uploadedImageContainer.style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    const uploadBrowse = document.querySelector('.upload-browse');
    if (uploadBrowse) uploadBrowse.style.display = 'flex';
    if (uploadArea) uploadArea.classList.remove('has-image');
    fileInput.value = '';
    uploadedImage.src = '';
    imageData = null;
    // Optional: revert button text when no upload is present
    if (resetButton) resetButton.textContent = 'Reset';
    if (generateBtnText) generateBtnText.textContent = 'Generate';
    if (generateButton) generateButton.style.display = 'none';
    // Hide result image section
    const resultSection = document.getElementById('result-section');
    const resultImage = document.getElementById('result-image');
    const downloadImageButton = document.getElementById('download-image-button');
    if (resultSection) resultSection.style.display = 'none';
    if (resultImage) resultImage.src = '';
    if (downloadImageButton) downloadImageButton.disabled = true;
    // Reset preview area to default state
    setPreviewState('default');
}

function removeBackground() {
    // In a real implementation, this would call an API to remove the background
    // For demo purposes, we'll simulate a loading state and then show a success message
    removeBgBtn.disabled = true;
    removeBgBtn.textContent = 'Processing...';
    
    setTimeout(() => {
        // Simulate background removal (in a real app, this would be an actual API call)
        showNotification('Background removed successfully!', 'success');
        removeBgBtn.disabled = false;
        removeBgBtn.textContent = 'Remove Background';
    }, 2000);
}

// 3D Model Generation
async function generate3DModel() {
    if (!uploadedImage.src) {
        showNotification('Please upload an image first.', 'error');
        return;
    }
    
    // Change button state
    generateButton.disabled = true;
    if (generateBtnText) generateBtnText.textContent = 'Generating...';
    
    // Move preview area to loading state
    setPreviewState('loading');
    
    // Analyze + preprocess, then compress to control payload size
    previewLoadingText && (previewLoadingText.textContent = 'Analyzing & pre-processing image...');
    const baseIsSameOrigin = (window.POLLY_API && window.POLLY_API.BASE === '/');
    let maxDim = baseIsSameOrigin ? 900 : 1280;
    let quality = baseIsSameOrigin ? 0.7 : 0.85;
    let imgMetrics = computeImageMetrics(uploadedImage);
    const preCanvas = preprocessImageWithMetrics(uploadedImage, imgMetrics);
    const sourceEl = preCanvas || uploadedImage;
    let compressedDataUrl = compressSourceToDataURL(sourceEl, maxDim, quality, true);
    // If still large, step down progressively
    const sizeLimitChars = 1800000; // ~1.8MB in base64 characters to stay well under limits
    let base64Len = (compressedDataUrl || '').length;
    if (base64Len > sizeLimitChars) {
      maxDim = 720; quality = 0.62;
      compressedDataUrl = compressSourceToDataURL(sourceEl, maxDim, quality, true);
      base64Len = compressedDataUrl.length;
    }
    if (base64Len > sizeLimitChars) {
      maxDim = 640; quality = 0.55;
      compressedDataUrl = compressSourceToDataURL(sourceEl, maxDim, quality, true);
      base64Len = compressedDataUrl.length;
    }

    // Ensure 3D libs are ready for any preview work
    const booted = await bootThreeIfNeeded();
    if (!booted) {
      generateButton.disabled = false;
      if (generateBtnText) generateBtnText.textContent = 'Generate';
      setPreviewState('default');
      return;
    }

    // Mock mode: skip network, load a local sample GLB to verify frontend
    if (isMock) {
        previewLoadingText && (previewLoadingText.textContent = 'Loading sample model (mock)...');
        try {
            const start = Date.now();
            // Use a bundled GLB from repo root
            const sample = '/inspiration-1.glb';
            loadGLBModel(sample);
            const duration = Date.now() - start;
            // Record a mock attempt for debug panel
            window.POLLY_DEBUG_LAST = {
              attempts: [{
                url: 'mock://local-sample-glb',
                status: 200,
                statusText: 'OK (mock)',
                durationMs: duration,
                blobSize: null
              }]
            };
            updateDebugPanel();
            generateButton.disabled = false;
            if (generateBtnText) generateBtnText.textContent = 'Generate';
            showNotification('Model generated successfully! (mock)', 'success');
            return;
        } catch (e) {
            console.error('Mock load failed', e);
            showNotification('Mock model load failed. Check local GLB files.', 'error');
            setPreviewState('default');
            generateButton.disabled = false;
            if (generateBtnText) generateBtnText.textContent = 'Generate';
            updateDebugPanel(e);
            return;
        }
    }
    
    // Extract base64 data from the compressed Data URL
    const base64Data = compressedDataUrl.split(',')[1];
    const mimeMatch = compressedDataUrl.match(/^data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : null;
    
    // Prepare the request data (兼容不同后端约定)
    const faceParams = new URLSearchParams(window.location.search);
    const facesOverrideStr = faceParams.get('faceCount') || faceParams.get('faces');
    const faceCountOverride = facesOverrideStr ? Math.max(10000, parseInt(facesOverrideStr, 10) || 0) : null;
    const requestData = {
        // 为兼容不同后端约定，同时传递常见字段名
        image_base64: base64Data, // Vercel同源代理及部分后端约定
        image: base64Data,        // 直连后端常见约定
        base64: base64Data,       // 备用字段，一些后端使用此键
        image_data_url: compressedDataUrl, // 完整 data URL，部分后端需要
        data_url: compressedDataUrl        // 别名以增加兼容性
    };
    if (mimeType) {
        requestData.mime_type = mimeType; // 例如 image/jpeg、image/png、image/webp
    }
    if (faceCountOverride && isFinite(faceCountOverride)) {
        requestData.face_count = faceCountOverride;
    }
    // Inject dynamic parameters based on image metrics
    const dynamicParams = chooseDynamicParams(imgMetrics);
    if (!requestData.face_count && isFinite(dynamicParams.face_count)) {
      requestData.face_count = dynamicParams.face_count;
    }
    requestData.depth_weight = dynamicParams.depth_weight;
    requestData.edge_regularization = dynamicParams.edge_regularization;
    requestData.shadow_suppression = dynamicParams.shadow_suppression;
    requestData.highlight_suppression = dynamicParams.highlight_suppression;
    requestData.scene_type = dynamicParams.scene_type;
    requestData.quality_preset = dynamicParams.quality_preset;
    requestData.hints = dynamicParams.hints;
    // Guard: strip any prompt-like fields to avoid upstream validation issues
    try {
      delete requestData.prompt;
      delete requestData.negative_prompt;
      if (requestData.hints && typeof requestData.hints === 'object') {
        delete requestData.hints.prompt;
        delete requestData.hints.negative_prompt;
      }
    } catch(_) {}
    
    // Build API endpoints from runtime config (default same-origin)
    const primaryUrl = (window.POLLY_API && typeof window.POLLY_API.url === 'function')
      ? window.POLLY_API.url('generate')
      : '/generate';
    const fallbackUrl = (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function' && window.POLLY_API.hasFallback && window.POLLY_API.hasFallback())
      ? window.POLLY_API.urlFrom(window.POLLY_API.FALLBACK_BASE, 'generate')
      : null;

    // 若目标是你提供的 IP 后端且未显式传 faces，则默认附带较低的 face_count 以降低上游压力
    try {
      if (!requestData.face_count && primaryUrl) {
        const purl = new URL(primaryUrl, window.location.origin);
        if ((purl.host || '').includes('111.229.71.58:8086')) {
          requestData.face_count = 30000;
        }
      }
    } catch(_) {}

    // 如果主端点是 HTTPS + 纯 IP（常见证书/网络问题场景），优先尝试回退端点
    let firstUrl = primaryUrl;
    let secondUrl = fallbackUrl;
    try {
      const p = new URL(primaryUrl, window.location.origin);
      const isHttps = (p.protocol === 'https:');
      const isIpHost = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(p.hostname);
      if (isHttps && isIpHost && fallbackUrl) {
        firstUrl = fallbackUrl;
        secondUrl = primaryUrl;
        console.warn('[Generate] Prefer fallback first due to HTTPS+IP origin:', p.href);
      }
    } catch(_) {}
    // 允许通过参数强制优先使用回退端点：?fallbackFirst=1 或 window.POLLY_PREFER_FALLBACK_FIRST=true
    try {
      const qs = new URLSearchParams(window.location.search);
      const prefer = (qs.get('fallbackFirst') === '1') || (window.POLLY_PREFER_FALLBACK_FIRST === true);
      if (prefer && fallbackUrl) {
        firstUrl = fallbackUrl;
        secondUrl = primaryUrl;
        console.warn('[Generate] fallbackFirst=1 active: trying fallback before primary');
      }
    } catch(_) {}

    // Timeout control (configurable via URL ?timeout or global window.POLLY_TIMEOUT_MS)
    const controller = new AbortController();
    const searchParams = new URLSearchParams(window.location.search);
    const disableFormRetry = (searchParams.get('formRetry') === '0') || (window.POLLY_DISABLE_FORM_RETRY === true);
    const timeoutOverrideStr = searchParams.get('timeout') || searchParams.get('timeoutMs');
    const timeoutOverride = timeoutOverrideStr ? parseInt(timeoutOverrideStr, 10) : null;
    const runtimeTimeout = (typeof window.POLLY_TIMEOUT_MS === 'number' && window.POLLY_TIMEOUT_MS > 0)
      ? window.POLLY_TIMEOUT_MS
      : null;
    const timeoutMs = (timeoutOverride && timeoutOverride > 0)
      ? timeoutOverride
      : (runtimeTimeout || 300000); // default 5 min
    let timeoutId = null;
    if (timeoutMs && timeoutMs > 0 && isFinite(timeoutMs)) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    if (previewEstimateEl) {
      let estimateText = '≈ 20–60s';
      if (timeoutMs >= 300000) estimateText = '≈ 3–5 min';
      else if (timeoutMs >= 180000) estimateText = '≈ 1–3 min';
      previewEstimateEl.textContent = estimateText;
    }
    previewLoadingText && (previewLoadingText.textContent = 'Generating...');

    // Async task mode: create task and poll status until completion
    const asyncMode = (searchParams.get('async') === '1') || (window.POLLY_ASYNC_MODE === true);
    if (asyncMode) {
      const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      const extraHeaders = (window.POLLY_AUTH && typeof window.POLLY_AUTH.buildExtraHeaders === 'function')
        ? window.POLLY_AUTH.buildExtraHeaders()
        : ((window.POLLY_AUTH && typeof window.POLLY_AUTH.buildBypassHeaders === 'function') ? window.POLLY_AUTH.buildBypassHeaders() : {});
      const createUrl = (window.POLLY_API && typeof window.POLLY_API.taskCreateUrl === 'function')
        ? window.POLLY_API.taskCreateUrl()
        : ((window.POLLY_API && typeof window.POLLY_API.url === 'function') ? window.POLLY_API.url('tasks') : '/tasks');
      const statusUrlFromId = (id) => {
        if (window.POLLY_API && typeof window.POLLY_API.taskStatusUrl === 'function') {
          return window.POLLY_API.taskStatusUrl(id);
        }
        if (window.POLLY_API && typeof window.POLLY_API.url === 'function') {
          return window.POLLY_API.url('tasks/' + String(id));
        }
        return '/tasks/' + String(id);
      };
      const fetchOptsCreate = {
        method: 'POST',
        headers: Object.assign({}, baseHeaders, extraHeaders),
        body: JSON.stringify(requestData),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
      };

      // Debug: capture outgoing JSON payload summary (async create)
      try {
        window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
        window.POLLY_DEBUG_LAST.outgoing = {
          mode: 'json',
          jsonKeys: Object.keys(requestData || {}),
          hasPrompt: ('prompt' in (requestData||{})) || ('negative_prompt' in (requestData||{})) || (requestData && requestData.hints && (('prompt' in requestData.hints) || ('negative_prompt' in requestData.hints)))
        };
      } catch(_){}

      previewLoadingText && (previewLoadingText.textContent = 'Submitting task...');
      const startCreate = Date.now();
      fetch(createUrl, fetchOptsCreate)
        .then(async (res) => {
          const duration = Date.now() - startCreate;
          window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
          window.POLLY_DEBUG_LAST.attempts.push({ url: createUrl, status: res.status, statusText: res.statusText, durationMs: duration });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            // If tasks endpoint not found, gracefully fallback to sync /generate
            if (res.status === 404) {
              previewLoadingText && (previewLoadingText.textContent = 'Async unavailable, switching to direct generate...');
              // Reuse sync flow
              return makeRequestWithFallback(primaryUrl, fallbackUrl, fetchOpts)
                .then(blob => {
                  if (timeoutId) clearTimeout(timeoutId);
                  // Preview via ArrayBuffer to avoid blob URL ERR_ABORTED
                  try {
                    blob.arrayBuffer().then(ab => loadGLBArrayBuffer(ab));
                  } catch (e) {
                    console.warn('ArrayBuffer preview failed, falling back to blob URL:', e);
                    const fallbackUrl = URL.createObjectURL(blob);
                    window.modelUrl = fallbackUrl;
                    loadGLBModel(fallbackUrl);
                  }
                  // Always create blob URL for download
                  const modelUrl = URL.createObjectURL(blob);
                  window.modelUrl = modelUrl;
                  generateButton.disabled = false;
                  if (generateBtnText) generateBtnText.textContent = 'Generate';
                  showNotification('Model generated successfully! (sync fallback)', 'success');
                  updateDebugPanel();
                  // Prevent subsequent then from running
                  return Promise.reject('__SYNC_FALLBACK_DONE__');
                })
                .catch(err => {
                  if (timeoutId) clearTimeout(timeoutId);
                  console.error('Fallback sync flow error:', err);
                  setPreviewState('default');
                  generateButton.disabled = false;
                  if (generateBtnText) generateBtnText.textContent = 'Generate';
                  const msg = (err && err.message) ? err.message : 'Failed to generate 3D model.';
                  showNotification(msg + ' Please try again.', 'error');
                  updateDebugPanel(err);
                  return Promise.reject('__SYNC_FALLBACK_DONE__');
                });
            }
            throw new Error(`Task create failed: HTTP ${res.status} ${res.statusText}${text ? ' - ' + text : ''}`);
          }
          const data = await res.json().catch(() => ({}));
          const taskId = data.task_id || data.id || data.job_id || data.jobId;
          if (!taskId) throw new Error('No task id returned from backend');
          // Start polling
          let pollIntervalMs = 5000;
          let timer = null;
          let overallStart = Date.now();
          previewLoadingText && (previewLoadingText.textContent = 'Queued...');
          return await new Promise((resolve, reject) => {
            const pollOnce = async () => {
              if (Date.now() - overallStart > timeoutMs) {
                return reject(new Error('Task polling timeout'));
              }
              const su = statusUrlFromId(taskId);
              const startPoll = Date.now();
              try {
                const pollRes = await fetch(su, { method: 'GET', headers: Object.assign({}, extraHeaders), cache: 'no-store', mode: 'cors', signal: controller.signal });
                const durationPoll = Date.now() - startPoll;
                window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
                window.POLLY_DEBUG_LAST.attempts.push({ url: su, status: pollRes.status, statusText: pollRes.statusText, durationMs: durationPoll });
                const text = await pollRes.text();
                let json = {};
                try { json = JSON.parse(text); } catch (_) {}
                // Backend status conventions: status/state: queued|processing|succeeded|completed|failed
                const st = json.status || json.state || json.phase;
                const eta = json.eta_seconds || json.eta || null;
                if (previewLoadingText) {
                  if (st === 'queued') previewLoadingText.textContent = 'Queued...';
                  else if (st === 'processing' || st === 'running') previewLoadingText.textContent = 'Processing...';
                  else if (eta && isFinite(eta)) previewLoadingText.textContent = `Processing... (≈ ${eta}s)`;
                }
                if (st === 'succeeded' || st === 'completed') {
                  // Resolve result
                  const url = json.result_url || json.glb_url || json.url;
                  const base64 = (json.result && (json.result.glb_base64 || json.result.glb_data_url)) || json.glb_base64 || json.glb_data_url;
                  if (url) {
                    const bstart = Date.now();
                    const bres = await fetch(url, { cache: 'no-store', mode: 'cors' });
                    const bd = Date.now() - bstart;
                    window.POLLY_DEBUG_LAST.attempts.push({ url, status: bres.status, statusText: bres.statusText, durationMs: bd });
                    if (!bres.ok) {
                      const t = await bres.text().catch(() => '');
                      return reject(new Error(`Result fetch failed: HTTP ${bres.status} ${bres.statusText}${t ? ' - ' + t : ''}`));
                    }
                    const blob = await bres.blob();
                    return resolve(blob);
                  } else if (base64) {
                    try {
                      const raw = base64.includes(',') ? base64.split(',')[1] : base64;
                      const bytes = atob(raw);
                      const arr = new Uint8Array(bytes.length);
                      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                      const blob = new Blob([arr], { type: 'model/gltf-binary' });
                      return resolve(blob);
                    } catch (e) {
                      return reject(new Error('Invalid base64 result from backend'));
                    }
                  } else if (json.result && json.result.bytes) {
                    const blob = new Blob([json.result.bytes], { type: 'model/gltf-binary' });
                    return resolve(blob);
                  } else {
                    return reject(new Error('No result in completed task'));
                  }
                }
                if (st === 'failed' || st === 'error') {
                  const msg = json.error || json.message || 'Task failed';
                  return reject(new Error(msg));
                }
                // Continue polling
                if (!timer) {
                  timer = setInterval(pollOnce, pollIntervalMs);
                }
              } catch (e) {
                return reject(e);
              }
            };
            pollOnce();
          });
        })
        .then(async (blob) => {
          if (timeoutId) clearTimeout(timeoutId);
          // Preview from ArrayBuffer to avoid blob URL ERR_ABORTED
          try {
            const ab = await blob.arrayBuffer();
            loadGLBArrayBuffer(ab);
          } catch (e) {
            console.warn('ArrayBuffer preview failed, falling back to blob URL:', e);
            const modelUrlFallback = URL.createObjectURL(blob);
            window.modelUrl = modelUrlFallback;
            loadGLBModel(modelUrlFallback);
          }
          // Always create blob URL for download
          const modelUrl = URL.createObjectURL(blob);
          window.modelUrl = modelUrl;
          generateButton.disabled = false;
          if (generateBtnText) generateBtnText.textContent = 'Generate';
          showNotification('Model generated successfully!', 'success');
          updateDebugPanel();
        })
        .catch(err => {
          if (timeoutId) clearTimeout(timeoutId);
          const isAbort = (err && err.name === 'AbortError');
          if (isAbort) {
            console.warn('Async generate aborted');
            setPreviewState('default');
            generateButton.disabled = false;
            if (generateBtnText) generateBtnText.textContent = 'Generate';
            updateDebugPanel(err);
            return;
          }
          console.error('Async flow error:', err);
          setPreviewState('default');
          generateButton.disabled = false;
          if (generateBtnText) generateBtnText.textContent = 'Generate';
          const msg = (err && err.message) ? err.message : 'Failed to generate 3D model.';
          showNotification(msg + ' Please try again.', 'error');
          updateDebugPanel(err);
        });
      return;
    }

    // Common fetch options
    const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'model/gltf-binary,application/octet-stream,application/json'
    };
    const extraHeaders = (window.POLLY_AUTH && typeof window.POLLY_AUTH.buildExtraHeaders === 'function')
      ? window.POLLY_AUTH.buildExtraHeaders()
      : ((window.POLLY_AUTH && typeof window.POLLY_AUTH.buildBypassHeaders === 'function') ? window.POLLY_AUTH.buildBypassHeaders() : {});
    const fetchOpts = {
        method: 'POST',
        headers: Object.assign({}, baseHeaders, extraHeaders),
        body: JSON.stringify(requestData),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
    };

    // Debug: capture outgoing JSON summary for sync path
    try {
      window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
      window.POLLY_DEBUG_LAST.outgoing = {
        mode: 'json',
        jsonKeys: Object.keys(requestData || {}),
        hasPrompt: ('prompt' in (requestData||{})) || ('negative_prompt' in (requestData||{})) || (requestData && requestData.hints && (('prompt' in requestData.hints) || ('negative_prompt' in requestData.hints)))
      };
    } catch(_){}

    // Same-origin now proxies to real backend: send full JSON payload

    // Prefer form-data first when enabled (improves compatibility with IP upstreams)
    if (window.POLLY_PREFER_FORMDATA_FIRST === true) {
      try {
        console.warn('Prefer form-data first: attempting multipart upload');
        previewLoadingText && (previewLoadingText.textContent = 'Uploading image (form-data)...');
        // Build image blob from base64
        let imgBlob = null;
        try {
          const raw = base64Data;
          const bytes = atob(raw);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          imgBlob = new Blob([arr], { type: mimeType || 'image/webp' });
        } catch (_) {}
        const form = new FormData();
        if (imgBlob) {
          const ext = String((mimeType||'image/webp')).split('/')[1] || 'webp';
          form.append('image_file', imgBlob, 'upload.' + ext);
          form.append('file', imgBlob, 'upload.' + ext);
        }
        form.append('mime_type', mimeType || 'image/webp');
        // Include common fields
        if (typeof requestData.image_base64 === 'string') form.append('image_base64', requestData.image_base64);
        if (typeof requestData.image === 'string') form.append('image', requestData.image);
        if (typeof requestData.base64 === 'string') form.append('base64', requestData.base64);
        if (typeof requestData.image_data_url === 'string') form.append('image_data_url', requestData.image_data_url);
        if (typeof requestData.data_url === 'string') form.append('data_url', requestData.data_url);
        // Append params; serialize objects as JSON
        (function(){
          const keys = ['face_count','depth_weight','edge_regularization','shadow_suppression','highlight_suppression','scene_type','quality_preset','hints'];
          keys.forEach(k => {
            if (typeof requestData[k] === 'undefined' || requestData[k] === null) return;
            const v = requestData[k];
            if (typeof v === 'object') { try { form.append(k, JSON.stringify(v)); } catch(_) { form.append(k, String(v)); } }
            else { form.append(k, String(v)); }
          });
          // Explicitly avoid prompt-like keys if present accidentally
          try {
            form.delete('prompt');
            form.delete('negative_prompt');
          } catch(_){}
        })();
        const baseHeadersForm = { 'Accept': 'model/gltf-binary,application/octet-stream,application/json' };
        const fetchOptsForm = {
          method: 'POST',
          headers: Object.assign({}, baseHeadersForm, extraHeaders),
          body: form,
          cache: 'no-store',
          credentials: 'omit',
          mode: 'cors'
        };
        // Debug: capture outgoing form-data summary
        try {
          const fk = Array.from(form.keys());
          window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
          window.POLLY_DEBUG_LAST.outgoing = {
            mode: 'form',
            formKeys: fk,
            hasPrompt: fk.includes('prompt') || fk.includes('negative_prompt')
          };
        } catch(_){}
        const blob = await makeRequestWithFallback(firstUrl, secondUrl, fetchOptsForm);
        if (timeoutId) clearTimeout(timeoutId);
        try {
          const ab = await blob.arrayBuffer();
          loadGLBArrayBuffer(ab);
        } catch (e) {
          console.warn('ArrayBuffer preview failed, falling back to blob URL:', e);
          const modelUrlFallback = URL.createObjectURL(blob);
          window.modelUrl = modelUrlFallback;
          loadGLBModel(modelUrlFallback);
        }
        const modelUrl = URL.createObjectURL(blob);
        window.modelUrl = modelUrl;
        generateButton.disabled = false;
        if (generateBtnText) generateBtnText.textContent = 'Generate';
        showNotification('Model generated successfully! (form first)', 'success');
        updateDebugPanel();
        return; // success; skip JSON path
      } catch (errFormFirst) {
        console.warn('Form-data first attempt failed; retrying with JSON...', errFormFirst);
        previewLoadingText && (previewLoadingText.textContent = 'Retrying with JSON...');
        // Fall through to JSON flow below
      }
    }

    // Try primary JSON; on failure or timeout, try fallback once (if provided)
    makeRequestWithFallback(firstUrl, secondUrl, fetchOpts)
      .then(async (blob) => {
        if (timeoutId) clearTimeout(timeoutId);
        // Preview via ArrayBuffer first to avoid blob URL ERR_ABORTED
        try {
          const ab = await blob.arrayBuffer();
          loadGLBArrayBuffer(ab);
        } catch (e) {
          console.warn('ArrayBuffer preview failed, falling back to blob URL:', e);
          const modelUrlFallback = URL.createObjectURL(blob);
          window.modelUrl = modelUrlFallback;
          loadGLBModel(modelUrlFallback);
        }
        // Always create blob URL for download
        const modelUrl = URL.createObjectURL(blob);
        window.modelUrl = modelUrl;
        generateButton.disabled = false;
        if (generateBtnText) generateBtnText.textContent = 'Generate';
        showNotification('Model generated successfully!', 'success');
        updateDebugPanel();
      })
      .catch(async (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        const isAbort = (err && err.name === 'AbortError');
        if (isAbort) {
          console.warn('Generate request aborted');
          setPreviewState('default');
          generateButton.disabled = false;
          if (generateBtnText) generateBtnText.textContent = 'Generate';
          updateDebugPanel(err);
          return;
        }
        // Optional: disable multipart/form-data retry via URL ?formRetry=0 or window.POLLY_DISABLE_FORM_RETRY
        if (disableFormRetry) {
          console.warn('Primary JSON flow failed; form retry disabled by configuration');
          setPreviewState('default');
          generateButton.disabled = false;
          if (generateBtnText) generateBtnText.textContent = 'Generate';
          const msg = (err && err.message) ? err.message : 'Failed to generate 3D model.';
          showNotification(msg + ' Please try again.', 'error');
          updateDebugPanel(err);
          return;
        }
        // Secondary compatibility attempt: retry with multipart/form-data
        try {
          console.warn('Primary JSON flow failed; retrying with multipart/form-data');
          previewLoadingText && (previewLoadingText.textContent = 'Retrying with form-data...');
          // Build image blob from base64
          let imgBlob = null;
          try {
            const raw = base64Data;
            const bytes = atob(raw);
            const arr = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
            imgBlob = new Blob([arr], { type: mimeType || 'image/webp' });
          } catch (_) {}
          const form = new FormData();
          if (imgBlob) {
            const ext = String((mimeType||'image/webp')).split('/')[1] || 'webp';
            form.append('image_file', imgBlob, 'upload.' + ext);
            form.append('file', imgBlob, 'upload.' + ext);
          }
          form.append('mime_type', mimeType || 'image/webp');
          // Include common fields for broader backend compatibility
          if (typeof requestData.image_base64 === 'string') form.append('image_base64', requestData.image_base64);
          if (typeof requestData.image === 'string') form.append('image', requestData.image);
          if (typeof requestData.base64 === 'string') form.append('base64', requestData.base64);
          if (typeof requestData.image_data_url === 'string') form.append('image_data_url', requestData.image_data_url);
          if (typeof requestData.data_url === 'string') form.append('data_url', requestData.data_url);
          // Append numeric/string params
          ;(function(){
            const keys = ['face_count','depth_weight','edge_regularization','shadow_suppression','highlight_suppression','scene_type','quality_preset','hints'];
            keys.forEach(k => {
              if (typeof requestData[k] === 'undefined' || requestData[k] === null) return;
              const v = requestData[k];
              if (typeof v === 'object') {
                try { form.append(k, JSON.stringify(v)); } catch(_) { form.append(k, String(v)); }
              } else {
                form.append(k, String(v));
              }
            });
            // Explicitly avoid prompt-like keys if present accidentally
            try {
              form.delete('prompt');
              form.delete('negative_prompt');
            } catch(_){}
          })();
          const baseHeadersForm = {
            // Let browser set Content-Type with boundary automatically
            'Accept': 'model/gltf-binary,application/octet-stream,application/json'
          };
          const fetchOptsForm = {
            method: 'POST',
            headers: Object.assign({}, baseHeadersForm, extraHeaders),
            body: form,
            cache: 'no-store',
            credentials: 'omit',
            mode: 'cors'
          };
          // Debug: capture outgoing form-data summary (retry path)
          try {
            const fk = Array.from(form.keys());
            window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
            window.POLLY_DEBUG_LAST.outgoing = {
              mode: 'form',
              formKeys: fk,
              hasPrompt: fk.includes('prompt') || fk.includes('negative_prompt')
            };
          } catch(_){}
          const blob = await makeRequestWithFallback(firstUrl, secondUrl, fetchOptsForm);
          // Preview from ArrayBuffer first to avoid blob URL ERR_ABORTED
          try {
            const ab = await blob.arrayBuffer();
            loadGLBArrayBuffer(ab);
          } catch (e) {
            console.warn('ArrayBuffer preview failed, falling back to blob URL:', e);
            const modelUrlFallback = URL.createObjectURL(blob);
            window.modelUrl = modelUrlFallback;
            loadGLBModel(modelUrlFallback);
          }
          // Always create blob URL for download
          const modelUrl = URL.createObjectURL(blob);
          window.modelUrl = modelUrl;
          generateButton.disabled = false;
          if (generateBtnText) generateBtnText.textContent = 'Generate';
          showNotification('Model generated successfully! (form retry)', 'success');
          updateDebugPanel();
          return;
        } catch (e2) {
          console.error('Error generating 3D model:', err, '\nForm retry error:', e2);
          setPreviewState('default');
          generateButton.disabled = false;
          if (generateBtnText) generateBtnText.textContent = 'Generate';
          const msg = (e2 && e2.message) ? e2.message : ((err && err.message) ? err.message : 'Failed to generate 3D model.');
          showNotification(msg + ' Please try again.', 'error');
          updateDebugPanel(e2);
        }
      });
}

// Three.js Functions
function initThreeJS() {
    scene = new THREE.Scene();
    // 使用更亮的背景提高整体观感
    scene.background = new THREE.Color(0xffffff);
    
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;
    
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    // 色彩与光照设置：更贴近真实并提升亮度
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // 可按需微调 1.2~1.6
    renderer.physicallyCorrectLights = true;
    // Initial size may be 0 when modelViewer is hidden; use previewContainer as fallback
    const initialW = modelViewer.clientWidth || previewContainer.clientWidth || 600;
    const initialH = modelViewer.clientHeight || previewContainer.clientHeight || 400;
    renderer.setSize(initialW, initialH);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    
    // 多光源布局：主灯、辅灯、边缘灯 + 半球光
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.85);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, 2, 2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-2, 1, -1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, -1, 2);
    scene.add(rimLight);
    
    // Add controls
    if (!window.OrbitControls) {
      throw new Error('OrbitControls not loaded');
    }
    controls = new window.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);
    camera.lookAt(controls.target);
    
    // Create wireframe material for later use
    wireframeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        wireframe: true 
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    animate();

    // Handle window resize to keep renderer sized correctly
    window.addEventListener('resize', updateRendererSize);
}

function showModelPreview() {
    // Clear previous model if exists
    if (model) {
        scene.remove(model);
    }
    
    // In a real implementation, we would load the GLB file from the API response
    // For demo purposes, we'll create a simple cube as a placeholder
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x6495ED });
    model = new THREE.Mesh(geometry, material);
    scene.add(model);
    
    // Completed state UI
    setPreviewState('completed');
    if (renderer && renderer.domElement && !modelViewer.contains(renderer.domElement)) {
        modelViewer.appendChild(renderer.domElement);
    }
    updateRendererSize();
    
    // Reset camera view
    resetView();
}

// Load GLB model from URL
function loadGLBModel(url) {
    // Clear previous model if exists
    if (model) {
        scene.remove(model);
    }
    
    // Keep UI in loading; attach canvas only when completed
    updateRendererSize();
    
    // Load the GLB model using GLTFLoader
    if (!window.GLTFLoader) {
      throw new Error('GLTFLoader not loaded');
    }
    const loader = new window.GLTFLoader();
    loader.load(url, 
        // Success callback
        (gltf) => {
            model = gltf.scene;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Reset model position
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;
            
            // Add model to scene
            scene.add(model);
            
            // Reset camera view
            resetView();

            // Switch to completed state and attach renderer canvas
            setPreviewState('completed');
            if (renderer && renderer.domElement && !modelViewer.contains(renderer.domElement)) {
                modelViewer.appendChild(renderer.domElement);
            }
            
            // Enable download button
            downloadBtn.disabled = false;
            // 不再生成下方的“Generated Image”截图，专注于 3D 预览
        },
        // Progress callback
        (xhr) => {
            const percent = (xhr.total ? (xhr.loaded / xhr.total) * 100 : 0);
            if (previewLoadingText) {
                previewLoadingText.textContent = `已处理：${Math.round(percent)}%`;
            }
        },
        // Error callback
        (error) => {
            console.error('Error loading GLB model:', error);
            showNotification('Failed to load 3D model', 'error');
            setPreviewState('default');
        }
    );
}

// Load GLB model from an ArrayBuffer (avoid blob: URL loading issues)
function loadGLBArrayBuffer(arrayBuffer) {
    // Clear previous model if exists
    if (model) {
        scene.remove(model);
    }

    // Keep UI in loading; attach canvas only when completed
    updateRendererSize();

    if (!window.GLTFLoader) {
      throw new Error('GLTFLoader not loaded');
    }
    const loader = new window.GLTFLoader();
    try {
        loader.parse(arrayBuffer, '',
            // Success callback
            (gltf) => {
                model = gltf.scene;

                // Center the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // Reset model position
                model.position.x = -center.x;
                model.position.y = -center.y;
                model.position.z = -center.z;

                // Add model to scene
                scene.add(model);

                // Reset camera view
                resetView();

                // Switch to completed state and attach renderer canvas
                setPreviewState('completed');
                if (renderer && renderer.domElement && !modelViewer.contains(renderer.domElement)) {
                    modelViewer.appendChild(renderer.domElement);
                }

                // Enable download button
                downloadBtn.disabled = false;
            },
            // Error callback
            (error) => {
                console.error('Error parsing GLB ArrayBuffer:', error);
                showNotification('Failed to load 3D model', 'error');
                setPreviewState('default');
            }
        );
    } catch (err) {
        console.error('GLTFLoader.parse threw:', err);
        showNotification('Failed to load 3D model', 'error');
        setPreviewState('default');
    }
}

// Centralized preview state manager
function setPreviewState(state) {
    switch (state) {
        case 'default':
            if (previewPlaceholder) previewPlaceholder.style.display = 'block';
            if (modelViewer) modelViewer.style.display = 'none';
            if (previewControls) previewControls.style.display = 'none';
            if (modelInfo) modelInfo.style.display = 'none';
            if (previewLoading) previewLoading.style.display = 'none';
            if (downloadBtn) downloadBtn.disabled = true;
            if (printBtn) printBtn.disabled = true;
            break;
        case 'loading':
            if (previewPlaceholder) previewPlaceholder.style.display = 'none';
            if (modelViewer) modelViewer.style.display = 'none';
            if (previewControls) previewControls.style.display = 'none';
            if (modelInfo) modelInfo.style.display = 'none';
            if (previewContainer) previewContainer.style.position = 'relative';
            if (previewLoading) {
                if (!previewContainer.contains(previewLoading)) previewContainer.appendChild(previewLoading);
                previewLoading.style.display = 'flex';
                previewLoading.style.zIndex = '10';
            }
            if (previewLoadingText) previewLoadingText.textContent = 'It may take a moment to generate.';
            break;
        case 'completed':
            if (previewPlaceholder) previewPlaceholder.style.display = 'none';
            if (previewLoading) previewLoading.style.display = 'none';
            if (modelViewer) modelViewer.style.display = 'block';
            if (previewControls) previewControls.style.display = 'flex';
            if (modelInfo) modelInfo.style.display = 'block';
            if (downloadBtn) downloadBtn.disabled = false;
            if (printBtn) printBtn.disabled = false;
            break;
        default:
            break;
    }
}

function setModelMode(mode) {
    if (!model) return;
    
    if (mode === 'wireframe') {
        model.material = wireframeMaterial;
        wireframeModeBtn.classList.add('active');
        solidModeBtn.classList.remove('active');
    } else {
        model.material = new THREE.MeshStandardMaterial({ color: 0x6495ED });
        solidModeBtn.classList.add('active');
        wireframeModeBtn.classList.remove('active');
    }
}

function resetView() {
    if (!controls) return;
    
    camera.position.set(0, 0, 5);
    controls.reset();
}

function downloadModel() {
    // In a real implementation, this would download the actual GLB file
    // For demo purposes, we'll show a notification
    showNotification('Download started. Check your downloads folder', 'success');
    
    // If we have a model URL from the API response, create a download link
    if (window.modelUrl) {
        const link = document.createElement('a');
        link.href = window.modelUrl;
        link.download = 'model.glb';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function openPrintModal(){
  if (!printModal) return;
  try { printError && (printError.style.display = 'none'); } catch(_){}
  printModal.style.display = 'flex';
}

function closePrintModal(){
  if (!printModal) return;
  printModal.style.display = 'none';
}

function setPrintError(msg){
  if (!printError) return;
  printError.textContent = msg || 'Error';
  printError.style.display = 'block';
}

async function submitPrintOrder(){
  try {
    const name = (printName && printName.value || '').trim();
    const phone = (printPhone && printPhone.value || '').trim();
    const email = (printEmail && printEmail.value || '').trim();
    const address1 = (printAddress1 && printAddress1.value || '').trim();
    const address2 = (printAddress2 && printAddress2.value || '').trim();
    const city = (printCity && printCity.value || '').trim();
    const state = (printState && printState.value || '').trim();
    const postal = (printPostal && printPostal.value || '').trim();
    const country = (printCountry && printCountry.value || '').trim();

    if (!name || !phone || !address1 || !city || !state || !postal || !country) {
      return setPrintError('Please fill all required fields marked with *');
    }

    // If a payment link is configured, redirect directly
    if (window.POLLY_PAYMENT_LINK) {
      window.location.href = window.POLLY_PAYMENT_LINK;
      return;
    }

    const payload = {
      contact_name: name,
      phone,
      email,
      address1,
      address2,
      city,
      state,
      postal,
      country,
      // Optional: include current page as context
      page_url: window.location.href,
      // Price fixed at $100 per requirement
      price_usd_cents: 10000,
      success_url: window.location.origin + '/?print=success',
      cancel_url: window.location.origin + '/?print=cancel'
    };

    const url = (function(path){
      try {
        if (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function') {
          return window.POLLY_API.urlFrom(window.POLLY_AUTH_BASE || '', path);
        }
      } catch(_){ }
      return '/' + path.replace(/^\//,'');
    })('print-checkout');

    printSubmit && (printSubmit.disabled = true);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const txt = await res.text(); let json={}; try{ json = JSON.parse(txt); }catch(_){}
    if (!res.ok) {
      const msg = json.error || json.message || 'Failed to start payment';
      throw new Error(msg);
    }
    const checkoutUrl = json.url || json.checkout_url || '';
    if (!checkoutUrl) throw new Error('No checkout URL returned');
    closePrintModal();
    window.location.href = checkoutUrl;
  } catch(e) {
    setPrintError(e && e.message ? e.message : 'Payment initialization failed');
  } finally {
    printSubmit && (printSubmit.disabled = false);
  }
}

// Utility Functions
function showNotification(message, type = 'success') {
    // Gracefully handle pages without notification elements
    if (!notification || !notificationMessage) {
        try { console.log('[Notification]', type + ':', message); } catch(_){}
        return;
    }
    notificationMessage.textContent = message;
    
    // Set notification color based on type
    if (type === 'error') {
        notification.style.backgroundColor = 'var(--danger)';
    } else if (type === 'warning') {
        notification.style.backgroundColor = 'var(--warning)';
    } else {
        notification.style.backgroundColor = 'var(--success)';
    }
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}
// Ensure renderer size matches the visible container
function updateRendererSize() {
    if (!renderer) return;
    // Prefer modelViewer size if visible, otherwise use previewContainer
    const targetW = (modelViewer.offsetWidth || previewContainer.offsetWidth || 600);
    const targetH = (modelViewer.offsetHeight || previewContainer.offsetHeight || 400);
    renderer.setSize(targetW, targetH);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    // Update camera aspect ratio and projection
    const aspect = targetW / targetH;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
}
// Helper: compress image with max dimension and quality, return dataURL
function compressImageToDataURL(imgEl, maxDim = 1280, quality = 0.85, preferWebp = false) {
    const nw = imgEl.naturalWidth || imgEl.width;
    const nh = imgEl.naturalHeight || imgEl.height;
    let tw = nw, th = nh;
    if (nw > nh && nw > maxDim) {
        const scale = maxDim / nw;
        tw = Math.round(nw * scale);
        th = Math.round(nh * scale);
    } else if (nh >= nw && nh > maxDim) {
        const scale = maxDim / nh;
        tw = Math.round(nh * scale) * (nw / nh);
        th = Math.round(nh * scale);
        tw = Math.round(tw);
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(tw));
    canvas.height = Math.max(1, Math.round(th));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    // Prefer WebP for better compression if supported, fall back to JPEG
    try {
      if (preferWebp) {
        const webp = canvas.toDataURL('image/webp', quality);
        if (typeof webp === 'string' && webp.startsWith('data:image/webp')) {
          return webp;
        }
      }
    } catch(_) {}
    return canvas.toDataURL('image/jpeg', quality);
}

// Helper: compress image/canvas source with max dimension and quality
function compressSourceToDataURL(srcEl, maxDim = 1280, quality = 0.85, preferWebp = false) {
  const isCanvas = (srcEl && srcEl.tagName === 'CANVAS');
  const nw = isCanvas ? srcEl.width : (srcEl.naturalWidth || srcEl.width);
  const nh = isCanvas ? srcEl.height : (srcEl.naturalHeight || srcEl.height);
  let tw = nw, th = nh;
  if (nw > nh && nw > maxDim) {
    const scale = maxDim / nw;
    tw = Math.round(nw * scale);
    th = Math.round(nh * scale);
  } else if (nh >= nw && nh > maxDim) {
    const scale = maxDim / nh;
    tw = Math.round(nh * scale) * (nw / nh);
    th = Math.round(nh * scale);
    tw = Math.round(tw);
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(tw));
  canvas.height = Math.max(1, Math.round(th));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(srcEl, 0, 0, canvas.width, canvas.height);
  try {
    if (preferWebp) {
      const webp = canvas.toDataURL('image/webp', quality);
      if (typeof webp === 'string' && webp.startsWith('data:image/webp')) {
        return webp;
      }
    }
  } catch(_) {}
  return canvas.toDataURL('image/jpeg', quality);
}

// Helper: compute basic image metrics for dynamic parameter selection
function computeImageMetrics(imgEl) {
  const w = imgEl.naturalWidth || imgEl.width;
  const h = imgEl.naturalHeight || imgEl.height;
  const sampleMax = 256;
  const scale = Math.min(1, sampleMax / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, tw, th);
  const data = ctx.getImageData(0, 0, tw, th);
  const px = data.data;
  const N = tw * th;
  let sum = 0, sum2 = 0, highlights = 0, shadows = 0;
  const gray = new Float32Array(N);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const r = px[i], g = px[i+1], b = px[i+2];
    const v = 0.299*r + 0.587*g + 0.114*b;
    gray[j] = v;
    sum += v; sum2 += v*v;
    if (v >= 230) highlights++;
    if (v <= 25) shadows++;
  }
  const mean = sum / N;
  const contrast = Math.sqrt(Math.max(0, sum2 / N - mean*mean));
  const highlightsRatio = highlights / N;
  const shadowsRatio = shadows / N;
  const sobelThreshold = 100; let edgeCount = 0;
  for (let y = 1; y < th-1; y++) {
    for (let x = 1; x < tw-1; x++) {
      const i = y*tw + x;
      const gx = -gray[i-tw-1] - 2*gray[i-1] - gray[i+tw-1]
               +  gray[i-tw+1] + 2*gray[i+1] + gray[i+tw+1];
      const gy =  gray[i-tw-1] + 2*gray[i-tw] + gray[i-tw+1]
               -  gray[i+tw-1] - 2*gray[i+tw] - gray[i+tw+1];
      const mag = Math.sqrt(gx*gx + gy*gy);
      if (mag > sobelThreshold) edgeCount++;
    }
  }
  const edgeDensity = edgeCount / ((tw-2)*(th-2));
  return {
    width: w, height: h, aspect: w/h,
    brightness: mean, contrast,
    highlightsRatio, shadowsRatio, edgeDensity
  };
}

// Helper: lightweight preprocess to improve contrast and edges
function preprocessImageWithMetrics(imgEl, metrics) {
  const w = imgEl.naturalWidth || imgEl.width;
  const h = imgEl.naturalHeight || imgEl.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, w, h);
  let imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  let gamma = 1.0;
  if (metrics.shadowsRatio > 0.12 && metrics.brightness < 90) gamma = 0.85;
  else if (metrics.highlightsRatio > 0.12 && metrics.brightness > 160) gamma = 1.15;
  else if (metrics.contrast < 25) gamma = 0.95;
  const invGamma = 1 / gamma;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = Math.max(0, Math.min(255, Math.round(Math.pow(i/255, invGamma) * 255)));
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i+1] = lut[d[i+1]]; d[i+2] = lut[d[i+2]]; }
  const blur = (src, w, h) => {
    const out = new Uint8ClampedArray(src.length);
    const kernel = [1,2,1, 2,4,2, 1,2,1]; const ksum = 16;
    for (let y = 1; y < h-1; y++) {
      for (let x = 1; x < w-1; x++) {
        let r=0,g=0,b=0,a=0, ki=0;
        for (let ky=-1; ky<=1; ky++) {
          for (let kx=-1; kx<=1; kx++) {
            const idx = ((y+ky)*w + (x+kx)) * 4; const kv = kernel[ki++];
            r += src[idx] * kv; g += src[idx+1] * kv; b += src[idx+2] * kv; a += src[idx+3] * kv;
          }
        }
        const o = (y*w + x) * 4; out[o]=r/ksum; out[o+1]=g/ksum; out[o+2]=b/ksum; out[o+3]=a/ksum;
      }
    }
    return out;
  };
  const blurred = blur(d, w, h);
  const amount = Math.min(1.0, 0.6 + (metrics.edgeDensity || 0) * 0.8);
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i]   - blurred[i];
    const dg = d[i+1] - blurred[i+1];
    const db = d[i+2] - blurred[i+2];
    d[i]   = Math.max(0, Math.min(255, d[i]   + dr*amount));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + dg*amount));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + db*amount));
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Helper: choose dynamic params for backend based on metrics
function chooseDynamicParams(metrics) {
  let sceneType = 'normal';
  if (metrics.shadowsRatio > 0.12 && metrics.brightness < 90) sceneType = 'low_light';
  else if (metrics.highlightsRatio > 0.12 && metrics.brightness > 160) sceneType = 'high_reflective';
  else if (metrics.contrast < 25) sceneType = 'flat_contrast';
  const edgeDensity = metrics.edgeDensity || 0;
  const faceCount = edgeDensity > 0.14 ? 120000 : (sceneType === 'flat_contrast' ? 100000 : 80000);
  return {
    scene_type: sceneType,
    depth_weight: sceneType === 'flat_contrast' ? 1.35 : 1.0,
    edge_regularization: edgeDensity > 0.14 ? 1.15 : 0.9,
    shadow_suppression: sceneType === 'low_light' ? 0.2 : 0.3,
    highlight_suppression: sceneType === 'high_reflective' ? 0.6 : 0.35,
    quality_preset: (edgeDensity > 0.18 || sceneType !== 'normal') ? 'high' : 'balanced',
    face_count: faceCount,
    hints: {
      brightness: Math.round(metrics.brightness),
      contrast: Math.round(metrics.contrast),
      highlightsRatio: Number(metrics.highlightsRatio.toFixed(3)),
      shadowsRatio: Number(metrics.shadowsRatio.toFixed(3)),
      edgeDensity: Number(edgeDensity.toFixed(3))
    }
  };
}

// Helper: request with one fallback attempt
async function makeRequestWithFallback(primaryUrl, fallbackUrl, opts) {
    const baseOpts = opts || {};
    const tryFetch = async (url, useOpts) => {
        const finalOpts = useOpts || baseOpts;
        const start = Date.now();
        let res;
        try {
          res = await fetch(url, finalOpts);
        } catch (err) {
          const duration = Date.now() - start;
          const attempt = {
            url,
            status: 0,
            statusText: (err && err.name) ? err.name : 'FetchError',
            durationMs: duration,
            responseTextSample: (err && err.message) ? String(err.message).slice(0, 2000) : ''
          };
          window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
          window.POLLY_DEBUG_LAST.attempts.push(attempt);
          throw err;
        }
        const duration = Date.now() - start;
        const attempt = {
            url,
            status: res.status,
            statusText: res.statusText,
            durationMs: duration
        };
        window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
        window.POLLY_DEBUG_LAST.attempts.push(attempt);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            attempt.responseTextSample = text ? text.slice(0, 2000) : '';
            throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ' - ' + text : ''}`);
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json')) {
            const text = await res.text();
            let json = {};
            try { json = JSON.parse(text); } catch (_) {}
            const urlField = json.result_url || json.glb_url || json.url;
            const base64Field = (json.result && (json.result.glb_base64 || json.result.glb_data_url)) || json.glb_base64 || json.glb_data_url;
            if (urlField) {
                const bstart = Date.now();
                const bres = await fetch(urlField, { cache: 'no-store', mode: 'cors' });
                const bd = Date.now() - bstart;
                window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
                window.POLLY_DEBUG_LAST.attempts.push({ url: urlField, status: bres.status, statusText: bres.statusText, durationMs: bd });
                if (!bres.ok) {
                    const t = await bres.text().catch(() => '');
                    throw new Error(`Result fetch failed: HTTP ${bres.status} ${bres.statusText}${t ? ' - ' + t : ''}`);
                }
                const blob = await bres.blob();
                attempt.blobSize = blob.size || null;
                return blob;
            } else if (base64Field) {
                try {
                    const raw = base64Field.includes(',') ? base64Field.split(',')[1] : base64Field;
                    const bytes = atob(raw);
                    const arr = new Uint8Array(bytes.length);
                    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                    const blob = new Blob([arr], { type: 'model/gltf-binary' });
                    attempt.blobSize = blob.size || null;
                    return blob;
                } catch (_) {
                    throw new Error('Invalid base64 result from backend');
                }
            } else if (json.bytes) {
                const blob = new Blob([json.bytes], { type: 'model/gltf-binary' });
                attempt.blobSize = blob.size || null;
                return blob;
            }
            throw new Error('No result in JSON response');
        } else {
            const blob = await res.blob();
            attempt.blobSize = blob.size || null;
            return blob;
        }
    };
    try {
        return await tryFetch(primaryUrl);
    } catch (e) {
        // If aborted or timeout or non-2xx, try fallback once
        if (fallbackUrl) {
            let fallbackOpts = baseOpts;
            try {
              const aborted = (baseOpts && baseOpts.signal && baseOpts.signal.aborted);
              if (e && e.name === 'AbortError') {
                // Remove aborted signal for fallback attempt
                fallbackOpts = Object.assign({}, baseOpts);
                delete fallbackOpts.signal;
              } else if (aborted) {
                fallbackOpts = Object.assign({}, baseOpts);
                delete fallbackOpts.signal;
              }
            } catch(_) {}
            console.warn('Primary request failed, trying fallback:', e.message);
            return await tryFetch(fallbackUrl, fallbackOpts);
        }
        throw e;
    }
}

function updateDebugPanel(err) {
    if (!debugPanel || !debugContent) return;
    if (!isDebug) {
        // Only show when ?debug=1 is present
        return;
    }
    debugPanel.style.display = 'block';
    const last = window.POLLY_DEBUG_LAST;
    const lines = [];
    lines.push(`[${new Date().toLocaleString()}] Attempts:`);
    if (last && last.attempts && last.attempts.length > 0) {
      last.attempts.forEach((a, i) => {
          lines.push(`#${i+1}`);
          lines.push(`URL: ${a.url}`);
          lines.push(`Status: ${a.status} ${a.statusText}`);
          if (typeof a.blobSize === 'number') lines.push(`Blob size: ${a.blobSize} bytes`);
          if (a.responseTextSample) lines.push(`Response text sample:\n${a.responseTextSample}`);
          lines.push(`Duration: ${a.durationMs} ms`);
          lines.push('');
      });
    } else {
      lines.push('No request attempts captured.');
      lines.push('');
    }
    // Outgoing payload summary
    if (last && last.outgoing) {
      lines.push('Outgoing payload:');
      lines.push(`Mode: ${last.outgoing.mode}`);
      if (Array.isArray(last.outgoing.jsonKeys)) {
        lines.push(`JSON keys: ${last.outgoing.jsonKeys.join(', ')}`);
      }
      if (Array.isArray(last.outgoing.formKeys)) {
        lines.push(`Form keys: ${last.outgoing.formKeys.join(', ')}`);
      }
      lines.push(`Contains prompt: ${last.outgoing.hasPrompt ? 'YES' : 'NO'}`);
      lines.push('');
    }
    if (err) {
      const errName = err.name || 'Error';
      const errMsg = err.message || String(err);
      lines.push(`Error: ${errName} - ${errMsg}`);
    }
    debugContent.textContent = lines.join('\n');
}
// --- Order page rendering helpers ---
function getUserKey(){
  let idToken = '';
  try { idToken = localStorage.getItem('POLLY_ID_TOKEN') || ''; } catch(_){}
  let userId = 'guest';
  if (idToken) {
    try { const p = parseJwt(idToken) || {}; userId = p.sub || p.email || p.phone_number || 'guest'; } catch(_){ }
  }
  return 'orders:' + userId;
}

function loadOrders(){
  try {
    const raw = localStorage.getItem(getUserKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch(_) { return []; }
}

function renderOrders(){
  const emptyEl = document.getElementById('orders-empty');
  const listEl = document.getElementById('orders-list') || document.querySelector('.orders-list');
  if (!listEl) return;

  const orders = loadOrders();
  listEl.innerHTML = '';

  if (!orders.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  orders.forEach(order => {
    const price = (order.price_usd_cents ? (order.price_usd_cents / 100) : 100).toFixed(2);
    const createdAt = order.created_at ? new Date(order.created_at).toLocaleDateString() : '';
    const snapshot = order.snapshot_data_url || 'assets/images/hero-banner.jpg';
    const title = order.title || order.model_name || 'Custom Model';
    const id = order.id || '-';

    const article = document.createElement('article');
    article.className = 'order-card';
    article.innerHTML = `
      <div class="order-left"><img src="${snapshot}" alt="Order item" /></div>
      <div class="order-center">
        <h3 class="order-title">${title}</h3>
        <div class="order-meta">
          <span>订单号：${id}</span>
          <span>${createdAt}</span>
        </div>
      </div>
      <div class="order-right">
        <div class="row"><span>Subtotal</span><span>$ ${price}</span></div>
        <div class="row"><span>Shipping</span><span>FREE</span></div>
        <div class="order-total">Total &nbsp; $ ${price}</div>
      </div>`;
    listEl.appendChild(article);
  });
}

const uploadArea = document.querySelector('.upload-area');