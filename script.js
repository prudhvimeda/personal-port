(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Live Cottbus clock in the hero (CET / CEST)
  const clock = document.getElementById('clock');
  const tz = document.getElementById('tz');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  const tick = () => {
    const parts = fmt.formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    clock.textContent = `${get('hour')}:${get('minute')}`;
    const name = get('timeZoneName');
    if (name) tz.textContent = /\+2/.test(name) ? 'CEST' : /\+1/.test(name) ? 'CET' : name;
  };
  tick();
  setInterval(tick, 15000);

  document.getElementById('year').textContent = new Date().getFullYear();

  // Reveal-on-scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // Statement: words light up as you scroll through it
  const fill = document.querySelector('[data-fill]');
  if (fill) {
    const words = fill.textContent.trim().split(/\s+/);
    fill.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    const spans = fill.querySelectorAll('.w');
    const update = () => {
      const r = fill.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = Math.round(progress * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < lit));
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Highlight the dock link for the section in view
  const links = [...document.querySelectorAll('.dock a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window) {
    const navIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => navIo.observe(s));
  }

  // Copy e-mail buttons
  const toast = document.querySelector('.toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  };
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast('E-mail copied');
      } catch {
        showToast(btn.dataset.copy);
      }
    });
  });

  // Photo card that travels with the content: it leaves the hero, glides
  // into the skills column while tilting, flips to its back face, stays
  // pinned beside the skill cards, then scrolls away when they end.
  const card = document.getElementById('flipCard');
  const slot = document.querySelector('.portrait-slot');
  const target = document.querySelector('.sticky-card');
  const cardsCol = document.querySelector('.skills-cards');
  const slides = [...document.querySelectorAll('.slides img')];
  const desktop = window.matchMedia('(min-width: 901px)');

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let m = null; // cached measurements
  const measure = () => {
    const travel = desktop.matches && !reduceMotion;
    document.documentElement.classList.toggle('travel', travel);
    if (!travel) {
      card.style.cssText = '';
      m = null;
      return;
    }
    const s = window.scrollY;
    const r = slot.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const vh = window.innerHeight;
    m = {
      w: r.width,
      h: r.height,
      // where the card starts (viewport coords at scrollY = 0)
      sx: r.left + r.width / 2,
      sy: r.top + s + r.height / 2,
      // where it settles: centred on the skills column, middle of the screen
      tx: t.left + t.width / 2,
      ty: vh / 2,
      ts: Math.min(t.width / r.width, (vh - 180) / r.height),
      vh,
    };
    card.style.width = m.w + 'px';
    card.style.height = m.h + 'px';
  };

  let ticking = false;
  const render = () => {
    ticking = false;
    if (!m) return;
    const s = window.scrollY;
    const move = ease(clamp01(s / (m.vh * 0.75)));
    const flip = ease(clamp01((s - m.vh * 0.35) / (m.vh * 0.6)));

    let cx = lerp(m.sx, m.tx, move);
    let cy = lerp(m.sy - s * (1 - move), m.ty, move);
    const sc = lerp(1, m.ts, move);
    const tilt = Math.sin(move * Math.PI) * 9;

    // Release: once the last skill card passes, the card scrolls up with it
    const end = cardsCol.getBoundingClientRect().bottom;
    const bottom = cy + (m.h * sc) / 2;
    if (bottom > end) cy -= bottom - end;

    card.style.transform =
      `translate3d(${cx - m.w / 2}px, ${cy - m.h / 2}px, 0) ` +
      `perspective(1400px) rotateZ(${tilt}deg) rotateY(${flip * 180}deg) scale(${sc})`;
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  };

  // Back face cycles photos as each skill card comes into view
  if (slides.length) {
    const skillIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = [...cardsCol.children].indexOf(e.target) % slides.length;
        slides.forEach((img, j) => img.classList.toggle('on', j === i));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    [...cardsCol.children].forEach((c) => skillIo.observe(c));
  }

  const remeasure = () => {
    // measure with the card's own transform cleared so the slot rect is clean
    card.style.transform = '';
    measure();
    render();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', remeasure);
  desktop.addEventListener('change', remeasure);
  window.addEventListener('load', remeasure);
  remeasure();
})();
