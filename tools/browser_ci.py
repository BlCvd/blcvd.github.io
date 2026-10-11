"""Serve the built site on loopback for browser checks, then close it reliably."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from typing import Iterator
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


@contextmanager
def serve() -> Iterator[str]:
    public = ROOT / 'public'
    if not (public / 'index.html').is_file():
        raise RuntimeError('Build the site before browser acceptance')
    handler = partial(QuietHandler, directory=str(public))
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f'http://127.0.0.1:{server.server_address[1]}'
        finally:
            server.shutdown()
            thread.join(timeout=5)


if __name__ == '__main__':
    with serve() as base:
        environment = {**os.environ, 'BLOG_TEST_URL': base, 'PYTHONUTF8': '1'}
        subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / 'tools/browser-check.py')], cwd=ROOT, env=environment, check=True, timeout=360)
