/* ═══════════════════════════════════════════════════════
   home-animations.js — Bethel Learning Institute
   Scroll reveals · Typewriter · Stat counters · Orbs · Parallax
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. Inject hero background orbs ─────────────────────────────────── */
  function injectOrbs() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    [1, 2, 3].forEach(function (n) {
      const orb = document.createElement('div');
      orb.className = 'hero-orb hero-orb--' + n;
      hero.prepend(orb);
    });
  }

  /* ── 2. Scroll-reveal with IntersectionObserver ─────────────────────── */
  function initScrollReveal() {
    // Mark elements that should animate on scroll
    const targets = [
      { sel: '.section-head',   cls: 'reveal' },
      { sel: '.program-card',   cls: 'reveal-group', parent: '.program-grid' },
      { sel: '.about-visual',   cls: 'reveal reveal--left' },
      { sel: '.about > div:last-child', cls: 'reveal' },
      { sel: '.about-point',    cls: 'reveal-group', parent: '.about-points' },
      { sel: '.cta .wrap',      cls: 'reveal' },
      { sel: '.footer-grid',    cls: 'reveal' },
    ];

    targets.forEach(function (t) {
      if (t.parent) {
        // wrap the parent as a reveal-group
        const parents = document.querySelectorAll(t.parent);
        parents.forEach(function (p) { p.classList.add('reveal-group'); });
      } else {
        document.querySelectorAll(t.sel).forEach(function (el) {
          t.cls.split(' ').forEach(function (c) { el.classList.add(c); });
        });
      }
    });

    // Also mark hero content for a one-shot entrance
    const heroChildren = document.querySelectorAll('.hero > div > *');
    heroChildren.forEach(function (el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition =
        'opacity 0.6s cubic-bezier(0.16,1,0.3,1) ' + (i * 0.12) + 's,' +
        'transform 0.6s cubic-bezier(0.16,1,0.3,1) ' + (i * 0.12) + 's';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
      });
    });

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal, .reveal-group').forEach(function (el) {
      io.observe(el);
    });
  }

  /* ── 3. Typewriter effect on hero h1 ────────────────────────────────── */
  function initTypewriter() {
    const h1 = document.querySelector('.hero h1');
    if (!h1) return;

    // Preserve the <em> tag — split into text + em
    const em = h1.querySelector('em');
    const plainText = h1.childNodes[0] ? h1.childNodes[0].textContent : '';
    const emText = em ? em.textContent : '';

    h1.innerHTML = '';
    h1.style.opacity = '1';
    h1.style.animation = 'none';
    h1.style.minHeight = '1.1em';

    let i = 0;
    const cursor = document.createElement('span');
    cursor.textContent = '|';
    cursor.style.cssText =
      'color:var(--teal);animation:blink 0.75s step-end infinite;font-style:normal;';
    h1.appendChild(cursor);

    // inject blink keyframe once
    if (!document.getElementById('blink-style')) {
      const s = document.createElement('style');
      s.id = 'blink-style';
      s.textContent = '@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}';
      document.head.appendChild(s);
    }

    const full = plainText.trimEnd();
    function typeChar() {
      if (i <= full.length) {
        h1.childNodes[0]
          ? (h1.childNodes[0].textContent = full.slice(0, i))
          : h1.insertBefore(document.createTextNode(full.slice(0, i)), cursor);
        i++;
        setTimeout(typeChar, i === 1 ? 400 : 42 + Math.random() * 22);
      } else {
        // done typing plain text — append em
        if (em && emText) {
          const newEm = document.createElement('em');
          newEm.style.cssText = 'opacity:0;transition:opacity 0.5s ease;';
          newEm.textContent = emText;
          h1.insertBefore(document.createTextNode('\n'), cursor);
          h1.insertBefore(newEm, cursor);
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { newEm.style.opacity = '1'; });
          });
        }
        // remove cursor after a beat
        setTimeout(function () {
          cursor.style.transition = 'opacity 0.4s';
          cursor.style.opacity = '0';
          setTimeout(function () { cursor.remove(); }, 400);
        }, 1800);
      }
    }

    // start after hero fade-in
    setTimeout(typeChar, 550);
  }

  /* ── 4. Animated stat counters ──────────────────────────────────────── */
  function initCounters() {
    const stats = document.querySelectorAll('.hero-stats div strong');
    if (!stats.length) return;

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const raw = el.textContent.trim();
        const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
        if (isNaN(num)) {
          // non-numeric (e.g. "Kids-Pros") — just pop it
          el.classList.add('popped');
          io.unobserve(el);
          return;
        }
        const suffix = raw.replace(/[0-9.]/g, '');
        const duration = 900;
        const start = performance.now();
        function tick(now) {
          const t = Math.min((now - start) / duration, 1);
          // ease-out cubic
          const ease = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(ease * num) + suffix;
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            el.textContent = raw;
            el.classList.add('popped');
          }
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });

    stats.forEach(function (el) { io.observe(el); });
  }

  /* ── 5. Parallax orb on mouse move ─────────────────────────────────── */
  function initParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    hero.addEventListener('mousemove', function (e) {
      const rect = hero.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 to 0.5
      const cy = (e.clientY - rect.top)  / rect.height - 0.5;

      const orbs = hero.querySelectorAll('.hero-orb');
      orbs.forEach(function (orb, i) {
        const depth = (i + 1) * 14;
        orb.style.transform =
          'translate(' + (cx * depth) + 'px,' + (cy * depth) + 'px)';
      });

      const panel = hero.querySelector('.panel');
      if (panel) {
        panel.style.transform =
          'perspective(800px) rotateY(' + (cx * 4) + 'deg) rotateX(' + (-cy * 3) + 'deg)';
      }
    });

    hero.addEventListener('mouseleave', function () {
      hero.querySelectorAll('.hero-orb').forEach(function (orb) {
        orb.style.transform = '';
      });
      const panel = hero.querySelector('.panel');
      if (panel) panel.style.transform = '';
    });
  }

  /* ── 6. About-visual scroll parallax ───────────────────────────────── */
  function initAboutParallax() {
    const visual = document.querySelector('.about-visual');
    if (!visual) return;

    window.addEventListener('scroll', function () {
      const rect = visual.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      visual.style.transform = 'translateY(' + (center * 0.06) + 'px)';
    }, { passive: true });
  }

  /* ── 7. Navbar hide/show on scroll ─────────────────────────────────── */
  function initNavScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    let last = 0;
    window.addEventListener('scroll', function () {
      const y = window.scrollY;
      if (y > last && y > 80) {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = 'translateY(0)';
      }
      last = y;
    }, { passive: true });
    header.style.transition = 'transform 0.35s cubic-bezier(0.16,1,0.3,1), background 0.3s ease';
  }

  /* ── 8. Program card tilt on mouse ─────────────────────────────────── */
  function initCardTilt() {
    document.querySelectorAll('.program-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform =
          'translateY(-4px) perspective(600px) rotateX(' + (-y * 7) + 'deg) rotateY(' + (x * 7) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ── 9. Active nav link highlight on scroll ─────────────────────────── */
  function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const links    = document.querySelectorAll('.nav-links a');
    if (!sections.length || !links.length) return;

    window.addEventListener('scroll', function () {
      let current = '';
      sections.forEach(function (sec) {
        if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
      });
      links.forEach(function (a) {
        a.style.color = '';
        a.style.fontWeight = '';
        if (a.getAttribute('href') === '#' + current) {
          a.style.color = 'var(--teal-deep)';
          a.style.fontWeight = '700';
        }
      });
    }, { passive: true });
  }

  /* ── 10. Hamburger menu ─────────────────────────────────────────────── */
  function initHamburger() {
    const btn     = document.getElementById('hamburger');
    const nav     = document.getElementById('nav-links');
    if (!btn || !nav) return;

    let overlay = document.getElementById('nav-overlay-el');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'nav-overlay';
      overlay.id = 'nav-overlay-el';
      document.body.appendChild(overlay);
    }

    function openMenu() {
      btn.classList.add('open');
      nav.classList.add('open');
      overlay.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      btn.classList.remove('open');
      nav.classList.remove('open');
      overlay.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function () {
      btn.classList.contains('open') ? closeMenu() : openMenu();
    });
    overlay.addEventListener('click', closeMenu);
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 880) closeMenu(); }, { passive: true });
  }

  /* ── 11. Copyright year injection ───────────────────────────────────── */
  function initYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ── 12. Back-to-top button visibility ──────────────────────────────── */
  function initBackToTop() {
    const btn = document.getElementById('fab-top');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  function init() {
    injectOrbs();
    initScrollReveal();
    initTypewriter();
    initCounters();
    initParallax();
    initAboutParallax();
    initNavScroll();
    initCardTilt();
    initActiveNav();
    initHamburger();
    initYear();
    initBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
