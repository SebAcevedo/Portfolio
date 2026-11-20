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

/* Films: show the poster with one styled play button; native controls appear once it plays. */
(function () {
  'use strict';
  const vids = document.querySelectorAll('figure video, .case-cover video');
  if (!vids.length) return;
  const txt = () => document.documentElement.lang === 'es' ? 'Ver video' : 'Play film';
  const btns = [];
  vids.forEach(v => {
    const wrap = document.createElement('span'); wrap.className = 'vwrap';
    v.parentNode.insertBefore(wrap, v); wrap.appendChild(v);
    v.controls = false;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'play-btn';
    b.innerHTML = '<i aria-hidden="true"></i><span></span>'; b.querySelector('span').textContent = txt();
    const lab = v.getAttribute('aria-labelledby'); if (lab) b.setAttribute('aria-describedby', lab);
    b.addEventListener('click', () => { v.controls = true; b.remove(); const p = v.play(); if (p) p.catch(() => {}); v.focus(); });
    v.addEventListener('play', () => { v.controls = true; b.remove(); });
    wrap.appendChild(b); btns.push(b);
  });
  document.addEventListener('langchange', () => btns.forEach(b => { const s = b.querySelector('span'); if (s) s.textContent = txt(); }));
})();
