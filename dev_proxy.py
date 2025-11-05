#!/usr/bin/env python3
import os
import sys
import json
import ssl
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


TARGET_BASE = os.environ.get('DEV_PROXY_TARGET_BASE', 'https://polly-3d.vercel.app/api/')
TARGET_GENERATE_URL = os.environ.get('DEV_PROXY_TARGET_GENERATE_URL', '').strip()
PORT = int(os.environ.get('DEV_PROXY_PORT', '8787'))
INSECURE = os.environ.get('DEV_PROXY_INSECURE', '0').strip() in ('1', 'true', 'yes')


def build_target_url(path: str) -> str:
    # Ensure path without leading slash duplicates
    clean = path.lstrip('/')
    # If user passes '/generate', join to base
    return urljoin(TARGET_BASE, clean)


class ProxyHandler(BaseHTTPRequestHandler):
    def _set_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-auth-token, x-vercel-protection-bypass')

    def do_GET(self):
        # Health check endpoint for webview/preview pings
        path = self.path.split('?')[0]
        if path in ('/', '/health', '/status'):
            self.send_response(200)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            payload = json.dumps({'ok': True, 'proxy': 'dev', 'port': PORT}).encode('utf-8')
            self.wfile.write(payload)
            return
        # Unknown GET routes
        self.send_response(404)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        payload = json.dumps({'error': 'not_found'}).encode('utf-8')
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        # Forward POST body and headers to remote target
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

        req = Request(target_url, data=body, headers=fwd_headers, method='POST')
        # Optional: disable TLS verification for local testing only
        ctx = None
        try:
            if INSECURE:
                ctx = ssl._create_unverified_context()
        except Exception:
            ctx = None
        try:
            if ctx is not None:
                resp_ctx = urlopen(req, context=ctx)
            else:
                resp_ctx = urlopen(req)
            with resp_ctx as resp:
                status = resp.getcode()
                data = resp.read()
                # Pipe through content-type for GLB
                ct = resp.headers.get('Content-Type', 'application/octet-stream')
                self.send_response(status)
                self._set_cors()
                self.send_header('Content-Type', ct)
                self.end_headers()
                self.wfile.write(data)
        except HTTPError as e:
            # Relay upstream error text
            err_text = e.read().decode('utf-8', errors='ignore')
            self.send_response(e.code)
            self._set_cors()
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write((f'Upstream {e.code} {e.reason} at {target_url} - ' + err_text).encode('utf-8'))
        except URLError as e:
            self.send_response(502)
            self._set_cors()
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write((f'Bad Gateway - {e.reason}').encode('utf-8'))


def run():
    addr = ('', PORT)
    print(f"[dev-proxy] Forwarding POSTs to: {TARGET_BASE}\n[dev-proxy] Listening on http://localhost:{PORT}/")
    if INSECURE:
        print("[dev-proxy] TLS verification: DISABLED (local testing only)")
    else:
        print("[dev-proxy] TLS verification: ENABLED")
    HTTPServer(addr, ProxyHandler).serve_forever()


if __name__ == '__main__':
    run()