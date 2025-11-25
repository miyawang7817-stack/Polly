#!/usr/bin/env python3
import os
import sys
import json
import ssl
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


TARGET_BASE = os.environ.get('DEV_PROXY_TARGET_BASE', 'https://polly-3d.vercel.app/api/')
TARGET_GENERATE_URL = os.environ.get('DEV_PROXY_TARGET_GENERATE_URL', '').strip()
# Optional: direct backend OAuth start to avoid upstream 404
BACKEND_OAUTH_GOOGLE_START_URL = os.environ.get('DEV_PROXY_BACKEND_OAUTH_GOOGLE_START_URL', 'https://111.229.71.58:8086/oauth/google/start').strip()
# Optional: inject upstream auth headers from environment (useful when client lacks them)
AUTHORIZATION = os.environ.get('DEV_PROXY_AUTHORIZATION', '').strip()
X_API_KEY = os.environ.get('DEV_PROXY_X_API_KEY', '').strip()
X_AUTH_TOKEN = os.environ.get('DEV_PROXY_X_AUTH_TOKEN', '').strip()
GOOGLE_CLIENT_ID = os.environ.get('DEV_PROXY_GOOGLE_CLIENT_ID', '').strip()
GOOGLE_SCOPE = os.environ.get('DEV_PROXY_GOOGLE_SCOPE', 'openid email profile')
GOOGLE_RESPONSE_TYPE = os.environ.get('DEV_PROXY_GOOGLE_RESPONSE_TYPE', 'token id_token')
PORT = int(os.environ.get('DEV_PROXY_PORT', '8787'))
INSECURE = os.environ.get('DEV_PROXY_INSECURE', '0').strip() in ('1', 'true', 'yes')


def _rewrite_path_for_upstream(path: str) -> str:
    """Mirror Vercel rewrites: map clean URLs to /api/* function paths."""
    try:
        # Split path and query
        parsed = urlparse(path)
        raw_path = parsed.path.rstrip('/')
        raw_query = parsed.query or ''
        # Known rewrites
        # Map to function file names; base already ends with '/api/'
        rewrites = {
            '/generate': 'generate',
            '/login': 'login',
            '/request-email-code': 'request_email_code',
            '/login-email-code': 'login_email_code',
            '/request-sms-code': 'request_sms_code',
            '/login-sms-code': 'login_sms_code',
            # Special-case Google OAuth start: forward directly to backend start URL
            # to avoid upstream 404 when the Vercel function isn't available.
            # We preserve the original query string (e.g., redirect_uri).
            '/oauth/google/start': '__DIRECT_BACKEND_GOOGLE__',
            '/oauth/apple/start': 'oauth_apple_start',
            '/print-checkout': 'print_checkout',
        }
        target_path = rewrites.get(raw_path, raw_path)
        # If special-case marker, build absolute URL to backend
        if target_path == '__DIRECT_BACKEND_GOOGLE__':
            if raw_query:
                return BACKEND_OAUTH_GOOGLE_START_URL + ('&' if '?' in BACKEND_OAUTH_GOOGLE_START_URL else '?') + raw_query
            return BACKEND_OAUTH_GOOGLE_START_URL
        # Rebuild URL with rewritten path
        new_parsed = parsed._replace(path=target_path)
        return urlunparse(new_parsed)
    except Exception:
        return path

def build_target_url(path: str) -> str:
    # Apply rewrite mapping first
    rewritten = _rewrite_path_for_upstream(path)
    # If rewritten is already an absolute URL, return as-is
    try:
        rp = urlparse(rewritten)
        if rp.scheme in ('http', 'https'):
            return rewritten
    except Exception:
        pass
    # Ensure path without leading slash duplicates
    clean = rewritten.lstrip('/')
    # Join to target base
    return urljoin(TARGET_BASE, clean)


