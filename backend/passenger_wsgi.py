"""Passenger entrypoint for running FastAPI on cPanel (WSGI-only environments)."""

from a2wsgi import ASGIMiddleware

from server import app

# cPanel Passenger expects `application` callable.
application = ASGIMiddleware(app)
