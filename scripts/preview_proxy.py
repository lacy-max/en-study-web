#!/usr/bin/env python3
"""预览静态服务 + 后端代理：/api/* 和 /tts 转发到 127.0.0.1:8000，其余走静态文件。
这样不管页面在哪个端口，接口和音频都是同源可用，手机访问也不用改配置。
用法: python3 preview_proxy.py <port> <dir>
"""
import sys, os, json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BACKEND = 'http://127.0.0.1:8000'
PREFIX = ('/api', '/tts', '/audio')


class Handler(SimpleHTTPRequestHandler):
    def _proxy(self):
        path = self.path
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length) if length else None
        req = Request(BACKEND + path, data=body, method=self.command)
        for k, v in self.headers.items():
            if k.lower() in ('host', 'content-length', 'connection', 'accept-encoding'):
                continue
            req.add_header(k, v)
        try:
            resp = urlopen(req, timeout=30)
            status, data, hdrs = resp.status, resp.read(), resp.headers
        except HTTPError as e:
            status, data, hdrs = e.code, e.read(), e.headers
        except Exception as e:
            status, data, hdrs = 502, json.dumps({'detail': 'proxy error: %s' % e}).encode(), {}
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        if hdrs:
            for k in ('Content-Type', 'Cache-Control'):
                if hdrs.get(k):
                    self.send_header(k, hdrs.get(k))
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith(PREFIX):
            return self._proxy()
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path.startswith(PREFIX):
            return self._proxy()
        self.send_error(405)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
        self.end_headers()

    def end_headers(self):
        if not self.path.startswith(PREFIX):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1])
    os.chdir(sys.argv[2])
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
