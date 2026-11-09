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
    const phase = time / 6800;
    const scale = Math.min(width / 1200, height / 720);
    // Diffuse color washes keep the artwork airy on the white surface.
    palette.forEach((color, index) => {
      const x = width * (.76 + index * .1);
      const y = height * (.4 + index * .16) + Math.sin(phase + index) * 16 * scale;
      const radius = Math.max(width * .22, height * .28);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, color + '38');
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    });
    for (let ribbon = 0; ribbon < 3; ribbon++) {
      const color = palette[ribbon];
      const gradient = ctx.createLinearGradient(width * .32, 0, width, 0);
      gradient.addColorStop(0, color + '00');
      gradient.addColorStop(.35, color + '99');
      gradient.addColorStop(.75, color + 'ee');
      gradient.addColorStop(1, color + '88');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(.9, scale * 1.8);
      for (let strand = 0; strand < 23; strand++) {
        ctx.beginPath();
        for (let step = 0; step <= 100; step++) {
          const t = step / 100;
          const x = width * (.28 + t * .82);
          const envelope = Math.sin(t * Math.PI * .85);
          const wave = Math.sin(t * Math.PI * 2.7 + phase + ribbon * 1.5);
          const y = height * (.66 + ribbon * .055)
            + wave * height * .14 * envelope
            + (strand - 11) * 5 * scale * envelope
            + Math.cos(t * 4 + phase * .7 + ribbon) * height * .035;
          if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    drawParticles(phase, scale);
  }
  function drawParticles(phase, scale) {
    // Fixed seeds keep the particle field consistent between frames.
    for (let particle = 0; particle < 84; particle++) {
      const seed = Math.sin(particle * 127.1 + 17) * 43758.5453;
      const fraction = seed - Math.floor(seed);
      const x = width * (.4 + fraction * .63) + Math.sin(phase * .4 + particle) * 7 * scale;
      const y = height * (.18 + ((particle * .618034) % 1) * .72)
        + Math.cos(phase * .6 + particle * .7) * 11 * scale;
      const color = palette[particle % 3];
      const dot = Math.max(.65, (particle % 7 === 0 ? 2.1 : 1) * scale);
      ctx.globalAlpha = .35 + .5 * (.5 + .5 * Math.sin(phase * 1.6 + particle));
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, dot, 0, Math.PI * 2); ctx.fill();
      if (particle % 9 === 0) {
        ctx.strokeStyle = color + '80';
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(x - dot * 3, y); ctx.lineTo(x + dot * 3, y);
        ctx.moveTo(x, y - dot * 3); ctx.lineTo(x, y + dot * 3);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
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
