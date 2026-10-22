/* Copyright (c) 2026 Bruder Motion. All rights reserved. See LICENSE. */
/* Bruder Motion pro v2: interactions and motion
   Libraries: GSAP + ScrollTrigger, Lenis (in /vendor). Background film grain and light leaks are in bg.js. */

/* ── EDIT YOUR CONTACT DETAILS HERE ──────────────────────────────────
   whatsapp: country code + number, digits only (e.g. 15551234567)
   email:    the address messages should go to                         */
const CONTACT = {
  whatsapp: '15551234567',
  email: 'hello@example.com'
};

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ── Contact links ─────────────────────────────────────────────── */
  const waUrl = text => `https://wa.me/${CONTACT.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
  const mailUrl = (subject, body) => `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject || 'New project')}${body ? '&body=' + encodeURIComponent(body) : ''}`;
  $$('[data-contact="whatsapp"]').forEach(a => (a.href = waUrl('Hello, I have a video project.')));
  $$('[data-contact="email"]').forEach(a => (a.href = mailUrl('New video project')));

  // Brief form: builds the message and opens WhatsApp or email
  const form = $('#brief-form');
  if (form) {
    let via = 'whatsapp';
    $$('[data-send]', form).forEach(b => b.addEventListener('click', () => (via = b.dataset.send)));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#f-name').value.trim();
      const needs = $$('input[name="need"]:checked', form).map(i => i.value);
      const msg = $('#f-msg').value.trim();
      const text = [
        `Hello${name ? `, I'm ${name}` : ''}.`,
        needs.length ? `I need: ${needs.join(', ')}.` : '',
        msg
      ].filter(Boolean).join('\n\n');
      const url = via === 'email' ? mailUrl(`New project${name ? ' from ' + name : ''}`, text) : waUrl(text);
      const a = document.createElement('a');
      a.href = url;
      if (via === 'whatsapp') { a.target = '_blank'; a.rel = 'noopener'; }
      document.body.appendChild(a); a.click(); a.remove();
      $('#form-note').textContent = via === 'email' ? 'Your email app should open with the message filled in.' : 'WhatsApp should open with the message filled in.';
    });
  }

  /* ── Split text into characters ────────────────────────────────── */
  $$('[data-chars]').forEach(el => {
    el.innerHTML = [...el.textContent].map(c => c === ' ' ? ' ' : `<span class="ch">${c}</span>`).join('');
  });

  /* ── Photos: show once loaded, otherwise keep the placeholder ──── */
  $$('.client-photo img, .editor-photo img').forEach(img => {
    const show = () => img.parentElement.classList.remove('empty');
    img.addEventListener('load', show);
    const useAlt = () => { const alt = img.dataset.altSrc; if (alt && img.src !== alt) img.src = alt; };
    img.addEventListener('error', useAlt);
    // the photo may have failed before this script ran
    if (img.complete) img.naturalWidth ? show() : useAlt();
  });
  $$('.clip img, .svc-media img, .tool-ic img').forEach(img => img.addEventListener('error', () => img.remove(), { once: true }));

  /* ── Hero videos fade in once they actually play ───────────────── */
  $$('[data-hero-video]').forEach(v => {
    v.addEventListener('playing', () => v.classList.add('on'));
    // a cached video can start playing before this script runs
    if (!v.paused && v.readyState > 2) v.classList.add('on');
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); }
  });

  /* No right-click menu or dragging on images and videos */
  const isMedia = e => e.target.closest && e.target.closest('img, video, picture, .reel-panel, .client-photo, .editor-photo, .clip, .tool-ic, .arc-center');
  document.addEventListener('contextmenu', e => { if (isMedia(e)) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (isMedia(e)) e.preventDefault(); });
  $$('video').forEach(v => { v.setAttribute('controlsList', 'nodownload'); v.disablePictureInPicture = true; });

  /* Showreel: starts on click with sound; mutes itself once scrolled out of view */
  $$('[data-reel-video]').forEach(v => {
    const panel = v.closest('.reel-panel');
    const playBtn = panel.querySelector('[data-reel-play]');
    const soundBtn = panel.querySelector('[data-reel-sound]');
    const label = soundBtn.querySelector('span');
    const sync = () => {
      soundBtn.setAttribute('aria-pressed', String(!v.muted));
      label.textContent = v.muted ? 'Sound on' : 'Mute';
    };
    v.addEventListener('playing', () => { v.classList.add('on'); panel.classList.remove('is-loading'); panel.classList.add('is-started', 'is-playing'); });
    v.addEventListener('pause', () => panel.classList.remove('is-playing', 'is-loading'));
    // phones only start fetching the reel on the first tap, so show a spinner at once instead of waiting silently
    v.addEventListener('waiting', () => { if (!v.paused) panel.classList.add('is-loading'); });
    const start = () => {
      v.muted = false; sync();
      panel.classList.add('is-loading');
      v.play().catch(() => panel.classList.remove('is-loading'));
    };
    playBtn.addEventListener('click', e => { e.stopPropagation(); start(); });
    soundBtn.addEventListener('click', e => { e.stopPropagation(); v.muted = !v.muted; sync(); });
    // once started, clicking the reel pauses and resumes it
    panel.addEventListener('click', e => {
      if (!panel.classList.contains('is-started') || panel.classList.contains('is-loading') || e.target.closest('a,button')) return;
      v.paused ? v.play().catch(() => {}) : v.pause();
    });
    new IntersectionObserver(([e]) => { if (e.intersectionRatio < .25 && !v.muted) { v.muted = true; sync(); } }, { threshold: .25 }).observe(panel);
    // start buffering before the click, right after the page loads (phones get the lighter 720p file)
    const warm = () => { if (v.preload !== 'auto') v.preload = 'auto'; };
    if (!saveData) addEventListener('load', () => setTimeout(warm, 300), { once: true });
    ['pointerenter', 'touchstart', 'focusin'].forEach(t => panel.addEventListener(t, warm, { once: true, passive: true }));
  });

  /* ── Work tabs ─────────────────────────────────────────────────── */
  const tabs = $$('.tab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(o => {
      const on = o === t;
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-selected', String(on));
      $('#' + o.getAttribute('aria-controls')).hidden = !on;
    });
    // the reel row measures zero while hidden, so redo its progress bar once shown
    $('#reel-row')?.dispatchEvent(new Event('scroll'));
    if (hasGsap && !reduce) {
      const panel = $('#' + t.getAttribute('aria-controls'));
      gsap.fromTo($$('.clip', panel), { y: 40, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .8, stagger: .05, ease: 'expo.out' });
      ScrollTrigger.refresh();
    }
  }));

  /* ── Reel row: arrows, progress, gentle coverflow ──────────────── */
  const row = $('#reel-row'), prog = $('#row-progress');
  if (row) {
    const step = () => (row.querySelector('.clip')?.offsetWidth || 260) + 12;
    $$('.arrow').forEach(b => b.addEventListener('click', () => row.scrollBy({ left: step() * +b.dataset.dir * 2, behavior: 'smooth' })));
    const update = () => {
      const max = row.scrollWidth - row.clientWidth;
      const vis = row.clientWidth / row.scrollWidth;
      prog.style.transform = `translateX(${max ? (row.scrollLeft / max) * (1 / vis - 1) * 100 : 0}%) scaleX(1)`;
      prog.style.width = (vis * 100).toFixed(1) + '%';
      if (!reduce) {
        const mid = row.getBoundingClientRect().left + row.clientWidth / 2;
        $$('.clip', row).forEach(c => {
          const b = c.getBoundingClientRect();
          const d = Math.max(-1, Math.min(1, (b.left + b.width / 2 - mid) / (row.clientWidth / 2)));
          c.style.transform = `rotateY(${(-d * 10).toFixed(2)}deg) scale(${(1 - Math.abs(d) * .04).toFixed(3)})`;
        });
      }
    };
    row.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
    // drag to scroll with a mouse
    let down = false, sx = 0, sl = 0, moved = false;
    row.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = row.scrollLeft; row.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; row.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; row.style.scrollSnapType = ''; });
    row.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  }

  /* ── Services: expanding panels ────────────────────────────────── */
  const svcItems = $$('.svc-item');
  svcItems.forEach(item => {
    const btn = $('.svc-tab', item);
    const open = () => svcItems.forEach(o => {
      const on = o === item;
      o.classList.toggle('is-open', on);
      $('.svc-tab', o).setAttribute('aria-expanded', String(on));
    });
    btn.addEventListener('click', open);
    if (finePointer) item.addEventListener('mouseenter', open);
  });

  /* ── Accordions: one open at a time ────────────────────────────── */
  $$('[data-acc]').forEach(acc => {
    const ds = $$('details', acc);
    ds.forEach(d => d.addEventListener('toggle', () => { if (d.open) ds.forEach(o => { if (o !== d) o.open = false; }); }));
  });

  /* ── Video lightbox ────────────────────────────────────────────── */
  const lb = $('#lightbox'), lbFrame = $('.lb-frame'), lbIframe = $('#lb-iframe'), lbLink = $('#lb-link');
  let lenis = null;
  // h is the private hash that unlisted Vimeo videos need
  const openVideo = (id, vertical, h) => {
    lbIframe.src = `https://player.vimeo.com/video/${id}?${h ? `h=${h}&` : ''}autoplay=1&title=0&byline=0&portrait=0&dnt=1&playsinline=1`;
    lbLink.href = `https://vimeo.com/${id}${h ? `/${h}` : ''}`;
    lbFrame.classList.toggle('vertical', !!vertical);
    lb.hidden = false; lenis && lenis.stop(); $('#lb-close').focus();
  };
  const closeVideo = () => { lb.hidden = true; lbIframe.removeAttribute('src'); lenis && lenis.start(); };
  $$('[data-vimeo]').forEach(b => b.addEventListener('click', () => openVideo(b.dataset.vimeo, b.classList.contains('clip-v') || 'vertical' in b.dataset, b.dataset.vimeoH)));
  // Warm up the Vimeo player once (its scripts then come from cache), when the work section nears view or a clip is touched
  let warmed = false;
  const warmVimeo = () => {
    if (warmed || saveData) return; warmed = true;
    const b = $('[data-vimeo]'); if (!b) return;
    const f = document.createElement('iframe');
    f.src = `https://player.vimeo.com/video/${b.dataset.vimeo}?${b.dataset.vimeoH ? `h=${b.dataset.vimeoH}&` : ''}autoplay=0&muted=1&title=0&byline=0&portrait=0&dnt=1`;
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.title = '';
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:180px;border:0;opacity:0;pointer-events:none';
    f.addEventListener('load', () => setTimeout(() => f.remove(), 4000), { once: true });
    document.body.appendChild(f);
  };
  $$('[data-vimeo]').forEach(b => ['pointerenter', 'touchstart', 'focus'].forEach(t => b.addEventListener(t, warmVimeo, { once: true, passive: true })));
  const workSec = $('#work');
  if (workSec) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); warmVimeo(); } }, { rootMargin: '800px 0px' });
    io.observe(workSec);
  }
  $('#lb-close').addEventListener('click', closeVideo);
  lb.addEventListener('click', e => { if (e.target === lb) closeVideo(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeVideo(); });

  if (!hasGsap) return;

  /* ════════════════════════════════════════════════════════════════
     Motion (GSAP)
     ════════════════════════════════════════════════════════════════ */
  gsap.registerPlugin(ScrollTrigger);

  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: .09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.4 });
    else target === 0 ? scrollTo({ top: 0 }) : target.scrollIntoView();
  }));

  if (reduce) { $$('[data-count]').forEach(el => (el.textContent = el.dataset.count)); return; }

  /* Hero: letters rise, the video pill opens, the rest fades up */
  const heroChars = $$('.wordmark .ch');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .15 });
  tl.from('.nav-pill', { y: -30, opacity: 0, duration: 1.2 }, 0)
    .from('[data-hero]', { y: 24, opacity: 0, filter: 'blur(8px)', duration: 1.2, stagger: .08 }, .1)
    .from(heroChars, { yPercent: 110, duration: 1.4, stagger: .04 }, .15)
    .from('#reel-panel', { y: 80, opacity: 0, duration: 1.6 }, .7);
  // hero text order: eyebrow first, then subtitle and buttons after the wordmark

  // Showreel panel grows to full size as it scrolls up
  gsap.fromTo('#reel-panel', { scale: .9, borderRadius: 48 }, {
    scale: 1, borderRadius: 28, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: '#reel-panel', start: 'top 95%', end: 'top 25%', scrub: true }
  });
  // Wordmark drifts up and fades as you leave the hero
  gsap.to('.wordmark', { yPercent: -12, opacity: .35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '40% top', scrub: true } });

  /* Logo strip loops */
  const lt = $('#logo-track');
  if (lt) {
    lt.innerHTML += lt.innerHTML;
    $$('span', lt).slice($$('span', lt).length / 2).forEach(s => s.setAttribute('aria-hidden', 'true'));
    gsap.to(lt, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
  }

  /* Generic reveals: fade up out of a blur */
  $$('[data-reveal]').forEach(el => gsap.from(el, {
    y: 36, opacity: 0, filter: 'blur(10px)', duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 88%' }
  }));
  $$('[data-reveal-group]').forEach(g => gsap.from(g.children, {
    y: 50, opacity: 0, filter: 'blur(10px)', duration: 1.2, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: g, start: 'top 85%' }
  }));
  $$('.sec .eyebrow').forEach(el => gsap.from(el, { y: 16, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } }));
  gsap.from('#reel-row .clip', { x: 120, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: '#reel-row', start: 'top 85%' } });

  /* Count-up numbers */
  $$('[data-count]').forEach(el => {
    // The real number is in the HTML; it only counts up from 0 once the card comes into view
    const end = +el.dataset.count;
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => {
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)), onComplete: () => (el.textContent = end) });
    } });
  });

  /* Software: tools orbit the circle, faster while scrolling, paused on hover */
  if (matchMedia('(min-width: 641px)').matches) {
    gsap.set(['#arc-tools', '.arc-ring-2'], { xPercent: -50, x: 0 });
    const orbit = gsap.to('#arc-tools', { rotate: '+=360', duration: 48, ease: 'none', repeat: -1 });
    gsap.to('.arc-ring-2', { rotate: '-=360', duration: 90, ease: 'none', repeat: -1 });
    gsap.from('#arc-tools .tool-ic', { opacity: 0, scale: .5, stagger: .06, duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '#arc', start: 'top 80%' } });
    ScrollTrigger.create({ trigger: '#arc', start: 'top bottom', end: 'bottom top',
      onToggle: s => (s.isActive ? orbit.resume() : orbit.pause()),
      onUpdate: s => gsap.to(orbit, { timeScale: 1 + Math.min(Math.abs(s.getVelocity()) / 400, 5), duration: .2, overwrite: true, onComplete: () => gsap.to(orbit, { timeScale: 1, duration: 1.2 }) }) });
    const arc = $('#arc');
    arc.addEventListener('pointerenter', () => gsap.to(orbit, { timeScale: .45, duration: .6, overwrite: true }));
    arc.addEventListener('pointerleave', () => gsap.to(orbit, { timeScale: 1, duration: .6, overwrite: true }));
    // keep tools upright while the circle turns
    const arcTools = $('#arc-tools');
    gsap.ticker.add(() => arcTools.style.setProperty('--r', `${gsap.getProperty(arcTools, 'rotate') || 0}deg`));
  }

  /* Footer wordmark rises letter by letter */
  gsap.from('.foot-wordmark .ch', { yPercent: 100, duration: 1.2, ease: 'expo.out', stagger: .035, scrollTrigger: { trigger: '.foot-wordmark', start: 'top 95%' } });

  /* Pointer: 3D tilt, play cursor */
  if (finePointer) {
    $$('[data-tilt]').forEach(el => {
      const rx = gsap.quickTo(el, 'rotateX', { duration: .6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotateY', { duration: .6, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const b = el.getBoundingClientRect();
        rx(((e.clientY - b.top) / b.height - .5) * -8);
        ry(((e.clientX - b.left) / b.width - .5) * 10);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
    const cur = $('#cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); });
    $$('[data-vimeo]').forEach(v => {
      v.addEventListener('pointerenter', () => cur.classList.add('show'));
      v.addEventListener('pointerleave', () => cur.classList.remove('show'));
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
