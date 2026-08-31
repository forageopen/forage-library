# Research catalog — Stage 1 UI mockups

Throwaway mockups for the Skills / Agents / Commands dashboard planned for
**Research**. Not wired into the app. Delete this `design/` folder before the
feature PR merges.

## Run

```
python -m http.server 8777      # from the repo root
```

then open <http://localhost:8777/design/catalog-previews/index.html>.

## Files

| file | what |
|---|---|
| `index.html` | landing page linking the 3 variants |
| `variant-a.html` | **A · Dense grid** — GitHub-flavoured, inline accordion expand |
| `variant-b.html` | **B · Gallery** — marketplace cards + right-side detail drawer |
| `variant-c.html` | **C · Native index** — typographic rows + left tag rail + full-pane reader |
| `tokens.css` | the 7 Forage theme palettes, copied from `assets/css/forage.css` |
| `sample-data.js` | fixture catalog + `.md` bodies + shared helpers (icons, md->html, copy, theme bar) |

All three share `tokens.css` + `sample-data.js`, are theme-aware (switcher top-right),
and cover: search, tag filter, `</> Code` vs rendered `Preview`, Copy,
Show-full/Collapse for long docs, per-bundle file list, disabled
"GitHub · coming soon" button, and a stubbed Download (alert; the real build
zips with JSZip). `write-like-adam` uses Adam's real skill text.
