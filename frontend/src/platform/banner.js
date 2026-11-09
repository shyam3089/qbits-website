// Transparent, theme-aware ribbons generated directly in the browser.
// Qbits owns the container; this adapter owns only the decorative canvas.
export function mountBanner(target) {
  const canvas = document.createElement('canvas');
  canvas.className = 'banner-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  target.setAttribute('aria-hidden', 'true');
  target.append(canvas);
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let home = false, disposed = false, frame = 0, last = 0;
  let width = 1, height = 1, palette = [];

  function draw(time = 0) {
    ctx.clearRect(0, 0, width, height);
    const phase = time / 8500;
    const scale = Math.min(width / 1200, height / 720);
    // Diffuse color washes keep the artwork airy on the white surface.
    palette.forEach((color, index) => {
      const x = width * (.76 + index * .1);
      const y = height * (.4 + index * .16) + Math.sin(phase + index) * 16 * scale;
      const radius = Math.max(width * .22, height * .28);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, color + '20');
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    });
    for (let ribbon = 0; ribbon < 3; ribbon++) {
      const color = palette[ribbon];
      const gradient = ctx.createLinearGradient(width * .32, 0, width, 0);
      gradient.addColorStop(0, color + '00');
      gradient.addColorStop(.35, color + '55');
      gradient.addColorStop(.75, color + 'aa');
      gradient.addColorStop(1, color + '40');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(.65, scale * 1.15);
      for (let strand = 0; strand < 23; strand++) {
        ctx.beginPath();
        for (let step = 0; step <= 100; step++) {
          const t = step / 100;
          const x = width * (.28 + t * .82);
          const envelope = Math.sin(t * Math.PI * .85);
          const wave = Math.sin(t * Math.PI * 2.05 + phase + ribbon * 1.5);
          const y = height * (.6 + ribbon * .055)
            + wave * height * .14 * envelope
            + (strand - 11) * 3.2 * scale * envelope
            + Math.cos(t * 4 + phase * .7 + ribbon) * height * .035;
          if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  function tick(time) {
    if (disposed || !home || document.hidden || motion.matches) return;
    if (time - last >= 1000 / 24) { draw(time); last = time; }
    frame = requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(frame);
    if (disposed) return;
    if (motion.matches) draw(0);
    else if (home && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function refresh() {
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const css = getComputedStyle(document.documentElement);
    palette = ['--banner-lavender', '--banner-blue', '--banner-pink']
      .map(key => css.getPropertyValue(key).trim());
    draw(0); resume();
  }
  const resize = new ResizeObserver(refresh);
  resize.observe(target);
  motion.addEventListener('change', resume);
  document.addEventListener('visibilitychange', resume);
  refresh();
  return {
    refresh,
    setPage(page) { home = page === 'home'; resume(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      motion.removeEventListener('change', resume);
      document.removeEventListener('visibilitychange', resume);
      canvas.remove();
    },
  };
}
