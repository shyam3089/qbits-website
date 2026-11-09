// Flowing translucent ribbon meshes generated directly in the browser.
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
    const phase = time / 1800;
    const slope = Math.tan(25 * Math.PI / 180);
    const spread = Math.max(28, Math.min(width, height) * .13);
    ctx.lineWidth = Math.max(.55, Math.min(width / 1200, 1) * .85);

    // Fine curved filaments expand and pinch into translucent, crossing ribbons.
    function point(t, offset, ribbon) {
      const x = t * width;
      const layer = ribbon % 3;
      const lower = ribbon >= 3;
      const envelope = lower ? .7 + t * .3 : .65 + .35 * Math.pow(Math.sin(t * Math.PI + layer * .5), 2);
      const originSpread = 1 + .65 * (1 - t);
      const twist = lower ? .85 + .15 * Math.cos(phase * .5 + t * 2) : Math.cos(t * Math.PI * 1.8 + phase * .5 + layer * .8);
      // Lower ribbons fan away from the main diagonal into the bottom-right corner.
      const drop = lower ? height * .28 * (ribbon - 2) * Math.pow(t, 1.5) : 0;
      // Restore the lower-left origin and upward-right diagonal.
      const y = height * (.73 + layer * .035) - (x - width * .55) * slope
        + height * .4 - 100
        + Math.sin(t * Math.PI * 2.1 + phase + layer * 1.6) * height * .07
        + drop
        + offset * spread * originSpread * envelope * twist;
      return [x, y];
    }
    for (let ribbon = 0; ribbon < 5; ribbon++) {
      // Alternate the gradient so purple and orange both reach the visible right edge.
      const colors = ribbon % 2 === 0 ? palette : [...palette].reverse();
      const gradient = ctx.createLinearGradient(width * .25, 0, width, 0);
      gradient.addColorStop(0, 'transparent');
      colors.forEach((color, index) => gradient.addColorStop(.15 + .85 * index / (colors.length - 1), color));
      ctx.strokeStyle = gradient;
      ctx.fillStyle = gradient;
      ctx.globalAlpha = .055;
      ctx.beginPath();
      for (let step = 0; step <= 100; step++) {
        const [x, y] = point(step / 100, -1, ribbon);
        if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (let step = 100; step >= 0; step--) ctx.lineTo(...point(step / 100, 1, ribbon));
      ctx.closePath(); ctx.fill();
      for (let strand = 0; strand < 42; strand++) {
        const offset = strand / 41 * 2 - 1;
        ctx.globalAlpha = .23 + .24 * Math.pow(Math.abs(offset), 3);
        ctx.beginPath();
        for (let step = 0; step <= 100; step++) {
          const [x, y] = point(step / 100, offset, ribbon);
          if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
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
    palette = ['--banner-purple', '--banner-magenta', '--banner-pink', '--banner-coral', '--banner-orange']
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
