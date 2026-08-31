/**
 * loading-bar.js
 *
 * The in-pane file-loading indicator (see renderLoading in viewer-pane.js).
 * A WebGL2 canvas that renders a "streaming threads" progress bar — a
 * rounded stage that fills to the current fraction with fine horizontal
 * filaments blowing off the fill front, a soft front bloom, grain and a
 * vignette — with the file name and a big percentage overlaid. The look is
 * a hand-written reimplementation (the reference effect, MetalForge's
 * "progress / threads", ships only as Metal/WGSL and isn't reusable here);
 * every colour is pulled from the active Forage theme tokens, re-read when
 * the theme changes.
 *
 * Degrades on its own: no WebGL2, or prefers-reduced-motion, or KILLSWITCH
 * off → a plain determinate/indeterminate CSS track+fill (the markup this
 * file replaced), driven through the identical setProgress contract. The
 * RAF loop also stops itself the moment its element leaves the document,
 * so a missed destroy() can't leave it spinning.
 */

import { createPhraseRotator, inferPhase } from './loading-phrases.js';

/* Single lever: flip to false to disable the shader path everywhere (every
   loading bar becomes the plain CSS fallback) without touching the wiring
   in viewer-pane.js. */
const KILLSWITCH = true;

/* How long the animated bar stays on screen even if the file finished
   sooner — a light/cached doc renders in a few frames, so without this the
   bar just flashes and the fill animation never plays. Only the WebGL bar
   dwells (see `animated` on the return); the plain fallback never adds
   latency. viewer-pane.js reads this. */
export const MIN_VISIBLE_MS = 1250;

const MAX_DPR = 1.5;
const THEME_TOKENS = {
  bg: '--page-bg',
  trail: '--teal-bg',
  glow: '--blue',
  front: '--teal',
  dim: '--subtitle',
};