class ProxyHandler(BaseHTTPRequestHandler):
    def _set_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, x-api-key, x-auth-token, x-vercel-protection-bypass')

    def do_GET(self):
        # Health check endpoint for webview/preview pings
        path_only = self.path.split('?')[0]
        if path_only in ('/', '/health', '/status'):
            self.send_response(200)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            payload = json.dumps({'ok': True, 'proxy': 'dev', 'port': PORT}).encode('utf-8')
            self.wfile.write(payload)
            return
        # Forward GETs to upstream (for OAuth starts and other GET APIs)
        try:
            target_url = build_target_url(self.path)
            try:
                print(f"[dev-proxy] GET {self.path} -> {target_url}")
            except Exception:
                pass
            fwd_headers = {
                'Accept': self.headers.get('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
            }
            for key in ['Authorization', 'x-api-key', 'x-auth-token', 'x-vercel-protection-bypass']:
                val = self.headers.get(key)
                if val:
                    fwd_headers[key] = val
            # Inject from environment if not provided by client
            if AUTHORIZATION and 'Authorization' not in fwd_headers:
                fwd_headers['Authorization'] = AUTHORIZATION
            if X_API_KEY and 'x-api-key' not in fwd_headers:
                fwd_headers['x-api-key'] = X_API_KEY
            if X_AUTH_TOKEN and 'x-auth-token' not in fwd_headers:
                fwd_headers['x-auth-token'] = X_AUTH_TOKEN
            req = Request(target_url, headers=fwd_headers, method='GET')
            ctx = None
            try:
                if INSECURE:
                    ctx = ssl._create_unverified_context()
            except Exception:
                ctx = None
            try:
                timeout_sec = float(os.environ.get('DEV_PROXY_UPSTREAM_TIMEOUT', '60') or '60')
            except Exception:
                timeout_sec = 60.0
            try:
                if ctx is not None:
                    resp_ctx = urlopen(req, context=ctx, timeout=timeout_sec)
                else:
                    resp_ctx = urlopen(req, timeout=timeout_sec)
                with resp_ctx as resp:
                    status = resp.getcode()
                    data = resp.read()
                    ct = resp.headers.get('Content-Type', 'text/html; charset=utf-8')
                    self.send_response(status)
                    self._set_cors()
                    # Propagate redirect headers if present
                    loc = resp.headers.get('Location')
                    if loc:
                        self.send_header('Location', loc)
                    self.send_header('Content-Type', ct)
                    self.end_headers()
                    try:
                        self.wfile.write(data)
                    except (BrokenPipeError, ConnectionResetError):
                        pass
            except HTTPError as e:
                err_text = e.read().decode('utf-8', errors='ignore')
                # Fallback: if Google OAuth start 404s and we have a client id, redirect directly to Google
                try:
                    if self.path.startswith('/oauth/google/start') and GOOGLE_CLIENT_ID and e.code == 404:
                        try:
                            sp = urlparse(self.path)
                            q = dict((k, v[0] if isinstance(v, list) else v) for k, v in ({}).items())
                            try:
                                from urllib.parse import parse_qs
                                q = {k: (v[0] if isinstance(v, list) and v else '') for k, v in parse_qs(sp.query).items()}
                            except Exception:
                                q = {}
                            redirect_uri = q.get('redirect_uri') or f'http://localhost:{PORT}/'
                            state = q.get('state') or ''
                            nonce = q.get('nonce') or ''
                            google_ep = 'https://accounts.google.com/o/oauth2/v2/auth'
                            from urllib.parse import urlencode
                            params = {
                                'client_id': GOOGLE_CLIENT_ID,
                                'redirect_uri': redirect_uri,
                                'response_type': GOOGLE_RESPONSE_TYPE,
                                'scope': GOOGLE_SCOPE,
                            }
                            if state:
                                params['state'] = state
                            if nonce and ('id_token' in (GOOGLE_RESPONSE_TYPE or '')):
                                params['nonce'] = nonce
                            location = google_ep + '?' + urlencode(params)
                            # Issue 302 redirect to Google directly
                            self.send_response(302)
                            self._set_cors()
                            self.send_header('Location', location)
                            self.end_headers()
                            return
                        except Exception:
                            pass
                except Exception:
                    pass
                # Otherwise, relay upstream error
                self.send_response(e.code)
                self._set_cors()
                loc = getattr(e, 'headers', {}).get('Location') if hasattr(e, 'headers') else None
                if loc:
                    self.send_header('Location', loc)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                try:
                    self.wfile.write((f'Upstream {e.code} {e.reason} at {target_url} - ' + err_text).encode('utf-8'))
                except (BrokenPipeError, ConnectionResetError):
                    pass
            except URLError as e:
                # If upstream is unreachable and this is Google start with client id, redirect directly
                try:
                    if self.path.startswith('/oauth/google/start') and GOOGLE_CLIENT_ID:
                        sp = urlparse(self.path)
                        from urllib.parse import parse_qs, urlencode
                        qs = parse_qs(sp.query)
                        redirect_uri = (qs.get('redirect_uri') or [''])[0] or f'http://localhost:{PORT}/'
                        state = (qs.get('state') or [''])[0]
                        nonce = (qs.get('nonce') or [''])[0]
                        google_ep = 'https://accounts.google.com/o/oauth2/v2/auth'
                        params = {
                            'client_id': GOOGLE_CLIENT_ID,
                            'redirect_uri': redirect_uri,
                            'response_type': GOOGLE_RESPONSE_TYPE,
                            'scope': GOOGLE_SCOPE,
                        }
                        if state:
                            params['state'] = state
                        if nonce and ('id_token' in (GOOGLE_RESPONSE_TYPE or '')):
                            params['nonce'] = nonce
                        location = google_ep + '?' + urlencode(params)
                        self.send_response(302)
                        self._set_cors()
                        self.send_header('Location', location)
                        self.end_headers()
                        return
                except Exception:
                    pass
                # Default 502 relay
                self.send_response(502)
                self._set_cors()
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                try:
                    self.wfile.write((f'Bad Gateway - {e.reason}').encode('utf-8'))
                except (BrokenPipeError, ConnectionResetError):
                    pass
        except Exception as e:
            self.send_response(500)
            self._set_cors()
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            try:
                msg = f'Proxy internal error: {type(e).__name__} - {e}'
                self.wfile.write(msg.encode('utf-8'))
            except (BrokenPipeError, ConnectionResetError):
                pass

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        # Forward POST body and headers to remote target
        try:
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                length = 0
            body = self.rfile.read(length) if length > 0 else b''

            # Allow full URL override specifically for /generate
            if TARGET_GENERATE_URL and self.path.rstrip('/') == '/generate':
                target_url = TARGET_GENERATE_URL
            else:
                target_url = build_target_url(self.path)
            try:
                print(f"[dev-proxy] POST {self.path} -> {target_url}")
            except Exception:
                pass

            # Forward selected headers
            fwd_headers = {
                'Content-Type': self.headers.get('Content-Type', 'application/json'),
                'Accept': self.headers.get('Accept', 'application/octet-stream'),
            }
            # Optional auth headers
            for key in ['Authorization', 'x-api-key', 'x-auth-token', 'x-vercel-protection-bypass']:
                val = self.headers.get(key)
                if val:
                    fwd_headers[key] = val
            # Inject from environment if not provided by client
            if AUTHORIZATION and 'Authorization' not in fwd_headers:
                fwd_headers['Authorization'] = AUTHORIZATION
            if X_API_KEY and 'x-api-key' not in fwd_headers:
                fwd_headers['x-api-key'] = X_API_KEY
            if X_AUTH_TOKEN and 'x-auth-token' not in fwd_headers:
                fwd_headers['x-auth-token'] = X_AUTH_TOKEN

            req = Request(target_url, data=body, headers=fwd_headers, method='POST')
            # Optional: disable TLS verification for local testing only
            ctx = None
            try:
                if INSECURE:
                    ctx = ssl._create_unverified_context()
            except Exception:
                ctx = None
            try:
                # Add a reasonable timeout to avoid hanging connections
                try:
                    timeout_sec = float(os.environ.get('DEV_PROXY_UPSTREAM_TIMEOUT', '60') or '60')
                except Exception:
                    timeout_sec = 60.0
                if ctx is not None:
                    resp_ctx = urlopen(req, context=ctx, timeout=timeout_sec)
                else:
                    resp_ctx = urlopen(req, timeout=timeout_sec)
                with resp_ctx as resp:
                    status = resp.getcode()
                    data = resp.read()
                    # Pipe through content-type for GLB
                    ct = resp.headers.get('Content-Type', 'application/octet-stream')
                    self.send_response(status)
                    self._set_cors()
                    self.send_header('Content-Type', ct)
                    self.end_headers()
                    try:
                        self.wfile.write(data)
                    except (BrokenPipeError, ConnectionResetError):
                        # Client closed connection; ignore gracefully
                        pass
            except HTTPError as e:
                # Relay upstream error text
                err_text = e.read().decode('utf-8', errors='ignore')
                self.send_response(e.code)
                self._set_cors()
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                try:
                    self.wfile.write((f'Upstream {e.code} {e.reason} at {target_url} - ' + err_text).encode('utf-8'))
                except (BrokenPipeError, ConnectionResetError):
                    pass
            except URLError as e:
                self.send_response(502)
                self._set_cors()
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                try:
                    self.wfile.write((f'Bad Gateway - {e.reason}').encode('utf-8'))
                except (BrokenPipeError, ConnectionResetError):
                    pass
        except Exception as e:
            # Catch-all to avoid empty responses on unexpected errors
            self.send_response(500)
            self._set_cors()
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            try:
                msg = f'Proxy internal error: {type(e).__name__} - {e}'
                self.wfile.write(msg.encode('utf-8'))
            except (BrokenPipeError, ConnectionResetError):
                pass


def run():
    addr = ('', PORT)
    print(f"[dev-proxy] Forwarding to upstream: {TARGET_BASE}\n[dev-proxy] Listening on http://localhost:{PORT}/")
    if INSECURE:
        print("[dev-proxy] TLS verification: DISABLED (local testing only)")
    else:
        print("[dev-proxy] TLS verification: ENABLED")
    HTTPServer(addr, ProxyHandler).serve_forever()


if __name__ == '__main__':
    run()