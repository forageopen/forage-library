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
  var THEME_SWATCH = {
    sakura: '#c2185b',
    cherry: '#ff2ea6',
    'forest-brew': '#acc54e',
    'tea-mist': '#242f21',
    blueberry: '#647ebd',
    kokoblu: '#a7bdd7',
    dubai: '#abc44f',
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
        '<span class="theme-swatch" style="background:' + THEME_SWATCH[theme] + '"></span>' +
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
