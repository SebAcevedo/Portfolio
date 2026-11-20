/* Touch screens have no hover: show an image in full colour while it sits in the middle third of the screen. */
(function () {
  'use strict';
  if (!matchMedia('(hover: none)').matches || !('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('.duo');
  let io;
  function build() {
    if (io) io.disconnect();
    const m = Math.round(innerHeight * 0.35); // rootMargin % resolves against width, so use pixels from the height
    io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)),
      { rootMargin: `-${m}px 0px -${m}px 0px` });
    els.forEach(el => io.observe(el));
  }
  build();
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(build, 200); });
})();
