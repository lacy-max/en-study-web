#!/usr/bin/env python3
"""HTTPS 预览服务：给手机浏览器录音用（iOS/安卓只在 https 或 localhost 允许麦克风）。
静态文件 + /api /tts /audio 反代到 127.0.0.1:8000。
用法: python3 preview_https.py <port> <dir> [cert.pem key.pem]
"""
import os
import ssl
import sys
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preview_proxy import Handler  # noqa: E402

CERT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'certs')


if __name__ == '__main__':
    port = int(sys.argv[1])
    os.chdir(sys.argv[2])
    cert = sys.argv[3] if len(sys.argv) > 3 else os.path.join(CERT_DIR, 'cert.pem')
    key = sys.argv[4] if len(sys.argv) > 4 else os.path.join(CERT_DIR, 'key.pem')
    httpd = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(cert, key)
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    print('https preview on port %d' % port, flush=True)
    httpd.serve_forever()