const VERT = `#version 300 es
precision highp float;
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform float u_progress;      // 0..1, eased
uniform float u_indeterminate; // 0 | 1
uniform vec3  u_bg;
uniform vec3  u_trail;
uniform vec3  u_glow;
uniform vec3  u_front;
uniform vec3  u_dim;
uniform float u_dark;          // 1 on a dark theme, 0 on a light one

out vec4 outColor;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;

  // Fill front. Indeterminate: a front that eases back and forth so the
  // bloom + threads sweep the bar with nothing to measure.
  float prog = u_indeterminate > 0.5
    ? mix(0.12, 0.9, 0.5 - 0.5 * cos(u_time * 1.5))
    : clamp(u_progress, 0.0, 1.0);

  float x = uv.x - prog; // < 0 to the left of the front (the "filled" side)

  // Body fill with a soft leading edge.
  float fill = smoothstep(0.006, -0.03, x);

  // Front bloom.
  float front = exp(-pow((uv.x - prog) / 0.05, 2.0)) * 0.82;

  // Streaming filaments: per-row trains of dashes marching left, only
  // reaching a little way back from the front, with gaps and empty rows.
  float rows = 20.0;
  float ry = uv.y * rows;
  float row = floor(ry);
  float rnd = hash11(row);
  float rnd2 = hash11(row + 41.0);

  float speed = mix(3.0, 7.5, rnd);
  float march = x * mix(7.0, 15.0, rnd2) - u_time * speed + rnd * 30.0;
  float dash = smoothstep(0.25, 0.95, sin(march) * 0.5 + 0.5);

  float reach = smoothstep(-mix(0.14, 0.5, hash11(row + 7.0)), 0.0, x) * smoothstep(0.03, -0.01, x);
  float rowMask = smoothstep(0.46, 0.12, abs(fract(ry) - 0.5));
  float present = step(0.28, hash11(row + 13.0));

  float threads = dash * reach * rowMask * present;

  // A couple of dimmer echoes trailing the front.
  float echo = 0.0;
  echo += exp(-pow((uv.x - prog + 0.035) / 0.05, 2.0)) * 0.5;
  echo += exp(-pow((uv.x - prog + 0.075) / 0.06, 2.0)) * 0.28;

  // Compose. On a dark theme the front + threads are added (neon bloom);
  // on a light theme additive light just washes out, so they're mixed
  // toward the accent instead — same shapes, readable either way.
  vec3 col = u_bg;
  col = mix(col, u_trail, fill * 0.85);
  col = mix(col, u_dim, fill * 0.12);

  float bloom = front * 0.85 + echo * 0.4;
  col = mix(col, mix(col + u_glow, mix(col, u_glow, 0.9), 1.0 - u_dark), clamp(bloom, 0.0, 1.0));

  float th = clamp(threads, 0.0, 1.0);
  vec3 hot = mix(mix(col, u_front, 0.92), col + u_front * 1.5 + u_glow * 0.35, u_dark);
  col = mix(col, hot, th);

  // Vignette + grain (gentle — the bar is small).
  float vig = smoothstep(1.5, 0.5, length((uv - 0.5) * vec2(1.0, 1.3)));
  col *= mix(0.88, 1.0, vig);
  col += (hash21(gl_FragCoord.xy + u_time) - 0.5) * 0.04;

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/* #rgb / #rrggbb → [r, g, b] in 0..1. Theme tokens are all plain hex; a
   token that somehow isn't resolves to mid-grey rather than throwing. */
export function parseColor(str) {
  const s = (str || '').trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return [0.5, 0.5, 0.5];
  let hex = m[1];
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

function readThemeColors() {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const [key, token] of Object.entries(THEME_TOKENS)) {
    out[key] = parseColor(cs.getPropertyValue(token));
  }
  const [r, g, b] = out.bg;
  out.dark = 0.299 * r + 0.587 * g + 0.114 * b < 0.5 ? 1 : 0;
  return out;
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('shader compile failed: ' + log);
  }
  return sh;
}

function buildFallback(outer, label) {
  outer.classList.add('vault-loading--indeterminate');
  const track = document.createElement('div');
  track.className = 'vault-loading-track';
  const fill = document.createElement('div');
  fill.className = 'vault-loading-fill';
  track.appendChild(fill);
  outer.append(label, track);

  return {
    el: outer,
    setProgress(fraction, text) {
      if (!outer.isConnected) return;
      if (typeof text === 'string') label.textContent = text;
      if (fraction == null || !Number.isFinite(fraction)) {
        outer.classList.add('vault-loading--indeterminate');
        fill.style.width = '';
      } else {
        outer.classList.remove('vault-loading--indeterminate');
        fill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
      }
    },
    destroy() {},
    animated: false,
  };
}

/* Builds the loading block for `name`. Returns { el, setProgress, destroy }
   — el is the .vault-status--loading element to drop into the pane;
   setProgress(fraction|null, text) matches the old inline updater
   (null → indeterminate); destroy() tears down the RAF loop + observers
   and is safe to call more than once. */
export function createLoadingBar(name) {
  const outer = document.createElement('div');
  outer.className = 'vault-status vault-status--loading vault-loading';

  const label = document.createElement('span');
  label.className = 'vault-loading-label';
  label.textContent = `Loading ${name}…`;

  /* The dim second line under the shader pill: the real, informative
     status a renderer reports ("Rendering page 3 of 12"). The pill itself
     (`label`) shows a rotating gerund instead — see loading-phrases.js.
     Only used on the animated path; the fallback keeps `label` literal. */
  const sub = document.createElement('span');
  sub.className = 'vault-loading-label vault-loading-sub';
  sub.textContent = `Loading ${name}…`;

  const reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!KILLSWITCH || reducedMotion) {
    return buildFallback(outer, label);
  }

  const stage = document.createElement('div');
  stage.className = 'vault-loading-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'vault-loading-canvas';

  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) {
    return buildFallback(outer, label);
  }

  const overlay = document.createElement('div');
  overlay.className = 'vault-loading-overlay';
  overlay.append(label);
  stage.append(canvas, overlay);
  outer.append(stage, sub);

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('link failed: ' + gl.getProgramInfoLog(program));
    }
  } catch (err) {
    return buildFallback(outer, label);
  }
  gl.useProgram(program);

  const U = {};
  for (const n of ['u_res', 'u_time', 'u_progress', 'u_indeterminate', 'u_bg', 'u_trail', 'u_glow', 'u_front', 'u_dim', 'u_dark']) {
    U[n] = gl.getUniformLocation(program, n);
  }

  let colors = readThemeColors();
  const themeObserver = new MutationObserver(() => {
    colors = readThemeColors();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let target = 0;          // latest fraction handed to setProgress (0..1)
  let eased = 0;           // what's actually drawn
  let indeterminate = 1;   // 1 until a real fraction arrives
  let raf = 0;
  let start = performance.now();
  let destroyed = false;

  /* Cycle a playful gerund on the pill while the file works. inferPhase()
     (below, in setProgress) keeps it loosely on-topic with whatever phase
     the renderer reports; the real status goes on `sub`. */
  const rotator = createPhraseRotator({
    onWord: (word) => { if (!destroyed) label.textContent = word; },
  });
  rotator.setPhase('load');
  rotator.start();

  function resize() {
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(stage.clientWidth * dpr));
    const h = Math.max(1, Math.round(stage.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  const resizeObserver = new ResizeObserver(() => {
    resize();
    // Keep a correct static frame up even while rAF is paused (background
    // tab): the observer fires once the element lands in the layout.
    if (!destroyed) render(performance.now(), false);
  });
  resizeObserver.observe(stage);

  function render(now, advance) {
    resize();
    if (advance) eased += (target - eased) * 0.09;
    else eased = target;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform1f(U.u_time, (now - start) / 1000);
    gl.uniform1f(U.u_progress, eased);
    gl.uniform1f(U.u_indeterminate, indeterminate);
    gl.uniform3fv(U.u_bg, colors.bg);
    gl.uniform3fv(U.u_trail, colors.trail);
    gl.uniform3fv(U.u_glow, colors.glow);
    gl.uniform3fv(U.u_front, colors.front);
    gl.uniform3fv(U.u_dim, colors.dim);
    gl.uniform1f(U.u_dark, colors.dark);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    if (destroyed) return;
    if (!outer.isConnected) { destroy(); return; }
    render(now, true);
    raf = requestAnimationFrame(frame);
  }
  // Paint one static frame synchronously so a bar mounted in a background
  // tab (rAF paused) isn't a blank rectangle until the tab is shown.
  render(performance.now(), false);
  raf = requestAnimationFrame(frame);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    rotator.stop();
    cancelAnimationFrame(raf);
    themeObserver.disconnect();
    resizeObserver.disconnect();
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }

  return {
    el: outer,
    setProgress(fraction, text) {
      if (destroyed) return;
      if (typeof text === 'string') {
        sub.textContent = text;
        rotator.setPhase(inferPhase(text));
      }
      if (fraction == null || !Number.isFinite(fraction)) {
        indeterminate = 1;
      } else {
        indeterminate = 0;
        target = Math.min(1, Math.max(0, fraction));
      }
    },
    destroy,
    animated: true,
  };
}
