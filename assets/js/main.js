/* Great Learning — Enterprise page
   No dependencies. Every enhancement degrades to a working page without it. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     Mobile drawer
     ---------------------------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var drawer = document.getElementById('mobileDrawer');
  var backdrop = document.getElementById('drawerBackdrop');
  var drawerClose = document.getElementById('drawerClose');
  var lastFocused = null;

  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function openDrawer() {
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.hidden = false;
    backdrop.hidden = false;
    // Force a reflow so the transform transition runs from its start value.
    void drawer.offsetWidth;
    drawer.setAttribute('data-open', 'true');
    backdrop.setAttribute('data-open', 'true');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
    var f = focusables(drawer);
    if (f.length) f[0].focus();
  }

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.removeAttribute('data-open');
    backdrop.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
    var delay = reduceMotion ? 0 : 320;
    window.setTimeout(function () {
      drawer.hidden = true;
      backdrop.hidden = true;
    }, delay);
    // Return focus to the trigger. Relying on lastFocused alone is unreliable:
    // if the drawer was opened while focus sat elsewhere, focus would be
    // stranded. Only reclaim it when focus is inside the drawer or unset, so a
    // drawer link that navigates away is never interrupted.
    var active = document.activeElement;
    if (!active || active === document.body || drawer.contains(active)) {
      if (lastFocused && lastFocused !== document.body && document.contains(lastFocused)) lastFocused.focus();
      else toggle.focus();
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') closeDrawer();
      else openDrawer();
    });
  }
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Close when a drawer link is followed
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeDrawer();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && !drawer.hidden) {
      closeDrawer();
      return;
    }
    // Focus trap
    if (e.key === 'Tab' && drawer && !drawer.hidden) {
      var f = focusables(drawer);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  // Reset the drawer if the viewport grows past the mobile breakpoint
  window.matchMedia('(min-width: 1120px)').addEventListener('change', function (m) {
    if (m.matches) closeDrawer();
  });

  /* ----------------------------------------------------------------------
     Role CTAs preselect the matching Area Of Interest, so a forwarded
     reader lands on a form already shaped for their seat.
     ---------------------------------------------------------------------- */
  var interest = document.getElementById('interest');
  document.querySelectorAll('[data-interest]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (!interest) return;
      var want = link.getAttribute('data-interest');
      Array.prototype.forEach.call(interest.options, function (opt) {
        if (opt.text === want) interest.value = opt.value || opt.text;
      });
    });
  });

  /* ----------------------------------------------------------------------
     Form validation — front end only, no network call
     ---------------------------------------------------------------------- */
  var form = document.getElementById('consultForm');
  var success = document.getElementById('formSuccess');
  var status = document.getElementById('formStatus');
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var rules = {
    fullName: function (v) { return v.trim() ? '' : 'Enter your full name'; },
    workEmail: function (v) {
      if (!v.trim()) return 'Enter your work email';
      return EMAIL.test(v.trim()) ? '' : 'Enter a valid email address';
    },
    company: function (v) { return v.trim() ? '' : 'Enter your company name'; }
  };

  function showError(field, msg) {
    var box = document.getElementById(field.id + 'Error');
    if (box) box.textContent = msg;
    if (msg) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function validateField(field) {
    var rule = rules[field.id];
    if (!rule) return true;
    var msg = rule(field.value);
    showError(field, msg);
    return !msg;
  }

  if (form) {
    Object.keys(rules).forEach(function (id) {
      var field = document.getElementById(id);
      if (!field) return;
      // Validate on blur, but only once the field has been submitted or touched,
      // never on first keystroke.
      field.addEventListener('blur', function () {
        if (field.dataset.touched === 'true') validateField(field);
      });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      Object.keys(rules).forEach(function (id) {
        var field = document.getElementById(id);
        if (!field) return;
        field.dataset.touched = 'true';
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        if (status) status.textContent = 'The form has errors. Please review the highlighted fields.';
        firstInvalid.focus();
        return;
      }

      if (status) status.textContent = 'Your request has been received.';
      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.setAttribute('tabindex', '-1');
        success.focus();
      }
    });
  }

  /* ----------------------------------------------------------------------
     Hero layer switcher. Standard tabs pattern: click to select, arrow keys
     to move, Home and End to jump. The active layer also drives the pattern
     behind the panel via data-active on the container.
     ---------------------------------------------------------------------- */
  var switcher = document.getElementById('layerSwitch');
  if (switcher) {
    var tabs = Array.prototype.slice.call(switcher.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(switcher.querySelectorAll('[role="tabpanel"]'));

    /* The progress ring traces the blob outline, but not the bottom edge, since
       the goo tail interrupts it there. The path opens at the bottom left curve,
       runs up and over the top, and closes at the bottom right curve.
       Geometry is measured per tab because tabs size to their own label. */
    function drawRing(tab) {
      var svg = tab.querySelector('.tab-progress');
      var path = svg && svg.querySelector('path');
      if (!path) return;
      var box = tab.getBoundingClientRect();
      var w = box.width, h = box.height;
      if (!w || !h) return;

      var m = 1;                                   // half the stroke, kept inside
      var left = m, top = m, right = w - m, bottom = h - m;
      var r = Math.min(17, (right - left) / 2, (bottom - top) / 2);

      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      path.setAttribute('d', [
        'M', (left + r), bottom,
        'A', r, r, 0, 0, 1, left, (bottom - r),
        'L', left, (top + r),
        'A', r, r, 0, 0, 1, (left + r), top,
        'L', (right - r), top,
        'A', r, r, 0, 0, 1, right, (top + r),
        'L', right, (bottom - r),
        'A', r, r, 0, 0, 1, (right - r), bottom
      ].join(' '));
    }

    function drawAllRings() { tabs.forEach(drawRing); }
    drawAllRings();

    // Tabs change width when the labels drop at the mobile breakpoint, and when
    // the webfont lands, so the geometry is recomputed rather than measured once.
    if ('ResizeObserver' in window) {
      var ringRO = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) { drawRing(entry.target); });
      });
      tabs.forEach(function (tab) { ringRO.observe(tab); });
    } else {
      window.addEventListener('resize', drawAllRings);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(drawAllRings);
    }

    function selectLayer(index, moveFocus) {
      index = (index + tabs.length) % tabs.length;
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel, i) {
        var on = i === index;
        // inert removes the hidden panels from focus order and the accessibility
        // tree while leaving them in flow, so the card keeps the height of the
        // tallest panel and the crossfade has something to fade between.
        if (on) panel.removeAttribute('inert');
        else panel.setAttribute('inert', '');
      });
      switcher.setAttribute('data-active', String(index + 1));
      if (moveFocus) tabs[index].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        selectLayer(i, false);
        runAuto();
      });
    });

    /* Auto advance, continuous by request. It does not pause on hover, on
       focus, while the document is hidden, or while the switcher is off
       screen, and picking a layer does not stop it. Picking a layer does
       restart the interval, so the ring measures the real time left before the
       next switch rather than the remainder of the previous one.

       This is a WCAG 2.2.2 (Pause, Stop, Hide) failure: content that moves
       automatically for longer than five seconds needs a way to stop it.
       Reduced motion is still honoured. */
    var AUTO_MS = 6000;
    var autoTimer = null;

    // One source of truth for the duration: the ring animation reads this.
    switcher.style.setProperty('--auto-ms', AUTO_MS + 'ms');
    switcher.setAttribute('data-auto', 'off');

    // Restarting the interval has to restart the ring too, or the ring would
    // finish out of step with the switch it is timing.
    function restartRing() {
      var ring = switcher.querySelector('.switch-tab[aria-selected="true"] .tab-progress path');
      if (!ring) return;
      ring.style.animation = 'none';
      void ring.getBoundingClientRect().width;
      ring.style.animation = '';
    }

    function currentIndex() {
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].getAttribute('aria-selected') === 'true') return i;
      }
      return 0;
    }

    function runAuto() {
      if (reduceMotion) return;
      if (autoTimer) window.clearInterval(autoTimer);
      switcher.setAttribute('data-auto', 'running');
      restartRing();
      autoTimer = window.setInterval(function () {
        selectLayer(currentIndex() + 1, false);
      }, AUTO_MS);
    }

    runAuto();

    switcher.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
      var current = tabs.indexOf(document.activeElement);
      if (current === -1) return;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = current + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = current - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      selectLayer(next, true);
      runAuto();
    });
  }

  /* ----------------------------------------------------------------------
     Commitments feature accordion. One item open at a time, paired with a
     panel that illustrates it.

     The rotation runs continuously by request: it does not pause on hover, on
     focus, while the document is hidden, or while the section is off screen,
     and picking an item does not stop it. Picking an item does restart the
     interval, so the rail under the heading always measures the real time left
     before the next switch rather than the remainder of the previous one.

     Note that this is a WCAG 2.2.2 (Pause, Stop, Hide) failure: content that
     moves automatically for longer than five seconds needs a way to stop it.
     Reduced motion is still honoured, so the rotation never starts for readers
     who have asked the OS for less movement.
     ---------------------------------------------------------------------- */
  var features = document.getElementById('features');
  if (features) {
    var featItems = Array.prototype.slice.call(features.querySelectorAll('.feat-item'));
    var FEAT_MS = 7000;
    var featTimer = null;

    // One source of truth for the duration: the rail animation reads this.
    features.style.setProperty('--auto-ms', FEAT_MS + 'ms');
    features.setAttribute('data-auto', 'off');

    function selectFeature(index) {
      index = (index + featItems.length) % featItems.length;
      featItems.forEach(function (item, i) {
        var on = i === index;
        item.setAttribute('data-state', on ? 'active' : 'resting');
        var trigger = item.querySelector('.feat-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      features.setAttribute('data-active', String(index + 1));
    }

    function featIndex() {
      for (var i = 0; i < featItems.length; i++) {
        if (featItems[i].getAttribute('data-state') === 'active') return i;
      }
      return 0;
    }

    // Restarting the interval has to restart the rail too, or the bar would
    // finish out of step with the switch it is timing.
    function restartRail() {
      var fill = features.querySelector('.feat-item[data-state="active"] .feat-fill');
      if (!fill) return;
      fill.style.animation = 'none';
      void fill.getBoundingClientRect().width;
      fill.style.animation = '';
    }

    function runFeatAuto() {
      if (reduceMotion) return;
      if (featTimer) window.clearInterval(featTimer);
      features.setAttribute('data-auto', 'running');
      restartRail();
      featTimer = window.setInterval(function () {
        selectFeature(featIndex() + 1);
      }, FEAT_MS);
    }

    featItems.forEach(function (item, i) {
      var trigger = item.querySelector('.feat-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', function () {
        selectFeature(i);
        runFeatAuto();
      });
    });

    /* The list is pinned to the bottom of its column on desktop, so a taller
       item opening would shove the whole list upward. Measure every state with
       transitions suppressed, then hold the tallest. */
    var featMQ = window.matchMedia('(min-width: 1000px)');
    var featList = features.querySelector('.feat-list');

    function lockFeatHeight() {
      if (!featList) return;
      featList.style.minHeight = '';
      if (!featMQ.matches) return;
      var open = featIndex();
      features.setAttribute('data-measuring', 'true');
      var tallest = 0;
      featItems.forEach(function (item, i) {
        selectFeature(i);
        tallest = Math.max(tallest, featList.getBoundingClientRect().height);
      });
      selectFeature(open);
      features.removeAttribute('data-measuring');
      if (tallest) featList.style.minHeight = Math.ceil(tallest) + 'px';
    }

    lockFeatHeight();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(lockFeatHeight);
    }
    var featResizeT = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(featResizeT);
      featResizeT = window.setTimeout(lockFeatHeight, 150);
    });

    runFeatAuto();
  }

  /* ----------------------------------------------------------------------
     Three layers card deck. One card open at a time. The trigger is a real
     button with aria-expanded, and the body is a region, so the whole thing
     works without arrow-key handling and stays valid at every breakpoint.
     ---------------------------------------------------------------------- */
  var deck = document.querySelector('.deck');
  if (deck) {
    var deckCards = Array.prototype.slice.call(deck.querySelectorAll('.deck-card'));

    function openCard(card) {
      deckCards.forEach(function (c) {
        var on = c === card;
        c.setAttribute('data-state', on ? 'active' : 'resting');
        var trigger = c.querySelector('.deck-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    }

    deckCards.forEach(function (card) {
      var trigger = card.querySelector('.deck-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', function () {
        // Re-clicking the open card leaves it open; there is always one active.
        openCard(card);
      });
    });

    /* The layers carry different numbers of covered topics, so one open card is
       taller than the others and the row jumped on every click. Measure each
       state once and hold the row at the tallest, rather than hard coding a
       height that would rot the moment the copy changes. */
    var deckMQ = window.matchMedia('(min-width: 960px)');

    function lockDeckHeight() {
      deck.style.minHeight = '';
      if (!deckMQ.matches) return;

      var openCardEl = deckCards.filter(function (c) {
        return c.getAttribute('data-state') === 'active';
      })[0] || deckCards[0];

      deck.setAttribute('data-measuring', 'true');
      var tallest = 0;
      deckCards.forEach(function (c) {
        openCard(c);
        tallest = Math.max(tallest, deck.getBoundingClientRect().height);
      });
      openCard(openCardEl);
      deck.removeAttribute('data-measuring');

      if (tallest) deck.style.minHeight = Math.ceil(tallest) + 'px';
    }

    lockDeckHeight();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(lockDeckHeight);
    }
    var deckResizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(deckResizeTimer);
      deckResizeTimer = window.setTimeout(lockDeckHeight, 180);
    });
  }

  /* ----------------------------------------------------------------------
     Founder video lightbox
     ---------------------------------------------------------------------- */
  var trigger = document.getElementById('videoTrigger');
  var lightbox = document.getElementById('videoLightbox');
  var lightboxInner = document.getElementById('lightboxInner');
  var lightboxClose = document.getElementById('lightboxClose');

  if (trigger && lightbox && typeof lightbox.showModal === 'function') {
    trigger.addEventListener('click', function () {
      var src = trigger.getAttribute('data-video');
      if (src) {
        var frame = document.createElement('iframe');
        frame.setAttribute('src', src);
        frame.setAttribute('title', 'Founder conversation');
        frame.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; picture-in-picture');
        frame.setAttribute('allowfullscreen', '');
        lightboxInner.appendChild(frame);
      } else {
        lightboxInner.innerHTML =
          '<p style="display:grid;place-items:center;height:100%;margin:0;padding:24px;' +
          'color:rgba(255,255,255,.82);font:500 15px Poppins,sans-serif;text-align:center">' +
          'Video not yet supplied. Set the data-video attribute on the poster to an embed URL.</p>';
      }
      lightbox.showModal();
    });

    function teardown() { lightboxInner.innerHTML = ''; }

    // The dialog 'close' event is not dispatched reliably in every engine, and
    // a missed teardown leaves the iframe playing audio behind a closed dialog.
    // Watching the open attribute catches every close path, including the
    // browser's own Escape handling.
    new MutationObserver(function () {
      if (!lightbox.open) teardown();
    }).observe(lightbox, { attributes: true, attributeFilter: ['open'] });

    lightbox.addEventListener('close', teardown);
    lightbox.addEventListener('cancel', teardown);
    if (lightboxClose) lightboxClose.addEventListener('click', function () { lightbox.close(); });
    // Click outside the frame closes it
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) lightbox.close();
    });
  }

  /* ----------------------------------------------------------------------
     Simple tablists. Two on this page: the partner quotes and the role panels.
     Both are the same shape, one panel visible at a time with the inactive ones
     left in flow under inert, so the block keeps the height of the tallest and
     nothing reflows on a switch. The hero switcher is not one of these: it
     carries auto advance and a progress ring and stays on its own.
     ---------------------------------------------------------------------- */
  function initTabList(root, autoMs) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || tabs.length !== panels.length) return;
    var timer = null;

    function select(index, moveFocus) {
      index = (index + tabs.length) % tabs.length;
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel, i) {
        if (i === index) panel.removeAttribute('inert');
        else panel.setAttribute('inert', '');
      });
      if (moveFocus) tabs[index].focus();
    }

    /* Continuous rotation when a duration is passed. Same rules as the hero:
       it never pauses, and picking a partner restarts the interval so the
       indicator measures the real time left rather than the remainder of the
       previous cycle. The bar reads --auto-ms, so there is one duration. */
    function restartBar() {
      var bar = root.querySelector('.auto-bar-fill');
      if (!bar) return;
      bar.style.animation = 'none';
      void bar.getBoundingClientRect().width;
      bar.style.animation = '';
    }

    function run() {
      if (!autoMs || reduceMotion) return;
      if (timer) window.clearInterval(timer);
      root.setAttribute('data-auto', 'running');
      restartBar();
      timer = window.setInterval(function () {
        var at = 0;
        for (var i = 0; i < tabs.length; i++) {
          if (tabs[i].getAttribute('aria-selected') === 'true') { at = i; break; }
        }
        select(at + 1, false);
      }, autoMs);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i, false); run(); });
    });

    var list = root.querySelector('[role="tablist"]');
    if (list) {
      list.addEventListener('keydown', function (e) {
        var current = tabs.indexOf(document.activeElement);
        if (current === -1) return;
        var next = null;
        // Both axes are accepted whatever the orientation, because a reader who
        // reaches for the wrong arrow should not hit a dead key.
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = current + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = current - 1;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next, true);
        run();
      });
    }

    // Normalise whatever the markup shipped with, so roving tabindex and inert
    // are correct even if the initial state was hand edited.
    var initial = 0;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('aria-selected') === 'true') { initial = i; break; }
    }
    select(initial, false);
    if (autoMs) {
      root.style.setProperty('--auto-ms', autoMs + 'ms');
      root.setAttribute('data-auto', 'off');
      run();
    }
  }

  var proofPicker = document.getElementById('proofPicker');
  if (proofPicker) initTabList(proofPicker, 7000);

  /* ----------------------------------------------------------------------
     Role accordion. One seat open at a time. Real buttons with aria-expanded
     over regions, so it needs no arrow-key handling and stays valid at every
     breakpoint. Clicking the open seat closes it, which is what the plus and
     minus sign promises.
     ---------------------------------------------------------------------- */
  var seatAccordion = document.getElementById('seatAccordion');
  if (seatAccordion) {
    var seatRows = Array.prototype.slice.call(seatAccordion.querySelectorAll('.seat'));

    function setSeat(row, open) {
      row.setAttribute('data-state', open ? 'active' : 'resting');
      var trigger = row.querySelector('.seat-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    seatRows.forEach(function (row) {
      var trigger = row.querySelector('.seat-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', function () {
        var wasOpen = row.getAttribute('data-state') === 'active';
        seatRows.forEach(function (other) { setSeat(other, false); });
        if (!wasOpen) setSeat(row, true);
      });
    });
  }

  /* ----------------------------------------------------------------------
     Scroll reveal. Enhances an already-visible default: if anything fails,
     a safety pass makes every element visible rather than shipping blanks.
     ---------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal, .reveal-stagger');

  function revealAll() {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    revealEls.forEach(function (el) { io.observe(el); });

    // Safety net: never leave content hidden.
    window.setTimeout(revealAll, 2500);
  }
})();
