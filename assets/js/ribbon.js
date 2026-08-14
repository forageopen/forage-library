/* ============================================================
   RIBBON.JS — Forage article ribbon interactions
   Share, copy link, copy page content, seven-theme popover picker
   (ported from github.com/forageopen/Noted's src/theme.ts — same
   palettes, same resolveInitialTheme/popover shape). No dependencies.
   Attaches to every .ribbon on the page.
   ============================================================ */

(function () {
  var THEME_KEY = 'forage-theme';
  var THEME_ORDER = ['sakura', 'cherry', 'forest-brew', 'tea-mist', 'blueberry', 'kokoblu', 'dubai'];
  var THEME_LABEL = {
    sakura: 'Sakura',
    cherry: 'Cherry',
    'forest-brew': 'Forest Brew',
    'tea-mist': 'Tea Mist',
    blueberry: 'Blueberry',
    kokoblu: 'Kokoblu',
    dubai: 'Dubai',
  };
  /* One Lucide icon per theme (https://lucide.dev, ISC license) — inlined
     as raw path data rather than pulling in the icon library, matching
     how every other icon in this file's ribbon is already hand-inlined.
     Picked for a loose thematic fit with each palette's name/mood rather
     than its color, since the point of this change was icon+name instead
     of a color swatch. */
  var THEME_ICON = {
    sakura: '<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>',
    cherry: '<path d="M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z"/><path d="M12 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z"/><path d="M7 14c3.22-2.91 4.29-8.75 5-12 1.66 2.38 4.94 9 5 12"/><path d="M22 9c-4.29 0-7.14-2.33-10-7 5.71 0 10 4.67 10 7Z"/>',
    'forest-brew': '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>',
    'tea-mist': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    blueberry: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    kokoblu: '<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>',
    dubai: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  };
  /* First-time visitor (no stored preference) starts on Cherry — matches
     Noted's own default (a fixed default, not an OS-preference guess, so
     "first open" looks the same for everyone). */
  var DEFAULT_THEME = 'cherry';

  function isTheme(value) {
    return THEME_ORDER.indexOf(value) !== -1;
  }

  /* Pure: given a stored value (possibly invalid/absent), decide which
     theme to start with. */
  function resolveInitialTheme(stored) {
    if (stored !== null && isTheme(stored)) return stored;
    return DEFAULT_THEME;
  }

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (err) { return null; }
  }

  function persistTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (err) { /* ignore */ }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function renderThemeOptions(popover, current) {
    popover.innerHTML = THEME_ORDER.map(function (theme) {
      var selected = theme === current;
      return '<li role="menuitemradio" aria-checked="' + selected + '">' +
        '<button type="button" class="theme-option" data-theme="' + theme + '">' +
        '<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + THEME_ICON[theme] + '</svg>' +
        '<span>' + THEME_LABEL[theme] + '</span></button></li>';
    }).join('');
  }

  function setupThemePopover(toggleBtn, popover) {
    var current = resolveInitialTheme(getStoredTheme());
    applyTheme(current);
    renderThemeOptions(popover, current);
    toggleBtn.setAttribute('aria-label', 'Theme — currently ' + THEME_LABEL[current]);

    function setOpen(open) {
      popover.hidden = !open;
      toggleBtn.setAttribute('aria-expanded', String(open));
    }
    setOpen(false);

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation(); // don't let this click immediately trigger the outside-click closer below
      setOpen(popover.hidden);
    });

    document.addEventListener('click', function (e) {
      if (!popover.hidden && !popover.contains(e.target) && e.target !== toggleBtn) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !popover.hidden) setOpen(false);
    });

    popover.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.theme-option');
      var theme = btn && btn.dataset.theme;
      if (!theme || !isTheme(theme)) return;
      current = theme;
      applyTheme(current);
      persistTheme(current);
      renderThemeOptions(popover, current);
      toggleBtn.setAttribute('aria-label', 'Theme — currently ' + THEME_LABEL[current]);
      setOpen(false);
    });
  }

  function toast(msg) {
    let el = document.querySelector('.forage-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'forage-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2000);
  }

  async function copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(successMsg);
      return;
    } catch (err) {
      /* fall through — covers local file:// preview and non-secure contexts */
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast(successMsg);
    } catch (err) {
      toast('Could not copy — copy manually.');
    }
    document.body.removeChild(ta);
  }

  function getArticleText() {
    const main = document.querySelector('[data-article-content]') || document.querySelector('main') || document.body;
    return main.innerText.trim();
  }

  function closeMenu(menu, btn) {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(raw) {
    if (!raw) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return raw; // not ISO — show as authored
    var year = Number(m[1]), month = Number(m[2]) - 1, day = Number(m[3]);
    var d = new Date(year, month, day);
    if (isNaN(d.getTime())) return raw;
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function initRibbon(ribbon) {
    const dateEl = ribbon.querySelector('.ribbon-date');
    if (dateEl) dateEl.textContent = formatDate(ribbon.dataset.published);

    ribbon.querySelectorAll('[data-action="copy-link"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(location.href, 'Link copied');
      });
    });

    const shareBtn = ribbon.querySelector('.ribbon-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', async function () {
        if (navigator.share) {
          try {
            await navigator.share({ title: document.title, url: location.href });
          } catch (err) {
            /* user cancelled the native share sheet — no-op */
          }
        } else {
          copyText(location.href, 'Link copied — sharing not supported here');
        }
      });
    }

    ribbon.querySelectorAll('[data-action="copy-content"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(getArticleText(), 'Page content copied');
      });
    });

    const themeToggleBtn = ribbon.querySelector('[data-action="toggle-theme-menu"]');
    const themePopover = ribbon.querySelector('.theme-popover');
    if (themeToggleBtn && themePopover) {
      setupThemePopover(themeToggleBtn, themePopover);
    }

    const kebabBtn = ribbon.querySelector('[data-action="toggle-menu"]');
    const menu = ribbon.querySelector('.ribbon-menu');
    if (kebabBtn && menu) {
      kebabBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const wasHidden = menu.hidden;
        menu.hidden = !wasHidden;
        kebabBtn.setAttribute('aria-expanded', String(wasHidden));
      });
      document.addEventListener('click', function (e) {
        if (!menu.hidden && !menu.contains(e.target) && e.target !== kebabBtn) {
          closeMenu(menu, kebabBtn);
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hidden) closeMenu(menu, kebabBtn);
      });
    }
  }

  document.querySelectorAll('.ribbon').forEach(initRibbon);
})();
