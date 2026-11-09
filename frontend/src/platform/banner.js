const videoUrls = [
  ['qbits-quantum-loop.webm', 'video/webm'],
  ['qbits-quantum-loop.mp4', 'video/mp4'],
];
const posterUrl = `${import.meta.env.BASE_URL}media/qbits-quantum-poster.jpg`;

// Qbits owns the container; the browser adapter owns its decorative media.
export function mountBanner(target) {
  const video = document.createElement('video');
  video.className = 'banner-video';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.poster = posterUrl;
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  target.setAttribute('aria-hidden', 'true');
  target.append(video);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let home = false;
  let failed = false;
  function refresh() {
    if (home && !document.hidden && !motion.matches && !failed) {
      if (!video.childElementCount) {
        for (const [file, type] of videoUrls) {
          const source = document.createElement('source');
          source.src = `${import.meta.env.BASE_URL}media/${file}`;
          source.type = type;
          video.append(source);
        }
        video.load();
      }
      void video.play().catch(() => { /* The poster remains if autoplay is unavailable. */ });
    } else {
      video.pause();
      if (motion.matches && video.childElementCount) {
        video.replaceChildren();
        video.load();
      }
    }
  }
  const onError = () => {
    failed = true;
    video.replaceChildren();
    video.load();
  };
  video.addEventListener('error', onError);
  document.addEventListener('visibilitychange', refresh);
  motion.addEventListener('change', refresh);
  return {
    refresh,
    setPage(page) { home = page === 'home'; refresh(); },
    dispose() {
      document.removeEventListener('visibilitychange', refresh);
      motion.removeEventListener('change', refresh);
      video.removeEventListener('error', onError);
      video.pause();
      video.replaceChildren();
      video.load();
      video.remove();
    },
  };
}
