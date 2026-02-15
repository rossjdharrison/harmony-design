"""
Simple HTTP server for serving component demo pages during visual tests.

This is a dev/test utility as permitted by policy.
Serves static HTML files for component demos.
"""

import http.server
import socketserver
import os
from pathlib import Path


PORT = 8000
DEMO_DIR = Path(__file__).parent / "demos"


class DemoHandler(http.server.SimpleHTTPRequestHandler):
    """Handler that serves from demos directory."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DEMO_DIR), **kwargs)
    
    def end_headers(self):
        """Add CORS headers for local testing."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()


def start_server(port=PORT):
    """Start the test server."""
    with socketserver.TCPServer(("", port), DemoHandler) as httpd:
        print(f"Serving component demos at http://localhost:{port}")
        print(f"Demo directory: {DEMO_DIR}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")


if __name__ == "__main__":
    # Ensure demo directory exists
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    start_server()