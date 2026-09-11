import sys
import os

# Add parent directory to sys.path so modules in python-nlp root can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from main import app as base_app
from starlette.types import ASGIApp, Scope, Receive, Send

class VercelPathMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            raw_matched = headers.get(b"x-matched-path") or headers.get(b"x-forwarded-uri")
            if raw_matched:
                matched_path = raw_matched.decode("latin1").split("?")[0]
                if matched_path and matched_path not in ("/api/index.py", "/api/index"):
                    scope["path"] = matched_path

            for prefix in ("/api/index.py", "/api/index"):
                if scope["path"].startswith(prefix):
                    scope["path"] = scope["path"][len(prefix):] or "/"
                    break

        await self.app(scope, receive, send)

app = VercelPathMiddleware(base_app)
