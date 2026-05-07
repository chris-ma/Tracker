/**
 * Tracker Analytics - Embeddable Script
 * Usage:
 *   <script src="https://yourapp.vercel.app/tracker.js"
 *           data-api-key="SITE_API_KEY"
 *           data-page-key="PAGE_KEY"
 *           data-eye-tracking="true"
 *           async></script>
 */
(function () {
  'use strict';

  // document.currentScript is null for async scripts (per spec), so fall back
  // to a targeted query. Never use last-script-in-DOM — other scripts (e.g.
  // Vercel's injected feedback widget) may appear after ours in the DOM.
  var script = document.currentScript ||
    document.querySelector('script[data-api-key]') ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var API_KEY = script.getAttribute('data-api-key');
  var PAGE_KEY = script.getAttribute('data-page-key');
  var EYE_TRACKING = script.getAttribute('data-eye-tracking') === 'true';
  var BASE_URL = new URL(script.src).origin;

  if (!API_KEY || !PAGE_KEY) {
    console.warn('[Tracker] Missing data-api-key or data-page-key');
    return;
  }

  var sessionId = null;
  var eventQueue = [];
  var lastMouseTime = 0;
  var THROTTLE_MS = 50;
  var sessionStart = Date.now();

  // ── Load html2canvas immediately (before DOMContentLoaded) ────────────────
  var h2cLoaded = false;
  var screenshotSent = false;
  (function () {
    var src = BASE_URL + '/html2canvas.min.js';
    console.log('[Tracker] Loading html2canvas from', src);
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function () {
      h2cLoaded = true;
      console.log('[Tracker] html2canvas ready');
    };
    s.onerror = function () {
      console.error('[Tracker] FAILED to load html2canvas from', src, '— screenshot will not be captured');
    };
    (document.head || document.documentElement).appendChild(s);
  })();

  // ── Event queue ───────────────────────────────────────────────────────────
  function push(type, x, y) {
    // Convert viewport-relative clientY to absolute page position so events
    // map correctly onto a full-page screenshot.
    var pageHeight = document.documentElement.scrollHeight;
    var normX = Math.max(0, Math.min(1, x / window.innerWidth));
    var normY = Math.max(0, Math.min(1, (y + window.scrollY) / pageHeight));
    eventQueue.push({ type: type, x: normX, y: normY, ts: Date.now() });
  }

  function flush(opts) {
    var payload = {
      apiKey: API_KEY,
      pageKey: PAGE_KEY,
      sessionId: sessionId,
      pageUrl: window.location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageScrollHeight: document.documentElement.scrollHeight,
      events: eventQueue.slice(),
    };

    if (opts && opts.ended) {
      payload.endedAt = new Date().toISOString();
    }

    eventQueue = [];

    if (!opts || !opts.init) {
      if (!payload.events.length && !payload.endedAt) return;
    }

    // Always use fetch+keepalive — sendBeacon with application/json fails silently
    // on iOS Safari because it can't send a CORS preflight for non-simple requests.
    fetch(BASE_URL + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!sessionId && data.sessionId) sessionId = data.sessionId;
      })
      .catch(function (err) { console.warn('[Tracker] Event flush error:', err); });
  }

  // ── Mouse & touch tracking ────────────────────────────────────────────────
  document.addEventListener('mousemove', function (e) {
    var now = Date.now();
    if (now - lastMouseTime < THROTTLE_MS) return;
    lastMouseTime = now;
    push('mouse_move', e.clientX, e.clientY);
  });

  document.addEventListener('click', function (e) {
    push('click', e.clientX, e.clientY);
  });

  var lastTouchTime = 0;
  document.addEventListener('touchmove', function (e) {
    var now = Date.now();
    if (now - lastTouchTime < THROTTLE_MS) return;
    lastTouchTime = now;
    var t = e.touches[0];
    if (t) push('mouse_move', t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    if (t) push('click', t.clientX, t.clientY);
  }, { passive: true });

  // ── Long press detection ──────────────────────────────────────────────────
  var longPressTimer = null;
  var longPressX = 0;
  var longPressY = 0;
  var longPressMoved = false;
  var LONG_PRESS_MS = 500;
  var LONG_PRESS_MOVE_THRESHOLD = 10;

  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    if (!t) return;
    longPressX = t.clientX;
    longPressY = t.clientY;
    longPressMoved = false;
    longPressTimer = setTimeout(function () {
      if (!longPressMoved) {
        push('long_press', longPressX, longPressY);
      }
    }, LONG_PRESS_MS);
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    if (!t) return;
    var dx = t.clientX - longPressX;
    var dy = t.clientY - longPressY;
    if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) {
      longPressMoved = true;
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }
  }, { passive: true });

  document.addEventListener('touchend', function () {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }, { passive: true });

  // ── Double tap detection ──────────────────────────────────────────────────
  var lastTapTime = 0;
  var lastTapX = 0;
  var lastTapY = 0;
  var DOUBLE_TAP_MS = 300;
  var DOUBLE_TAP_RADIUS = 30;

  document.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    if (!t) return;
    var now = Date.now();
    var dx = t.clientX - lastTapX;
    var dy = t.clientY - lastTapY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (now - lastTapTime < DOUBLE_TAP_MS && dist < DOUBLE_TAP_RADIUS) {
      push('double_tap', t.clientX, t.clientY);
      lastTapTime = 0; // reset so triple-tap doesn't trigger twice
    } else {
      lastTapTime = now;
      lastTapX = t.clientX;
      lastTapY = t.clientY;
    }
  }, { passive: true });

  // ── Pinch detection ───────────────────────────────────────────────────────
  var pinchStartDist = 0;
  var PINCH_MIN_DELTA = 20;

  document.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      var t0 = e.touches[0];
      var t1 = e.touches[1];
      var dx = t1.clientX - t0.clientX;
      var dy = t1.clientY - t0.clientY;
      pinchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (pinchStartDist > 0 && e.changedTouches.length >= 1) {
      // record pinch center from the last known two-finger position
      var allTouches = e.touches.length > 0 ? e.touches : e.changedTouches;
      if (allTouches.length >= 2) {
        var cx = (allTouches[0].clientX + allTouches[1].clientX) / 2;
        var cy = (allTouches[0].clientY + allTouches[1].clientY) / 2;
        push('pinch', cx, cy);
      } else if (e.changedTouches.length >= 2) {
        var ct0 = e.changedTouches[0];
        var ct1 = e.changedTouches[1];
        var dx2 = ct1.clientX - ct0.clientX;
        var dy2 = ct1.clientY - ct0.clientY;
        var endDist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (Math.abs(endDist - pinchStartDist) > PINCH_MIN_DELTA) {
          push('pinch', (ct0.clientX + ct1.clientX) / 2, (ct0.clientY + ct1.clientY) / 2);
        }
      }
      pinchStartDist = 0;
    }
  }, { passive: true });

  // ── Scroll tracking ───────────────────────────────────────────────────────
  var lastScrollTime = 0;
  document.addEventListener('scroll', function () {
    var now = Date.now();
    if (now - lastScrollTime < 200) return;
    lastScrollTime = now;
    var pageHeight = document.documentElement.scrollHeight;
    if (pageHeight <= window.innerHeight) return;
    // Normalise to full page height (same coordinate space as other events)
    var frac = Math.max(0, Math.min(1, (window.scrollY + window.innerHeight / 2) / pageHeight));
    eventQueue.push({ type: 'scroll', x: 0.5, y: frac, ts: now });
  }, { passive: true });

  // ── Batch flush interval ──────────────────────────────────────────────────
  setInterval(flush, 2000);

  // ── Screenshot capture ────────────────────────────────────────────────────
  function doScreenshot() {
    if (screenshotSent) { console.log('[Tracker] Screenshot already sent, skipping'); return; }
    if (!h2cLoaded) { console.warn('[Tracker] doScreenshot called but html2canvas not ready yet'); return; }
    screenshotSent = true;
    console.log('[Tracker] Starting html2canvas capture…');
    window.html2canvas(document.documentElement, {
      logging: false,
      useCORS: true,
      allowTaint: true,
      scale: 1.0,
      windowWidth: window.innerWidth,
      windowHeight: document.documentElement.scrollHeight,
      // No height/y — capture the full page from top to bottom
    }).then(function (canvas) {
      console.log('[Tracker] Capture complete, encoding blob…');
      canvas.toBlob(function (blob) {
        if (!blob) {
          console.error('[Tracker] canvas.toBlob returned null — canvas may be tainted');
          screenshotSent = false;
          return;
        }
        console.log('[Tracker] Blob size:', blob.size, 'bytes — uploading…');
        var fd = new FormData();
        fd.append('apiKey', API_KEY);
        fd.append('pageKey', PAGE_KEY);
        fd.append('viewportWidth', String(window.innerWidth));
        fd.append('pageScrollHeight', String(document.documentElement.scrollHeight));
        fd.append('image', blob, 'screenshot.jpg');
        // Use fetch+keepalive — sendBeacon is unreliable for multipart on iOS Safari
        fetch(BASE_URL + '/api/screenshot', { method: 'POST', body: fd, keepalive: true })
          .then(function (r) {
            if (r.ok) console.log('[Tracker] Screenshot uploaded OK');
            else console.error('[Tracker] Screenshot upload failed — HTTP', r.status);
          })
          .catch(function (err) { console.error('[Tracker] Screenshot upload error:', err); });
      }, 'image/jpeg', 0.75);
    }).catch(function (err) {
      screenshotSent = false;
      console.error('[Tracker] html2canvas capture error:', err);
    });
  }

  function scheduleScreenshot() {
    console.log('[Tracker] Scheduling screenshot (h2cLoaded=' + h2cLoaded + ')');
    if (h2cLoaded) { doScreenshot(); return; }
    var waited = 0;
    var iv = setInterval(function () {
      waited += 300;
      if (h2cLoaded) { clearInterval(iv); doScreenshot(); return; }
      if (waited >= 15000) {
        clearInterval(iv);
        console.error('[Tracker] Screenshot FAILED — html2canvas did not load within 15s');
      }
    }, 300);
  }

  // ── Eye tracking ──────────────────────────────────────────────────────────
  function loadWebGazer() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/webgazer@2.1.0/dist/webgazer.js';
    s.onerror = function () { console.warn('[Tracker] Failed to load WebGazer'); };
    s.onload = function () {
      if (!window.webgazer) { console.warn('[Tracker] WebGazer undefined after load'); return; }
      window.webgazer.setGazeListener(function (data) {
        if (!data) return;
        push('eye_gaze', data.x, data.y);
      }).begin();
      setTimeout(function () {
        ['webgazerVideoFeed', 'webgazerFaceOverlay', 'webgazerGazeDot'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
      }, 2000);
    };
    document.head.appendChild(s);
  }

  function showConsentBanner() {
    var banner = document.createElement('div');
    banner.id = '__tracker_consent';
    banner.style.cssText = [
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%)',
      'background:rgba(8,8,16,0.95);backdrop-filter:blur(20px)',
      'border:1px solid rgba(139,92,246,0.4)',
      'border-radius:16px;padding:16px 20px;z-index:999999',
      'display:flex;align-items:center;gap:12px',
      'box-shadow:0 0 40px rgba(139,92,246,0.2)',
      'font-family:system-ui,sans-serif;font-size:14px;color:#e2e8f0',
      'max-width:520px;width:calc(100% - 40px)',
    ].join(';');
    banner.innerHTML = [
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">',
      '<circle cx="12" cy="12" r="3" fill="#8B5CF6"/>',
      '<path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="#8B5CF6" stroke-width="1.5"/>',
      '</svg>',
      '<span style="flex:1">This site uses <strong>eye tracking</strong> for UX analytics. Allow webcam access?</span>',
      '<button id="__tracker_allow" style="background:linear-gradient(135deg,#8B5CF6,#06B6D4);color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">Allow</button>',
      '<button id="__tracker_decline" style="background:rgba(255,255,255,0.06);color:#9ca3af;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer;white-space:nowrap">Decline</button>',
    ].join('');
    document.body.appendChild(banner);
    document.getElementById('__tracker_allow').addEventListener('click', function () { banner.remove(); loadWebGazer(); });
    document.getElementById('__tracker_decline').addEventListener('click', function () { banner.remove(); });
  }

  // ── Visibility / unload ───────────────────────────────────────────────────
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      flush({ ended: true }); // send remaining events + mark session ended
      doScreenshot(); // screenshotSent flag prevents double-capture
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    flush({ init: true }); // create session
    if (EYE_TRACKING) setTimeout(showConsentBanner, 1500);
    requestAnimationFrame(function () {
      requestAnimationFrame(scheduleScreenshot);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
