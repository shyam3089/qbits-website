# Local validation — 8 November 2026

The website was implemented and checked in `D:\Shyam\PROJECTS\My_Apps\SERVER\qbits-website`. Browser automation used Firefox 142.0.1 through Playwright 1.56.1 only.

| Check | Result |
| --- | --- |
| `npm run check` | PASS — 9 `.qb` files, no compiler errors |
| `npm run build` | PASS — published Qbits 1.0.1, Vite 6.4.5 |
| `.venv\Scripts\python.exe -m pytest backend/tests -q --tb=short` | PASS — 21 API tests |
| `npm test -- --reporter=dot` | PASS — 13 Firefox tests |
| Final logo/wave refinements: desktop and responsive checks | PASS — 4 affected Firefox tests |

The API suite was also run in the project virtual environment with the pinned requirements. It reports one upstream Starlette/AnyIO deprecation warning; no test failures.

## Visual comparison

Compared Firefox screenshots with `Neon Qbits Hero with Curved Command Bar.png` at its original **1254 × 775** size. Refined typography, headline width, description spacing, CTA positioning, navigation, frame curvature and wave trajectories after inspecting the renders.

- Frame: x = 44, y = 20, width = 1166, height = 723 CSS pixels.
- Hero left edge: x = 122. CTAs: approximately y = 465, width = 245, height = 62 CSS pixels.
- GitHub inset and the terminal's curved upper boundary are independent vector paths, configured through CSS tokens.
- The navbar uses the supplied main logo's original wordmark as a mask for white text, and the supplied symbol retains its original colours. The standalone hero symbol also uses the supplied asset.
- Tablet: **820 × 1180**. Mobile: **390 × 844** and **320 × 568**. The home page has no document overflow; maintained content pages use regular page scrolling with responsive section navigation, while settings scroll inside the frame.
- Animated particles are a procedural recreation, not an exact copy of the reference's individual particles. The supplied original orange/magenta logo differs intentionally from the symbol illustrated in the approved screenshot.

Saved screenshots:

- [Desktop](artifacts/desktop.png)
- [Tablet](artifacts/tablet.png)
- [Mobile](artifacts/mobile.png)
- [Small mobile](artifacts/small-mobile.png)
- [Admin with the Midnight theme](artifacts/admin.png)

## Behaviour verified

All five public navigation views, browser history, production deep links, installation/documentation CTAs, configured GitHub/npm destinations, exact command copying, code copying, keyboard navigation, skip control and focus states.

API loading failures and retries remain within the site layout. Maintained content pages use regular page scrolling; settings use an internal scroll surface. Reduced motion produces a static particle canvas and disables the terminal cursor animation; the canvas changes when motion is allowed. Clipboard feedback was tested both with a controlled clipboard to assert exact text and with a real Firefox clipboard write.

Admin checks cover incorrect and correct passwords, session restoration, validated GitHub/npm URL edits, theme selection, token overrides, preview, persistent save, reload and logout. API checks separately verify CSRF/origin protection, rate limiting, validation rejection without mutation, and settings persistence across backend app restarts.

## Delivery limits

No framework-core modifications, scaffolding generators, React/Vue/Angular, database, GitHub Actions, cloud CI or publication. The website runs locally. The run commands and admin password setup are in [README.md](README.md).

Qbits 1.0.1 lacks arbitrary HTML attributes, async/network calls, canvas and clipboard operations in `.qb`; a browser adapter provides them. Feeding API data through the mount's `updateState` method uses the documented experimental host interface, so Qbits is pinned. CSS breakpoint variables are expanded at build time. Production admin sessions require a configured password and one backend worker; sessions do not survive a backend restart.
