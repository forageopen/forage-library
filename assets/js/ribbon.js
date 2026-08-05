/* ============================================================
   RIBBON.JS — Forage article ribbon interactions
   Share, copy link, copy page content, export to PDF, light/dark
   toggle. No dependencies. Attaches to every .ribbon on the page.
   ============================================================ */

(function () {
  var THEME_KEY = 'forage-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
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

  async function exportArticle() {
    const pdfHref = location.pathname.replace(/\.html?$/i, '.pdf');
    try {
      const res = await fetch(pdfHref, { method: 'HEAD' });
      if (res.ok) {
        window.open(pdfHref, '_blank');
        return;
      }
    } catch (err) {
      /* no network / not deployed yet / file:// preview — fall back below */
    }
    window.print();
  }

  function closeMenu(menu, btn) {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function initRibbon(ribbon) {
    const dateEl = ribbon.querySelector('.ribbon-date');
    if (dateEl) dateEl.textContent = ribbon.dataset.published || '';

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

    ribbon.querySelectorAll('[data-action="export"]').forEach(function (btn) {
      btn.addEventListener('click', exportArticle);
    });

    ribbon.querySelectorAll('[data-action="toggle-theme"]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });

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
