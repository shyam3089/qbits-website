const namespace = 'http://www.w3.org/2000/svg';
const svgNode = (tag, attributes) => {
  const node = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
};

// Decorative geometry only. All interactive UI is mounted by Qbits components.
export function mountFrameArt(target) {
  const svg = svgNode('svg', { preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const defs = svgNode('defs', {});
  const gradient = svgNode('linearGradient', { id: 'frame-shell', x2: '100%', y2: '100%' });
  gradient.append(
    svgNode('stop', { offset: '0%', 'stop-color': 'var(--inset-start)' }),
    svgNode('stop', { offset: '100%', 'stop-color': 'var(--inset-end)' }),
  );
  defs.append(gradient);
  const terminalGradient = svgNode('linearGradient', { id: 'terminal-fill', x2: '0%', y2: '100%' });
  terminalGradient.append(
    svgNode('stop', { offset: '0%', 'stop-color': 'var(--terminal-start)' }),
    svgNode('stop', { offset: '100%', 'stop-color': 'var(--terminal-end)' }),
  );
  defs.append(terminalGradient);
  const panelShadowFilter = svgNode('filter', { id: 'panel-shadow', x: '-10%', y: '-10%', width: '120%', height: '120%', 'color-interpolation-filters': 'sRGB' });
  const panelDropShadow = svgNode('feDropShadow', { dx: '0', 'flood-color': 'var(--panel-shadow-color)', result: 'shadow' });
  // Keep only the shadow outside the panel so the content and artwork stay clear.
  panelShadowFilter.append(panelDropShadow, svgNode('feComposite', { in: 'shadow', in2: 'SourceAlpha', operator: 'out' }));
  defs.append(panelShadowFilter);
  svg.append(defs);
  // One continuous shell surrounds the inset dark surface and both recesses.
  // The inner subpath also masks the wave artwork at the panel's edges.
  const shell = svgNode('path', { class: 'frame-shell', fill: 'url(#frame-shell)', 'fill-rule': 'evenodd' });
  svg.append(shell);
  const terminalBackground = svgNode('path', { fill: 'url(#terminal-fill)' });
  svg.append(terminalBackground);
  const panelShadow = svgNode('path', { class: 'panel-shadow', fill: 'var(--frame-bg)', filter: 'url(#panel-shadow)' });
  svg.append(panelShadow);
  const githubEdge = svgNode('path', { class: 'structure-edge' });
  const terminalEdge = svgNode('path', { class: 'structure-edge' });
  svg.append(githubEdge, terminalEdge);
  target.append(svg);
  function refresh() {
    const css = getComputedStyle(document.documentElement);
    const value = token => Number.parseFloat(css.getPropertyValue(token));
    const { width: w, height: h } = target.getBoundingClientRect();
    const r = value('--frame-radius'), s = value('--frame-inset'), ir = r - s;
    const g = Math.max(r, w - value('--github-inset-width'));
    const d = value('--terminal-inset-height'), c = value('--github-curve-width');
    const ty = h - value('--terminal-inset-height'), lower = h - s;
    const tw = Math.min(value('--terminal-inset-width'), w * value('--terminal-width-limit'));
    const tc = Math.min(value('--terminal-curve-width'), w * value('--terminal-curve-limit')), start = tw - tc;
    const ga = value('--github-curve-control-a'), gb = value('--github-curve-control-b');
    const ta = value('--terminal-curve-control-a'), tb = value('--terminal-curve-control-b');
    const outer = `M${r} 0 H${w-r} A${r} ${r} 0 0 1 ${w} ${r} V${h-r} A${r} ${r} 0 0 1 ${w-r} ${h} H${r} A${r} ${r} 0 0 1 0 ${h-r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
    const inner = `M${r} ${s} H${g} C${g+c*ga} ${s} ${g+c*gb} ${d} ${g+c} ${d} H${w-r} Q${w-s} ${d} ${w-s} ${d+ir} V${lower-ir} Q${w-s} ${lower} ${w-r} ${lower} H${tw} C${start+tc*tb} ${lower} ${start+tc*ta} ${ty} ${start} ${ty} H${r} Q${s} ${ty} ${s} ${ty-ir} V${r} A${ir} ${ir} 0 0 1 ${r} ${s} Z`;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    shell.setAttribute('d', `${outer} ${inner}`);
    panelShadow.setAttribute('d', inner);
    panelDropShadow.setAttribute('dy', value('--panel-shadow-offset'));
    panelDropShadow.setAttribute('stdDeviation', value('--panel-shadow-blur'));
    terminalBackground.setAttribute('d', `M${s} ${ty-ir} Q${s} ${ty} ${r} ${ty} H${start} C${start+tc*ta} ${ty} ${start+tc*tb} ${lower} ${tw} ${lower} H${r} A${ir} ${ir} 0 0 1 ${s} ${lower-ir} Z`);
    githubEdge.setAttribute('d', `M${g} ${s} C${g+c*ga} ${s} ${g+c*gb} ${d} ${g+c} ${d} H${w-r} Q${w-s} ${d} ${w-s} ${d+ir}`);
    terminalEdge.setAttribute('d', `M${s} ${ty-ir} Q${s} ${ty} ${r} ${ty} H${start} C${start+tc*ta} ${ty} ${start+tc*tb} ${lower} ${tw} ${lower}`);
  }
  const resize = new ResizeObserver(refresh);
  resize.observe(target); refresh();
  return { refresh, dispose() { resize.disconnect(); svg.remove(); } };
}

function interpolate(points, position) {
  const segment = Math.min(points.length - 2, Math.floor(position));
  const t = position - segment;
  const a = points[Math.max(0, segment - 1)];
  const b = points[segment];
  const c = points[segment + 1];
  const d = points[Math.min(points.length - 1, segment + 2)];
  return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
}

export function mountQuantum(target) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  target.append(canvas);
  const context = canvas.getContext('2d', { alpha: true });
  const bitmap = document.createElement('canvas');
  const ink = bitmap.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation, previous = 0, visible = true, settings, size, disposed = false;

  function bake() {
    const css = getComputedStyle(document.documentElement);
    const number = key => Number.parseFloat(css.getPropertyValue(key));
    const sequence = key => css.getPropertyValue(key).trim().split(/\s+/).map(Number).filter(Number.isFinite);
    const waveGeometry = {
      referenceWidth: number('--wave-reference-width'), referenceHeight: number('--wave-reference-height'),
      startX: number('--wave-start-x'), endX: number('--wave-end-x'),
      samples: Math.max(2, Math.min(400, number('--wave-samples'))),
      bands: Math.max(2, Math.min(60, number('--wave-bands'))),
      stars: Math.max(0, Math.min(300, number('--wave-stars'))), seed: number('--wave-seed'),
      curves: ['magenta', 'cyan', 'violet', 'lower'].map(name => { const points = sequence(`--wave-curve-${name}`); return points.length >= 2 ? points : [0, 0]; }),
      spread: sequence('--wave-spread'), starTop: number('--wave-star-top'), starHeight: number('--wave-star-height'),
      halo: { x: number('--wave-halo-x'), y: number('--wave-halo-y'), radius: Math.max(1, number('--wave-halo-radius')), top: number('--wave-halo-top') },
    };
    settings = {
      speed: Math.max(1, number('--wave-speed')) * 1000,
      motion: number('--wave-motion'), fps: Math.max(1, number('--wave-fps')),
      ratio: Math.min(devicePixelRatio, number('--wave-pixel-ratio')),
      blue: css.getPropertyValue('--blue').trim(), cyan: css.getPropertyValue('--cyan').trim(),
      violet: css.getPropertyValue('--violet').trim(), accent: css.getPropertyValue('--accent-strong').trim(),
      glow: number('--wave-glow'), line: number('--wave-line-width'),
      dot: number('--wave-dot-size'), sparkle: number('--wave-sparkle-size'),
      bandOpacity: number('--wave-band-opacity'), starOpacity: number('--wave-star-opacity'), haloOpacity: number('--wave-halo-opacity'),
    };
    size = target.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(size.width * settings.ratio));
    canvas.height = Math.max(1, Math.round(size.height * settings.ratio));
    bitmap.width = canvas.width;
    bitmap.height = canvas.height;
    ink.setTransform(canvas.width / waveGeometry.referenceWidth, 0, 0, canvas.height / waveGeometry.referenceHeight, 0, 0);
    ink.clearRect(0, 0, waveGeometry.referenceWidth, waveGeometry.referenceHeight);
    const colors = [settings.accent, settings.cyan, settings.violet, settings.blue];
    ink.globalCompositeOperation = 'lighter';
    const { halo: haloGeometry } = waveGeometry;
    const halo = ink.createRadialGradient(haloGeometry.x, haloGeometry.y, 0, haloGeometry.x, haloGeometry.y, haloGeometry.radius);
    halo.addColorStop(0, settings.accent); halo.addColorStop(1, 'transparent');
    ink.globalAlpha = settings.haloOpacity; ink.fillStyle = halo;
    ink.fillRect(waveGeometry.startX, haloGeometry.top, waveGeometry.referenceWidth - waveGeometry.startX, waveGeometry.referenceHeight - haloGeometry.top);
    waveGeometry.curves.forEach((curve, index) => {
      const gradient = ink.createLinearGradient(waveGeometry.startX, 0, waveGeometry.endX, 0);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.25, index === 1 ? settings.blue : settings.violet);
      gradient.addColorStop(0.65, colors[index]);
      if (index === 1) gradient.addColorStop(0.9, settings.blue);
      gradient.addColorStop(1, index === 2 ? settings.accent : index === 1 ? settings.blue : index === 3 ? settings.cyan : colors[index]);
      ink.fillStyle = gradient;
      ink.shadowBlur = 0;
      for (let band = 0; band < waveGeometry.bands; band++) {
        const offset = band / (waveGeometry.bands - 1);
        ink.globalAlpha = settings.bandOpacity * (1 - offset * 0.65);
        for (let sample = 0; sample < waveGeometry.samples; sample++) {
          const t = Math.min(1, (sample + (band % 2) * 0.5) / (waveGeometry.samples - 1));
          const x = waveGeometry.startX + t * (waveGeometry.endX - waveGeometry.startX);
          const y = interpolate(curve, t * (curve.length - 1)) + offset * waveGeometry.spread[index] * Math.sin(t * Math.PI * 0.88);
          ink.beginPath(); ink.arc(x, y, settings.dot, 0, Math.PI * 2); ink.fill();
        }
      }
      ink.globalAlpha = 1;
      ink.strokeStyle = gradient;
      ink.shadowColor = colors[index];
      ink.shadowBlur = settings.glow;
      ink.lineWidth = settings.line;
      for (let pass = 0; pass < 3; pass++) {
        ink.lineWidth = pass === 0 ? settings.line * 3 : settings.line;
        ink.globalAlpha = pass === 0 ? 0.3 : 1;
        ink.beginPath();
        for (let sample = 0; sample < waveGeometry.samples; sample++) {
          const t = sample / (waveGeometry.samples - 1);
          const x = waveGeometry.startX + t * (waveGeometry.endX - waveGeometry.startX);
          const y = interpolate(curve, t * (curve.length - 1));
          if (sample === 0) ink.moveTo(x, y); else ink.lineTo(x, y);
        }
        ink.stroke();
      }
    });
    let seed = waveGeometry.seed;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < waveGeometry.stars; i++) {
      const x = waveGeometry.startX + random() * (waveGeometry.endX - waveGeometry.startX);
      const y = waveGeometry.starTop + random() * waveGeometry.starHeight;
      const radius = random() * settings.sparkle;
      ink.fillStyle = i % 3 ? settings.blue : settings.accent;
      ink.shadowColor = ink.fillStyle;
      ink.shadowBlur = settings.glow;
      ink.globalAlpha = settings.starOpacity;
      ink.beginPath(); ink.arc(x, y, radius, 0, Math.PI * 2); ink.fill();
    }
    draw(0);
  }

  function draw(now) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const displacement = reducedMotion.matches ? 0 : Math.sin(now / settings.speed * Math.PI * 2) * settings.motion * settings.ratio;
    context.drawImage(bitmap, 0, displacement);
  }

  function tick(now) {
    if (disposed || reducedMotion.matches || !visible || document.hidden) return;
    if (now - previous >= 1000 / settings.fps) { draw(now); previous = now; }
    animation = requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(animation);
    if (!reducedMotion.matches && visible && !document.hidden) animation = requestAnimationFrame(tick);
    else draw(0);
  }
  const resize = new ResizeObserver(() => { bake(); resume(); });
  resize.observe(target);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); });
  intersection.observe(target);
  reducedMotion.addEventListener('change', resume);
  document.addEventListener('visibilitychange', resume);
  bake(); resume();
  return {
    refresh() { bake(); resume(); },
    dispose() { disposed = true; cancelAnimationFrame(animation); resize.disconnect(); intersection.disconnect(); reducedMotion.removeEventListener('change', resume); document.removeEventListener('visibilitychange', resume); canvas.remove(); },
  };
}
