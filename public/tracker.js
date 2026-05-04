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

  var script = document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var API_KEY = script.getAttribute('data-api-key');
  var PAGE_KEY = script.getAttribute('data-page-key');
  var EYE_TRACKING = script.getAttribute('data-eye-tracking') === 'true';
  var BASE_URL = script.src.replace('/tracker.js', '');

  if (!API_KEY || !PAGE_KEY) {
    console.warn('[Tracker] Missing data-api-key or data-page-key');
    return;
  }

  var sessionId = null;
  var eventQueue = [];
  var lastMouseTime = 0;
  var THROTTLE_MS = 50;

  // ── Load html2canvas immediately (before DOMContentLoaded) ────────────────
  // Starting early maximises the chance it's ready before the user navigates away.
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
    var normX = Math.max(0, Math.min(1, x / window.innerWidth));
    var normY = Math.max(0, Math.min(1, y / window.innerHeight));
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
      events: eventQueue.slice(),
    };
    eventQueue = [];

    if (!opts || !opts.init) {
      if (!payload.events.length) return;
    }

    var body = JSON.stringify(payload);
    if (navigator.sendBeacon && !opts) {
      navigator.sendBeacon(BASE_URL + '/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch(BASE_URL + '/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!sessionId && data.sessionId) sessionId = data.sessionId;
        })
        .catch(function (err) { console.warn('[Tracker] Event flush error:', err); });
    }
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

  // ── Scroll tracking ───────────────────────────────────────────────────────
  var lastScrollTime = 0;
  document.addEventListener('scroll', function () {
    var now = Date.now();
    if (now - lastScrollTime < 200) return;
    lastScrollTime = now;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    var frac = Math.max(0, Math.min(1, window.scrollY / maxScroll));
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
      scale: 0.25,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      height: window.innerHeight,
      y: window.scrollY,
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
        fd.append('image', blob, 'screenshot.jpg');
        // sendBeacon persists even when the page is backgrounded or unloading
        if (navigator.sendBeacon) {
          var ok = navigator.sendBeacon(BASE_URL + '/api/screenshot', fd);
          console.log('[Tracker] sendBeacon queued:', ok);
        } else {
          fetch(BASE_URL + '/api/screenshot', { method: 'POST', body: fd, keepalive: true })
            .then(function (r) {
              if (r.ok) console.log('[Tracker] Screenshot uploaded OK');
              else console.error('[Tracker] Screenshot upload failed — HTTP', r.status);
            })
            .catch(function (err) { console.error('[Tracker] Screenshot upload error:', err); });
        }
      }, 'image/jpeg', 0.6);
    }).catch(function (err) {
      screenshotSent = false; // allow retry
      console.error('[Tracker] html2canvas capture error:', err);
    });
  }

  // Poll until h2c is ready then shoot; gives up after 15s
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
      flush();
      doScreenshot(); // screenshotSent flag prevents double-capture
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    flush({ init: true }); // create session
    if (EYE_TRACKING) setTimeout(showConsentBanner, 1500);
    // Double rAF ensures at least one paint before capturing
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
