/* Shared behavior: EN/ES switch, opening montage + timecode (home only), solid bar on scroll.
   A page provides its Spanish strings as window.ES = { key: 'texto', ... } BEFORE loading this file.
   Any element with data-i18n="key" is swapped; data-i18n-alt="key" swaps an image's alt text. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get() { try { return localStorage.getItem('lang'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem('lang', v); } catch (e) {} }
  };

  /* ── Language ── */
  const ES = window.ES || {};
  const EN = {};
  document.querySelectorAll('[data-i18n]').forEach(e => { EN[e.dataset.i18n] ??= e.innerHTML; });
  document.querySelectorAll('[data-i18n-alt]').forEach(e => { EN['alt:' + e.dataset.i18nAlt] ??= e.alt; });
  document.querySelectorAll('[data-i18n-label]').forEach(e => { EN['label:' + e.dataset.i18nLabel] ??= e.getAttribute('aria-label'); });
  const titleEN = document.title;

  function setLang(l) {
    document.documentElement.lang = l;
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === l)));
    document.querySelectorAll('[data-i18n]').forEach(e => {
      const k = e.dataset.i18n; e.innerHTML = (l === 'es' && ES[k] != null) ? ES[k] : EN[k];
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(e => {
      const k = e.dataset.i18nAlt; e.alt = (l === 'es' && ES['alt:' + k] != null) ? ES['alt:' + k] : EN['alt:' + k];
    });
    document.querySelectorAll('[data-i18n-label]').forEach(e => {
      const k = 'label:' + e.dataset.i18nLabel; e.setAttribute('aria-label', (l === 'es' && ES[k] != null) ? ES[k] : EN[k]);
    });
    document.title = (l === 'es' && ES._title) ? ES._title : titleEN;
    store.set(l);
    document.dispatchEvent(new Event('langchange'));
  }
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.l)));
  const qs = new URLSearchParams(location.search).get('lang');
  const start = qs === 'es' || qs === 'en' ? qs : store.get();
  setLang(start === 'es' ? 'es' : 'en');

  /* ── Bar gets a solid background after the opening ── */
  const bar = document.querySelector('.bar');
  if (bar) {
    const onScroll = () => bar.classList.toggle('solid', scrollY > innerHeight * 0.6 || !document.querySelector('.open'));
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ── Opening slideshow (home): window.SLIDES = [{ v: mp4 } | { img: src, pos }, label] ──
     One "token" per slide: callbacks from an older slide are ignored, so pause/resume
     can never leave two timers or two videos racing. */
  const layers = [...document.querySelectorAll('.open .reel')];
  const slides = window.SLIDES || [];
  const labelEl = document.getElementById('slide-label');
  const pauseBtn = document.querySelector('.open .pause');
  const STILL_MS = 3400;
  const motionMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionMQ.matches, started = false;
  let n = 0, cur = 0, token = 0, timer = null, media = null, stillLeft = STILL_MS, stillAt = 0;
  const pad2 = x => String(x).padStart(2, '0');
  const isES = () => document.documentElement.lang === 'es';

  function stopMedia() {
    clearTimeout(timer); timer = null;
    if (media && media.tagName === 'VIDEO') { media.onplaying = media.onended = media.onerror = null; media.pause(); media.removeAttribute('src'); media.load(); }
  }
  function next() { n++; cur = 1 - cur; show(); }
  function show() {
    if (paused || !slides.length) return;
    started = true;
    const my = ++token, s = slides[n % slides.length], layer = layers[cur], other = layers[1 - cur];
    const prev = layer.querySelector('video'); if (prev) { prev.pause(); prev.removeAttribute('src'); prev.load(); }
    layer.innerHTML = '';
    const live = () => my === token;
    const reveal = () => {
      if (!live()) return;
      layer.classList.add('on'); other.classList.remove('on');
      const ov = other.querySelector('video'); if (ov) ov.pause();
      if (labelEl) labelEl.textContent = pad2(n % slides.length + 1) + ' / ' + pad2(slides.length) + ' · ' + s.label;
    };
    const done = () => { if (live() && !paused) next(); };
    if (s.v) {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = s.v;
      v.onplaying = reveal; v.onended = done; v.onerror = done;
      media = v; layer.appendChild(v);
      const p = v.play(); if (p) p.catch(() => { if (live()) timer = setTimeout(done, 1500); });
    } else {
      const i = new Image(); i.alt = ''; i.style.objectPosition = s.pos || 'center';
      i.onload = () => { if (!live()) return; reveal(); stillLeft = STILL_MS; stillAt = Date.now(); timer = setTimeout(done, stillLeft); };
      i.onerror = done; i.src = s.img;
      media = i; layer.appendChild(i);
    }
  }
  function label() {
    if (!pauseBtn) return;
    pauseBtn.textContent = paused ? (isES() ? '▶ Reproducir' : '▶ Play') : (isES() ? '❚❚ Pausa' : '❚❚ Pause');
    pauseBtn.setAttribute('aria-label', paused ? (isES() ? 'Reproducir el video de apertura' : 'Play the opening video') : (isES() ? 'Pausar el video de apertura' : 'Pause the opening video'));
  }
  function setPaused(p) {
    if (p === paused) return;
    paused = p; label();
    if (paused) {
      clearTimeout(timer); timer = null;
      if (media && media.tagName === 'VIDEO') media.pause();
      else if (media && stillAt) stillLeft = Math.max(400, stillLeft - (Date.now() - stillAt));
    } else if (!started || !media) {
      show();
    } else if (media.tagName === 'VIDEO') {
      if (media.ended) next(); else { const pr = media.play(); if (pr) pr.catch(() => next()); }
    } else {
      const my = token; stillAt = Date.now();
      timer = setTimeout(() => { if (my === token && !paused) next(); }, stillLeft);
    }
  }
  if (layers.length === 2 && slides.length) {
    show(); label();
    if (pauseBtn) pauseBtn.addEventListener('click', () => setPaused(!paused));
    document.addEventListener('langchange', label);
    motionMQ.addEventListener && motionMQ.addEventListener('change', e => { if (e.matches) setPaused(true); });
    addEventListener('pagehide', stopMedia);
  }

  /* ── Running timecode (home) ── */
  const tc = document.getElementById('tc');
  if (tc) {
    const t0 = performance.now(), pad = x => String(x).padStart(2, '0');
    const tick = () => {
      const f = Math.floor((performance.now() - t0) / 1000 * 24);
      tc.textContent = 'TC ' + pad(Math.floor(f / 86400) % 100) + ':' + pad(Math.floor(f / 1440) % 60) + ':' + pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
      if (!motionMQ.matches) requestAnimationFrame(tick);
    };
    tick();
  }
})();
