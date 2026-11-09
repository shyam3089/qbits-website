import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request, Response

from .schemas import Login, Page, SiteConfig


def api_router(store, admin_password: str | None = None):
    router = APIRouter(prefix="/api")
    sessions: dict[str, tuple[float, str]] = {}
    attempts: dict[str, deque] = defaultdict(deque)
    password = admin_password if admin_password is not None else os.getenv("QBITS_ADMIN_PASSWORD", "")
    salt = secrets.token_bytes(16)
    expected = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1) if password else None

    def same_origin(request: Request):
        origin = request.headers.get("origin")
        allowed = {str(request.base_url).rstrip("/")}
        allowed.update(value.strip() for value in os.getenv("QBITS_ALLOWED_ORIGINS", "http://127.0.0.1:5188,http://localhost:5188").split(","))
        if origin and origin not in allowed:
            raise HTTPException(403, "Origin not allowed")

    def session(request: Request, mutation=False):
        token = request.cookies.get("qbits_session", "")
        now = time.monotonic()
        for key in list(sessions):
            if sessions[key][0] < now:
                del sessions[key]
        current = sessions.get(token)
        if not current:
            raise HTTPException(401, "Sign in to manage this site")
        if mutation:
            same_origin(request)
            if not hmac.compare_digest(request.headers.get("x-qbits-csrf", ""), current[1]):
                raise HTTPException(403, "Invalid session verification. Sign in again.")
        return current

    @router.get("/health")
    def health():
        return {"status": "ok", "framework": "Qbits", "version": "1.0.1"}

    @router.get("/site", response_model=SiteConfig)
    def site(response: Response):
        response.headers["Cache-Control"] = "no-cache"
        return store.site()

    @router.get("/pages/{slug}", response_model=Page)
    def page(slug: str):
        page = store.page(slug)
        if page is None:
            raise HTTPException(404, "Page not found")
        return page

    @router.post("/admin/login")
    def login(body: Login, request: Request, response: Response):
        same_origin(request)
        if expected is None:
            raise HTTPException(503, "Set QBITS_ADMIN_PASSWORD on the backend before signing in.")
        ip = request.client.host if request.client else "local"
        now = time.monotonic()
        history = attempts[ip]
        while history and history[0] < now - 300:
            history.popleft()
        if len(history) >= 5:
            raise HTTPException(429, "Too many attempts. Try again in five minutes.")
        candidate = hashlib.scrypt(body.password.get_secret_value().encode(), salt=salt, n=16384, r=8, p=1)
        if not hmac.compare_digest(candidate, expected):
            history.append(now)
            raise HTTPException(401, "Incorrect password")
        history.clear()
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        sessions[token] = (now + 28800, csrf)
        response.set_cookie("qbits_session", token, httponly=True, samesite="strict", secure=request.url.scheme == "https", max_age=28800, path="/api/admin")
        response.headers["Cache-Control"] = "no-store"
        return {"csrf": csrf}

    @router.get("/admin/session")
    def current_session(request: Request, response: Response):
        current = session(request)
        response.headers["Cache-Control"] = "no-store"
        return {"csrf": current[1]}

    @router.put("/admin/site", response_model=SiteConfig)
    def save_site(body: SiteConfig, request: Request):
        session(request, mutation=True)
        return store.save(body)

    @router.post("/admin/logout")
    def logout(request: Request, response: Response):
        session(request, mutation=True)
        sessions.pop(request.cookies.get("qbits_session", ""), None)
        response.delete_cookie("qbits_session", path="/api/admin")
        return {"ok": True}

    return router
