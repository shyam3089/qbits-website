# Qbits official website

A working Qbits 1.0.1 frontend and Python FastAPI backend. The home page follows the supplied 1254 × 775 reference, including the GitHub curve and integrated command bar. Every view stays inside the frame.

## Run locally (PowerShell)

Requirements: Node.js 22+, Python 3.10+.

From the repository root, install the backend:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

Start the backend in one terminal. Choose your own password; there is no default admin password.

```powershell
$env:QBITS_ADMIN_PASSWORD = Read-Host 'Choose your admin password' -MaskInput
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8108 --reload
```

On Windows PowerShell 5, which has no `-MaskInput`, use:

```powershell
$secret = Read-Host 'Choose your admin password' -AsSecureString
$env:QBITS_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5188**. Settings are at **http://127.0.0.1:5188/admin**. Vite proxies `/api` to port 8108. These ports avoid the other applications already using 8000 and 5173 on this machine. Override the proxy target with `QBITS_API_TARGET` if needed.

If `QBITS_ADMIN_PASSWORD` is unset, public pages work and admin sign-in explains how to enable access. Passwords are never sent to the public site endpoint. Admin sessions use HttpOnly, SameSite cookies, CSRF verification, origin checks and a login attempt limit. Sessions last eight hours and end when the backend restarts. Serve production behind HTTPS for Secure cookies. Run one backend worker because sessions are held in process memory.

## Production, served by FastAPI

```powershell
cd frontend
npm ci
npm run build
cd ..
# Set QBITS_ADMIN_PASSWORD in this terminal or the service environment first.
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8108
```

Open **http://127.0.0.1:8108**. FastAPI serves the built frontend, hashed assets, deep links and API. Assets use gzip and immutable caching. No deployment, publishing or cloud CI is configured.

## Structure and content

- `frontend/src/components/`: Qbits frame, navigation, hero, buttons, terminal, particle surface, content and admin components.
- `frontend/src/themes/tokens.css`: colours, gradients, fonts, dimensions, corner curves, responsive overrides, shadows and motion tokens; four theme variants.
- The same `tokens.css` owns breakpoint values and artwork geometry. Vite expands the named media conditions from its `--breakpoint-*` tokens because CSS custom properties cannot be used directly in media query conditions. Breakpoint changes require rebuilding; other tokens can be managed in admin.
- `frontend/src/styles.css`: component styles consuming the theme tokens.
- `frontend/src/platform/visuals.js`: decorative SVG frame and cached canvas particle field. The animation reuses a bitmap, caps pixel ratio and frame rate, pauses in hidden tabs and honours reduced motion.
- `frontend/src/main.js`: browser API adapter, API loading, history, clipboard, external destinations and accessibility attributes.
- `frontend/src/assets/`: supplied original logo files, optimised logo symbol and local icons. Poppins is bundled locally through `@fontsource/poppins`; no third-party font request.
- `backend/content/site.json`: validated default site settings.
- `backend/content/pages/*.json`: maintained Features, Docs, Examples and Roadmap content, validated with Pydantic on startup.
- `backend/data/site.json`: saved admin overrides, created on first save with an atomic file replacement. Back up this directory. `QBITS_DATA_DIR` selects another location. No database.

The admin panel manages headline text, descriptions, install command, GitHub/npm destinations, theme selection and individual layout/appearance tokens. Preview, reset overrides, discard and save are supported. Theme changes require no component changes. Geometric curve tokens use pixel values; wave numeric tokens are unitless. Image tokens remain source-controlled. Theme token input is restricted to plain CSS values; remote image URLs and CSS declarations are rejected.

Public API:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Readiness |
| `GET /api/site` | Validated public site settings |
| `GET /api/pages/{slug}` | Validated maintained page |
| `POST /api/admin/login` | Password sign-in |
| `GET /api/admin/session` | Session and CSRF verification |
| `PUT /api/admin/site` | Authenticated, validated settings save |
| `POST /api/admin/logout` | End session |
| `/api/reference` | FastAPI API explorer |

Install opens the installation documentation. Documentation opens the Docs view. The entire terminal command is a copy control; code samples also have copy buttons. GitHub and npm controls open the configured HTTPS destinations in another tab. Browser Back/Forward and direct page URLs work.

## Verification

```powershell
# From repository root, after building the frontend:
.\.venv\Scripts\python.exe -m pytest backend/tests -q --tb=short
cd frontend
npm run check
npm run install:firefox
npm test -- --reporter=dot
```

Browser tests use **Firefox only**, a separate FastAPI process on port 8118 and an isolated temporary settings directory. The test password exists only in the test fixture. Tests cover navigation/history, direct URLs, CTAs, real and controlled clipboard writes, external URL handling, API failures/retry, keyboard access, reduced motion, animation, containment at desktop/tablet/mobile sizes, authentication and persisted admin changes.

With the development servers running, `npm run capture` records desktop, tablet and mobile screenshots under `artifacts/`. Set `QBITS_CAPTURE_URL` to capture the production server instead. Screenshots and measured comparison notes are described in `VALIDATION.md`.

## Qbits capabilities and limits

Installed documentation was inspected before implementation: `node_modules/qbits/docs/syntax.md`, `api.md`, and `limitations.md`. The frontend uses the published **`npm install qbits`** package, pinned to 1.0.1. No scaffold generator or framework-core changes.

All application views and controls are `.qb` components, including admin inputs and keyed content lists. This Qbits version does not support arbitrary HTML tags/attributes, async expressions, network requests, canvas, or clipboard operations inside `.qb`. A small JavaScript host adapter supplies these browser functions and adds semantic roles/attributes to Qbits-owned elements. The decorative canvas and SVG are browser surfaces, not a second UI framework.

The adapter uses the documented experimental mount-handle `updateState` method to feed API data into Qbits. The dependency is pinned because that host interface is experimental. Qbits routing is also experimental; this site uses a small History API adapter instead. SSR, nested routing and route guards are not invented or required here.

The supplied original symbol is retained, including its orange-to-magenta branding. The animated quantum field is a procedural recreation of the reference artwork, so its individual particles are not pixel-identical to the screenshot.
