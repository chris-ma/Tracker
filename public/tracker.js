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

  // ── Session creation ──────────────────────────────────────────────────────
  function initSession() {
    flush({ init: true });
  }

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
          if (!sessionId && data.sessionId) {
            sessionId = data.sessionId;
          }
        })
        .catch(function (err) {
          console.warn('[Tracker] Event flush error:', err);
        });
    }
  }

  // ── Mouse tracking ────────────────────────────────────────────────────────
  document.addEventListener('mousemove', function (e) {
    var now = Date.now();
    if (now - lastMouseTime < THROTTLE_MS) return;
    lastMouseTime = now;
    push('mouse_move', e.clientX, e.clientY);
  });

  document.addEventListener('click', function (e) {
    push('click', e.clientX, e.clientY);
  });

  // ── Batch flush interval ──────────────────────────────────────────────────
  setInterval(flush, 2000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });

  // ── Eye tracking ──────────────────────────────────────────────────────────
  function loadWebGazer() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/webgazer@2.1.0/dist/webgazer.js';
    s.onerror = function () {
      console.warn('[Tracker] Failed to load WebGazer');
    };
    s.onload = function () {
      if (!window.webgazer) {
        console.warn('[Tracker] WebGazer loaded but window.webgazer is undefined');
        return;
      }
      window.webgazer
        .setGazeListener(function (data) {
          if (!data) return;
          push('eye_gaze', data.x, data.y);
        })
        .begin();
      // Hide the video feed overlay WebGazer creates
      setTimeout(function () {
        var video = document.getElementById('webgazerVideoFeed');
        var face = document.getElementById('webgazerFaceOverlay');
        var canvas = document.getElementById('webgazerGazeDot');
        if (video) video.style.display = 'none';
        if (face) face.style.display = 'none';
        if (canvas) canvas.style.display = 'none';
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
      '<button id="__tracker_allow" style="',
        'background:linear-gradient(135deg,#8B5CF6,#06B6D4);',
        'color:#fff;border:none;border-radius:8px;padding:7px 16px;',
        'font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap',
      '">Allow</button>',
      '<button id="__tracker_decline" style="',
        'background:rgba(255,255,255,0.06);color:#9ca3af;border:1px solid rgba(255,255,255,0.1);',
        'border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer;white-space:nowrap',
      '">Decline</button>',
    ].join('');

    document.body.appendChild(banner);

    document.getElementById('__tracker_allow').addEventListener('click', function () {
      banner.remove();
      loadWebGazer();
    });
    document.getElementById('__tracker_decline').addEventListener('click', function () {
      banner.remove();
    });
  }

  // ── Screenshot capture ────────────────────────────────────────────────────
  function captureScreenshot() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.onerror = function () {
      console.warn('[Tracker] Failed to load html2canvas');
    };
    s.onload = function () {
      window.html2canvas(document.documentElement, {
        logging: false,
        useCORS: true,
        scale: 0.3,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        height: window.innerHeight,
        y: window.scrollY,
      }).then(function (canvas) {
        var imageBase64 = canvas.toDataURL('image/jpeg', 0.6);
        fetch(BASE_URL + '/api/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: API_KEY,
            pageKey: PAGE_KEY,
            imageBase64: imageBase64,
          }),
        }).then(function (r) {
          if (!r.ok) console.warn('[Tracker] Screenshot upload failed:', r.status);
        }).catch(function (err) {
          console.warn('[Tracker] Screenshot upload error:', err);
        });
      }).catch(function (err) {
        console.warn('[Tracker] html2canvas error:', err);
      });
    };
    document.head.appendChild(s);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    initSession();
    if (EYE_TRACKING) {
      setTimeout(showConsentBanner, 1500);
    }
    setTimeout(captureScreenshot, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
