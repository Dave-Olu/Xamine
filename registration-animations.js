/* ═══════════════════════════════════════════════════════
   registration-animations.js — Bethel Learning Institute
   Scroll reveals · Orbs · Ripple · Progress · Confirmation
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. Fixed progress bar (tracks form completion) ─────────────────── */
  function initProgressBar() {
    const bar = document.createElement('div');
    bar.className = 'reg-progress';
    document.body.prepend(bar);

    const requiredFields = document.querySelectorAll(
      '#regForm input[required], #regForm select[required]'
    );
    const allFields = document.querySelectorAll(
      '#regForm input:not([type=radio]), #regForm select'
    );

    function updateBar() {
      let filled = 0;
      requiredFields.forEach(function (f) {
        if (f.value.trim()) filled++;
      });
      const pct = requiredFields.length
        ? Math.round((filled / requiredFields.length) * 100)
        : 0;
      bar.style.width = pct + '%';
    }

    allFields.forEach(function (f) {
      f.addEventListener('input', updateBar);
      f.addEventListener('change', updateBar);
    });

    // also track radio pills
    document.querySelectorAll('#regForm input[type=radio]').forEach(function (r) {
      r.addEventListener('change', updateBar);
    });
  }

  /* ── 2. Inject hero background orbs ─────────────────────────────────── */
  function injectOrbs() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    [1, 2].forEach(function (n) {
      const orb = document.createElement('div');
      orb.className = 'reg-orb reg-orb--' + n;
      hero.prepend(orb);
    });
  }

  /* ── 3. Scroll-reveal with IntersectionObserver ─────────────────────── */
  function initScrollReveal() {
    // Hero content — staggered entrance on load
    const heroContent = document.querySelectorAll('.hero-grid > div > *');
    heroContent.forEach(function (el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition =
        'opacity 0.6s cubic-bezier(0.16,1,0.3,1) ' + (0.1 + i * 0.13) + 's,' +
        'transform 0.6s cubic-bezier(0.16,1,0.3,1) ' + (0.1 + i * 0.13) + 's';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
      });
    });

    // Section heads
    document.querySelectorAll('.section-head, .pass-head').forEach(function (el) {
      el.classList.add('reg-reveal');
    });

    // Program cards as a group
    const progGrid = document.querySelector('.programs-grid');
    if (progGrid) progGrid.classList.add('reg-reveal-group');

    // Pass card
    const pass = document.querySelector('.pass');
    if (pass) pass.classList.add('reg-reveal');

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    document.querySelectorAll('.reg-reveal, .reg-reveal-group').forEach(function (el) {
      io.observe(el);
    });
  }

  /* ── 4. Submit button ripple ────────────────────────────────────────── */
  function initRipple() {
    const btn = document.querySelector('.btn-submit');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.left = (x - 5) + 'px';
      ripple.style.top  = (y - 5) + 'px';
      btn.appendChild(ripple);

      ripple.addEventListener('animationend', function () {
        ripple.remove();
      });
    });
  }

  /* ── 5. Form field entrance stagger ────────────────────────────────── */
  function initFieldEntrance() {
    const fields = document.querySelectorAll('.field');
    fields.forEach(function (field, i) {
      field.style.opacity = '0';
      field.style.transform = 'translateY(16px)';
      field.style.transition =
        'opacity 0.45s ease ' + (i * 0.04) + 's,' +
        'transform 0.45s ease ' + (i * 0.04) + 's';
    });

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'none';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    fields.forEach(function (f) { io.observe(f); });
  }

  /* ── 6. Confirmation panel celebration ──────────────────────────────── */
  function initConfirmAnimation() {
    // Patch registration.js's show behaviour — watch for the .show class
    const confirmPanel = document.getElementById('confirmPanel');
    if (!confirmPanel) return;

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === 'attributes' && confirmPanel.classList.contains('show')) {
          launchConfetti();
          observer.disconnect();
        }
      });
    });
    observer.observe(confirmPanel, { attributes: true, attributeFilter: ['class'] });
  }

  function launchConfetti() {
    const colors = ['#cf9f2e', '#dcb653', '#432578', '#6B2FA0', '#f2debf', '#ffffff'];
    const count  = 72;
    const container = document.getElementById('confirmPanel');
    if (!container) return;

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      const size = 6 + Math.random() * 7;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = Math.random() * 360;
      const dist  = 60 + Math.random() * 120;
      const dur   = 0.6 + Math.random() * 0.7;
      const delay = Math.random() * 0.3;

      dot.style.cssText =
        'position:absolute;top:50%;left:50%;' +
        'width:' + size + 'px;height:' + size + 'px;' +
        'background:' + color + ';border-radius:50%;' +
        'pointer-events:none;opacity:1;' +
        'transform:translate(-50%,-50%);' +
        'transition:none;';

      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.appendChild(dot);

      const rad = (angle * Math.PI) / 180;
      const tx  = Math.cos(rad) * dist;
      const ty  = Math.sin(rad) * dist;

      requestAnimationFrame(function () {
        dot.style.transition =
          'transform ' + dur + 's cubic-bezier(0,0.9,0.57,1) ' + delay + 's,' +
          'opacity '   + dur * 0.6 + 's ease ' + (delay + dur * 0.4) + 's';
        requestAnimationFrame(function () {
          dot.style.transform =
            'translate(calc(-50% + ' + tx + 'px), calc(-50% + ' + ty + 'px))';
          dot.style.opacity = '0';
        });
      });

      setTimeout(function () { dot.remove(); }, (dur + delay + 0.1) * 1000);
    }
  }

  /* ── 7. Mini-pass tilt on mouse ─────────────────────────────────────── */
  function initPassTilt() {
    const pass = document.querySelector('.mini-pass');
    if (!pass) return;

    pass.addEventListener('mousemove', function (e) {
      const rect = pass.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      pass.style.transform =
        'rotate(3deg) perspective(500px) rotateX(' + (-y * 12) + 'deg) rotateY(' + (x * 12) + 'deg) translateY(-6px)';
    });
    pass.addEventListener('mouseleave', function () {
      pass.style.transform = '';
    });
  }

  /* ── 8. Navbar hide/show on scroll ─────────────────────────────────── */
  function initNavScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    let last = 0;
    header.style.transition = 'transform 0.35s cubic-bezier(0.16,1,0.3,1)';
    window.addEventListener('scroll', function () {
      const y = window.scrollY;
      header.style.transform = (y > last && y > 80) ? 'translateY(-100%)' : 'translateY(0)';
      last = y;
    }, { passive: true });
  }

  /* ── 9. Input label float effect ────────────────────────────────────── */
  function initLabelFloat() {
    document.querySelectorAll('.field input, .field select').forEach(function (input) {
      const label = input.closest('.field')?.querySelector('label');
      if (!label) return;

      function update() {
        const active = document.activeElement === input || input.value;
        label.style.color = active ? 'var(--gold-500)' : '';
      }
      input.addEventListener('focus', update);
      input.addEventListener('blur', update);
      input.addEventListener('input', update);
    });
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  function initRegHamburger() {
    const btn     = document.getElementById('reg-hamburger');
    const nav     = document.getElementById('reg-nav-links');
    const overlay = document.getElementById('reg-nav-overlay');
    if (!btn || !nav) return;

    function openMenu() {
      btn.classList.add('open');
      nav.classList.add('open');
      if (overlay) overlay.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      btn.classList.remove('open');
      nav.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function () {
      btn.classList.contains('open') ? closeMenu() : openMenu();
    });
    if (overlay) overlay.addEventListener('click', closeMenu);
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 860) closeMenu(); }, { passive: true });
  }

  /* ── 10. Back-to-top visibility + year ─────────────────────────────── */
  function initUtilities() {
    // Back-to-top
    const topBtn = document.getElementById('fab-top');
    if (topBtn) {
      window.addEventListener('scroll', function () {
        topBtn.classList.toggle('visible', window.scrollY > 400);
      }, { passive: true });
    }
    // Copyright year (registration page footer has none, but guard anyway)
    const yr = document.getElementById('year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  function init() {
    injectOrbs();
    initProgressBar();
    initScrollReveal();
    initRipple();
    initFieldEntrance();
    initConfirmAnimation();
    initPassTilt();
    initNavScroll();
    initLabelFloat();
    initRegHamburger();
    initUtilities();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
