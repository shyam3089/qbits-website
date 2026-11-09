import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware

from .routes import api_router
from .store import ContentStore

ROOT = Path(__file__).resolve().parent.parent


def create_app(data_dir: Path | None = None, admin_password: str | None = None) -> FastAPI:
    app = FastAPI(title="Qbits Website API", version="1.0.0", docs_url="/api/reference", openapi_url="/api/openapi.json", redoc_url=None)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    store = ContentStore(data_dir or Path(os.getenv("QBITS_DATA_DIR", str(ROOT / "backend" / "data"))))
    # Validate maintained content at startup, before accepting requests.
    store.site()
    for slug in ("features", "docs", "examples", "roadmap"):
        store.page(slug)
    app.include_router(api_router(store, admin_password))

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        if request.url.path.startswith("/assets/") and response.status_code == 200:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    dist = ROOT / "frontend" / "dist"
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, "Endpoint not found")
        if path in {"favicon.svg", "robots.txt"} and (dist / path).is_file():
            return FileResponse(dist / path)
        if not (dist / "index.html").is_file():
            raise HTTPException(503, "Build the frontend with npm run build, or use Vite on port 5173.")
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-cache"})

    return app


app = create_app()
