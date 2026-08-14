/**
 * offline.js
 *
 * "Make this site available offline" button. Opt-in, not automatic —
 * registration only happens on click, matching the rest of this site's
 * "nothing happens without the visitor asking for it" posture (no
 * account, no cloud, no surprise background network activity). Ported
 * from github.com/forageopen/Noted's src/offline.ts.
 *
 * The service worker itself is sw.js at the site root — see that file's
 * header comment for why it can't live under assets/js/.
 */

(function () {
  var CLOUD_DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>';
  var CLOUD_CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="m9 16 2 2 4-4"/></svg>';

  var LABELS = {
    unsupported: "Offline mode isn't supported in this browser",
    'not-ready': 'Make this site available offline',
    checking: 'Checking offline availability…',
    ready: 'Available offline',
    error: "Couldn't enable offline mode — click to retry",
  };

  function renderOfflineButton(button, state) {
    button.innerHTML = state === 'ready' ? CLOUD_CHECK_ICON : CLOUD_DOWNLOAD_ICON;
    button.title = LABELS[state];
    button.setAttribute('aria-label', LABELS[state]);
    button.disabled = state === 'unsupported' || state === 'ready' || state === 'checking';
  }

  function isServiceWorkerSupported() {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  }

  async function checkOfflineReady() {
    if (!isServiceWorkerSupported()) return false;
    var registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration && registration.active);
  }

  async function registerOffline(swPath) {
    /* swPath is relative to the CALLING PAGE (a service worker registration
       path resolves against the current document's URL, not the site
       root) — read from the button's data-sw-path attribute so this one
       shared script works correctly from both index.html ("sw.js") and
       vault/index.html ("../sw.js"), and still resolves correctly under a
       GitHub Pages project subpath or local dev, since neither is a
       hardcoded absolute path. */
    var registration = await navigator.serviceWorker.register(swPath);
    if (registration.installing) {
      await new Promise(function (resolve) {
        registration.installing.addEventListener('statechange', function (e) {
          if (e.target.state === 'activated') resolve();
        });
      });
    }
  }

  function setupOfflineButton(button) {
    if (!button) return;

    if (!isServiceWorkerSupported()) {
      renderOfflineButton(button, 'unsupported');
      return;
    }

    checkOfflineReady().then(function (ready) {
      renderOfflineButton(button, ready ? 'ready' : 'not-ready');
    });

    button.addEventListener('click', async function () {
      renderOfflineButton(button, 'checking');
      try {
        await registerOffline(button.dataset.swPath || 'sw.js');
        renderOfflineButton(button, 'ready');
      } catch (err) {
        renderOfflineButton(button, 'error');
      }
    });
  }

  document.querySelectorAll('[data-action="make-offline"]').forEach(setupOfflineButton);
})();
