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

  // Photo card that travels with the content. Timeline (in px at an 800px
  // tall window, scaled to the real height):
  //     0–330  glide right/down to the skills column, tilting to 8°
  //   440–1060 flip to the back face while the tilt straightens
  //  1100 → pin end − 600  slow grow-and-settle while pinned
  //  pin end − 500 → pin end − 100  flip back to the front
  //  after pin end  scroll away with the content
  // Progress follows a smoothed scroll value so the motion trails the
  // wheel slightly instead of snapping.
  const card = document.getElementById('flipCard');
  const slot = document.querySelector('.portrait-slot');
  const target = document.querySelector('.sticky-card');
  const cardsCol = document.querySelector('.skills-cards');
  const slides = [...document.querySelectorAll('.slides img')];
  const desktop = window.matchMedia('(min-width: 761px)');

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const range = (s, from, to) => clamp01((s - from) / (to - from));

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
    const k = vh / 800;
    const ty = vh / 2 + 22 * k;
    m = {
      w: r.width,
      h: r.height,
      k,
      // start: the hero slot (viewport coords at scrollY = 0)
      sx: r.left + r.width / 2,
      sy: r.top + s + r.height / 2,
      // pinned spot: centre of the skills column, just below mid-screen
      tx: t.left + t.width / 2,
      ty,
      // scroll position where the card's bottom meets the last skill card
      pinEnd: cardsCol.getBoundingClientRect().bottom + s - ty - r.height / 2,
    };
    card.style.width = m.w + 'px';
    card.style.height = m.h + 'px';
  };

  let smooth = window.scrollY;
  let raf = 0;
  const render = () => {
    raf = 0;
    if (!m) return;
    const real = window.scrollY;
    smooth += (real - smooth) * 0.14;
    if (Math.abs(real - smooth) < 0.3) smooth = real;
    const s = smooth;
    const k = m.k;

    const move = inOut(range(s, 0, 330 * k));
    const flip = inOut(range(s, 440 * k, 1060 * k));
    const flipBack = inOut(range(s, m.pinEnd - 500 * k, m.pinEnd - 100 * k));
    const grow = range(s, 1100 * k, Math.max(1200 * k, m.pinEnd - 600 * k));

    const cx = lerp(m.sx, m.tx, move);
    let cy = lerp(m.sy, m.ty, move);
    const tilt = 8 * move * (1 - flip);
    const rotY = 180 * flip - 180 * flipBack;
    const scale = 1 + 0.18 * Math.pow(Math.sin(Math.PI * Math.pow(grow, 1.4)), 2);

    // Release: past the pin end the card scrolls up with the content
    if (real > m.pinEnd) cy -= real - m.pinEnd;

    card.style.transform =
      `translate3d(${cx - m.w / 2}px, ${cy - m.h / 2}px, 0) ` +
      `perspective(1400px) rotateZ(${tilt}deg) rotateY(${rotY}deg) scale(${scale})`;

    if (smooth !== real) raf = requestAnimationFrame(render);
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };

  // One photo per scroll stage:
  //   hero (front)            → bamberg-night
  //   after the flip (back)   → bamberg-river
  //   halfway through skills  → oktoberfest-2 on the back
  //   flip back (front)       → bamberg-night again
  // On narrow screens the card does not travel, so the front photo simply
  // steps through all of them as the hero scrolls away.
  const frontSlides = [...document.querySelectorAll('.front-slides img')];
  const backSlides = [...document.querySelectorAll('.back-slides img')];
  const shown = { front: 0, back: 0 };
  const show = (list, key, i) => {
    if (shown[key] === i) return;
    shown[key] = i;
    list.forEach((img, j) => img.classList.toggle('on', j === i));
  };
  const updatePhotos = () => {
    const s = window.scrollY;
    if (m) {
      const half = (1060 * m.k + (m.pinEnd - 500 * m.k)) / 2;
      const late = s > half;
      show(backSlides, 'back', late ? 1 : 0);
      show(frontSlides, 'front', 0);
    } else {
      const step = window.innerHeight * 0.15;
      show(frontSlides, 'front', Math.min(frontSlides.length - 1, Math.floor(s / step)));
    }
  };
  window.addEventListener('scroll', updatePhotos, { passive: true });

  const remeasure = () => {
    // measure with the card's own transform cleared so the slot rect is clean
    card.style.transform = '';
    measure();
    smooth = window.scrollY;
    render();
    updatePhotos();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', remeasure);
  desktop.addEventListener('change', remeasure);
  window.addEventListener('load', remeasure);
  remeasure();
})();
