/**
 * visitor-counter.js
 *
 * Site visitor counter, backed by GoatCounter (goatcounter.com) — a
 * privacy-focused, cookie-free analytics service that dedupes hits by
 * hashed IP+user-agent+day server-side, so a visitor refreshing the page
 * is counted once, not once per page load. Ported as-is from
 * github.com/forageopen/Noted's src/visitor-counter.ts, reusing the same
 * GoatCounter site (per-project decision — see this repo's README) so
 * Forage Library's visits are counted alongside Noted's on one dashboard.
 *
 * This embeds a third-party tracking script, which sends the visitor's
 * IP/user-agent to GoatCounter on every page load — a disclosed exception
 * to this repo's "runs entirely in your browser" posture for the vault
 * viewer itself (the tracking script is unrelated to file rendering,
 * which stays fully client-side either way).
 */

(function () {
  var GOATCOUNTER_SITE = 'https://forage.goatcounter.com';
  var GOATCOUNTER_SCRIPT_SRC = '//gc.zgo.at/count.js';

  /* Guarding on the real production hostname keeps local dev/preview page
     loads from pinging GoatCounter and inflating the real count. */
  var PRODUCTION_HOSTNAME = 'forageopen.github.io';

  function setupVisitorTracking(hostname, doc) {
    hostname = hostname || window.location.hostname;
    doc = doc || document;
    if (hostname !== PRODUCTION_HOSTNAME) return;
    if (doc.querySelector('script[src="' + GOATCOUNTER_SCRIPT_SRC + '"]')) return;

    var script = doc.createElement('script');
    script.async = true;
    script.src = GOATCOUNTER_SCRIPT_SRC;
    script.dataset.goatcounter = GOATCOUNTER_SITE + '/count';
    doc.head.appendChild(script);
  }

  setupVisitorTracking();
})();
