// ==UserScript==
// @name         Smartschool CS:GO Crate Opener
// @namespace    https://github.com/kobejanssen26-wq/vynra
// @version      1.0.0
// @description  CS:GO-style crate opening animation for Smartschool results
// @author       Vynra
// @match        https://*.smartschool.be/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/*
 * INSTALLATIE
 *   1. Installeer Tampermonkey, maak een nieuw script en plak dit bestand erin
 *      (of open de "raw" URL van dit bestand: Tampermonkey biedt dan zelf Install aan).
 *   2. Controleer dat de @match-regels hierboven overeenkomen met jouw Smartschool-URL.
 *      Staat je URL er niet bij? Voeg een regel toe, bv.  // @match  https://jouwdomein.nl/resultaat/*
 *   3. Werkt de score-detectie niet? Zet CONFIG.scoreSelector op de CSS-selector van het
 *      element dat de score toont (rechtsklik op de score -> Inspect). Zie CONFIG hieronder.
 *
 * De script leest de score alleen uit de bestaande pagina; er wordt NIETS willekeurig
 * gegenereerd en de originele pagina wordt nooit aangepast of verwijderd. De crate-UI
 * ligt als overlay (in een Shadow DOM) bovenop de pagina.
 */

(function () {
  'use strict';

  /* ======================================================================
   * 1. CONFIG - hier pas je dingen makkelijk aan
   * ==================================================================== */
  const CONFIG = {
    // Optioneel: exacte CSS-selector van het score-element. Heeft altijd voorrang.
    // Voorbeeld: '.result-score' of '#score'. Leeg = automatische detectie.
    scoreSelector: '',

    // Optioneel: alleen draaien als de URL hierop matcht (regex). Leeg = altijd (binnen @match).
    // Voorbeeld: /result|resultaat|score|uitslag/i
    urlPattern: /\/results|\/skore|resultaten|uitslag/i,

    // Trefwoorden die helpen de score te herkennen (class/id/omliggende tekst).
    scoreKeywords: /score|result|resultaat|uitslag|percent|procent|punten|points|grade|cijfer|behaald|correct|goed/i,
    // Elementen waar we NIET in zoeken (navigatie, voetnoot, onze eigen UI, ...).
    ignoreSelector: 'script,style,noscript,nav,footer,header nav,[aria-hidden="true"],progress,[role="progressbar"]',

    detectTimeoutMs: 15000, // hoe lang we wachten op een (dynamisch geladen) score
    failSafeRevealMs: 4000, // pagina nooit langer dan dit verborgen houden zonder crate

    spinBaseMs: 7500, // duur van de animatie bij snelheid 1x
    tileWidth: 150,
    tileGap: 10,
    tileCount: 64,
    winnerIndex: 52,

    // Rarity-kleuren op basis van percentage (hoog = zeldzamer).
    tiers: [
      { min: 90, name: 'Covert', color: '#eb4b4b' },
      { min: 80, name: 'Classified', color: '#d32ce6' },
      { min: 65, name: 'Restricted', color: '#8847ff' },
      { min: 50, name: 'Mil-Spec', color: '#4b69ff' },
      { min: 35, name: 'Industrial', color: '#5e98d9' },
      { min: 0, name: 'Consumer', color: '#b0c3d9' },
    ],

    speeds: [
      { label: 'Slow', value: 0.6 },
      { label: 'Normal', value: 1 },
      { label: 'Fast', value: 1.7 },
      { label: 'Turbo', value: 3 },
    ],
    defaults: { sound: false, speed: 1 },
    storageKey: 'ssCrateOpener.settings.v1',
  };

  /* ======================================================================
   * 2. Utils
   * ==================================================================== */
  const log = (...a) => console.log('[Crate Opener]', ...a);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const tierFor = (p) => CONFIG.tiers.find((t) => p >= t.min) || CONFIG.tiers[CONFIG.tiers.length - 1];
  const fmt = (p) => (Number.isInteger(p) ? String(p) : p.toFixed(1)) + '%';

  function whenBodyReady(cb) {
    if (document.body) return cb();
    const mo = new MutationObserver(() => {
      if (document.body) {
        mo.disconnect();
        cb();
      }
    });
    mo.observe(document, { childList: true, subtree: true });
  }

  /* ======================================================================
   * 3. Pre-hide: voorkomt dat de echte score even zichtbaar is (flash)
   * ==================================================================== */
  const PendingGuard = {
    id: 'ss-crate-pending-style',
    on() {
      if (!document.documentElement) return setTimeout(() => this.on(), 5);
      const s = document.createElement('style');
      s.id = this.id;
      s.textContent = 'html.ss-crate-pending body{visibility:hidden!important}';
      (document.head || document.documentElement).appendChild(s);
      document.documentElement.classList.add('ss-crate-pending');
      this.timer = setTimeout(() => this.off(), CONFIG.failSafeRevealMs);
    },
    off() {
      clearTimeout(this.timer);
      document.documentElement.classList.remove('ss-crate-pending');
    },
  };

  /* ======================================================================
   * 4. Score-detectie (robuust, meerdere strategieen)
   * ==================================================================== */
  const ScoreDetector = {
    PCT: /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/,
    FRAC: /(\d{1,4}(?:[.,]\d+)?)\s*(?:\/|van de|van|out of|uit)\s*(\d{1,4}(?:[.,]\d+)?)/i,
    num: (s) => parseFloat(String(s).replace(',', '.')),

    /** Parse een tekst naar een percentage (0-100) of null. */
    parse(text, { allowBare = false } = {}) {
      if (!text) return null;
      const t = text.replace(/ /g, ' ').trim();
      let m = t.match(this.PCT);
      if (m) {
        const v = this.num(m[1]);
        return v >= 0 && v <= 100 ? v : null;
      }
      m = t.match(this.FRAC);
      if (m) {
        const a = this.num(m[1]);
        const b = this.num(m[2]);
        if (b > 0 && a <= b) return Math.round((a / b) * 1000) / 10;
      }
      if (allowBare) {
        m = t.match(/^\D*(\d{1,3}(?:[.,]\d+)?)\D*$/);
        if (m) {
          const v = this.num(m[1]);
          if (v >= 0 && v <= 100) return v;
        }
      }
      return null;
    },

    /** Strategie 1: door gebruiker opgegeven selector. */
    fromSelector() {
      if (!CONFIG.scoreSelector) return null;
      const el = document.querySelector(CONFIG.scoreSelector);
      if (!el) return null;
      const p = this.parse(el.textContent, { allowBare: true });
      return p == null ? null : { percent: p, el, via: 'selector' };
    },

    /** Strategie 2: kandidaten scoren op context, grootte en zichtbaarheid. */
    fromHeuristics() {
      const candidates = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.closest && node.closest(CONFIG.ignoreSelector + ',[data-ss-crate]')) continue;
        // alleen "bladeren": weinig tekst, eigen tekstnodes bevatten het getal
        const own = Array.from(node.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.nodeValue)
          .join(' ');
        const full = (node.textContent || '').trim();
        if (full.length > 60) continue;
        const text = own.trim() ? own : full;
        const percent = this.parse(text);
        if (percent == null) continue;
        const score = this.rate(node, full, text);
        if (score > 0) candidates.push({ percent, el: node, score, via: 'heuristic' });
      }
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0] || null;
    },

    rate(el, full, text) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return 0;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      let s = 1;
      s += clamp(parseFloat(cs.fontSize) / 8, 0, 8); // grote cijfers = waarschijnlijk de score
      if (/^\s*[\d.,]+\s*%\s*$/.test(full) || /^\s*[\d.,]+\s*\/\s*[\d.,]+\s*$/.test(full)) s += 3;
      // context: eigen class/id + 3 ouders + vorig element
      let ctx = '';
      let p = el;
      for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
        ctx += ' ' + (p.className && p.className.baseVal === undefined ? p.className : '') + ' ' + (p.id || '');
        if (i < 2 && p.previousElementSibling) ctx += ' ' + (p.previousElementSibling.textContent || '').slice(0, 40);
        if (i < 2 && p.parentElement) ctx += ' ' + (p.parentElement.textContent || '').slice(0, 80);
      }
      if (CONFIG.scoreKeywords.test(ctx)) s += 6;
      if (CONFIG.scoreKeywords.test(text)) s += 2;
      if (/\bscore\b|resultaat/i.test(ctx)) s += 2;
      if (rect.top < window.innerHeight * 1.5) s += 1;
      return s;
    },

    detect() {
      return this.fromSelector() || this.fromHeuristics();
    },

    /** Wacht tot er een score in de DOM verschijnt (ook voor SPA's). */
    wait(timeout = CONFIG.detectTimeoutMs) {
      return new Promise((resolve) => {
        const tryNow = () => {
          const r = this.detect();
          if (r) {
            cleanup();
            resolve(r);
            return true;
          }
          return false;
        };
        let t = null;
        const mo = new MutationObserver(() => {
          clearTimeout(t);
          t = setTimeout(tryNow, 250); // debounce
        });
        const cleanup = () => {
          mo.disconnect();
          clearTimeout(t);
          clearTimeout(to);
        };
        const to = setTimeout(() => {
          cleanup();
          resolve(null);
        }, timeout);
        if (tryNow()) return;
        mo.observe(document.body, { childList: true, subtree: true, characterData: true });
      });
    },
  };

  /* ======================================================================
   * 5. Instellingen (localStorage, met veilige fallback)
   * ==================================================================== */
  const Settings = {
    data: { ...CONFIG.defaults },
    load() {
      try {
        Object.assign(this.data, JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'));
      } catch (_) {}
      return this;
    },
    set(k, v) {
      this.data[k] = v;
      try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.data));
      } catch (_) {}
    },
  };

  /* ======================================================================
   * 6. Geluid (WebAudio, geen bestanden nodig; standaard uit)
   * ==================================================================== */
  const Sound = {
    ctx: null,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, dur, type = 'square', vol = 0.05, when = 0) {
      if (!Settings.data.sound || !this.ensure()) return;
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      const t = c.currentTime + when;
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    tick() {
      this.tone(900 + Math.random() * 120, 0.05, 'square', 0.035);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.08, i * 0.09));
    },
  };

  /* ======================================================================
   * 7. UI (Shadow DOM zodat site-CSS en onze CSS elkaar niet raken)
   * ==================================================================== */
  const STYLES = `
    :host{all:initial}
    *{box-sizing:border-box}
    .root{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;
      font-family:'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;color:#e8ecf8;overflow:hidden;
      background:radial-gradient(1200px 700px at 50% 0%,#1a1f3a 0%,#0b0d1a 55%,#05060d 100%);
      animation:fade .4s ease both}
    .root.hidden{display:none}
    @keyframes fade{from{opacity:0}to{opacity:1}}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px;
      mask-image:radial-gradient(circle at 50% 40%,#000 0%,transparent 70%);-webkit-mask-image:radial-gradient(circle at 50% 40%,#000 0%,transparent 70%)}
    .glow{position:absolute;width:640px;height:640px;border-radius:50%;filter:blur(120px);opacity:.35;
      background:var(--accent,#8847ff);top:50%;left:50%;transform:translate(-50%,-50%);transition:background 1s}
    .panel{position:relative;width:min(1100px,94vw);padding:34px 28px 30px;border-radius:24px;text-align:center;
      background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02));
      border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
      box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.12)}
    .eyebrow{font-size:13px;letter-spacing:.35em;text-transform:uppercase;color:#8d97c4;font-weight:600}
    h1{margin:10px 0 6px;font-size:clamp(28px,5vw,46px);font-weight:800;letter-spacing:.02em;
      background:linear-gradient(90deg,#fff,#b9c4ff);-webkit-background-clip:text;background-clip:text;color:transparent}
    p.sub{margin:0 0 22px;color:#9aa4cf;font-size:16px}
    .btn{cursor:pointer;border:0;border-radius:14px;padding:16px 38px;font:800 18px/1 inherit;letter-spacing:.12em;
      text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#8847ff,#d32ce6);
      box-shadow:0 10px 30px rgba(136,71,255,.45),inset 0 1px 0 rgba(255,255,255,.3);
      transition:transform .15s,box-shadow .15s,filter .15s;font-family:inherit}
    .btn:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 14px 40px rgba(211,44,230,.55),inset 0 1px 0 rgba(255,255,255,.3)}
    .btn:active{transform:scale(.98)}
    .btn.ghost{background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);font-size:14px;padding:13px 24px}
    .btn.ghost:hover{background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
    .crate{width:170px;height:170px;margin:0 auto 6px;animation:float 3.2s ease-in-out infinite;
      filter:drop-shadow(0 0 28px rgba(136,71,255,.65))}
    @keyframes float{50%{transform:translateY(-10px) rotate(-1.5deg)}}
    .lock{display:inline-flex;gap:8px;align-items:center;font-size:13px;letter-spacing:.3em;font-weight:700;
      color:#ffcf66;background:rgba(255,207,102,.1);border:1px solid rgba(255,207,102,.3);padding:7px 16px;border-radius:99px;margin-bottom:12px}
    .view{display:none}.view.active{display:block;animation:fade .35s ease both}

    /* roulette */
    .roulette{position:relative;margin:26px 0 8px;height:200px;border-radius:16px;overflow:hidden;
      background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.25));
      border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 0 60px rgba(0,0,0,.7)}
    .roulette:before,.roulette:after{content:'';position:absolute;top:0;bottom:0;width:22%;z-index:3;pointer-events:none}
    .roulette:before{left:0;background:linear-gradient(90deg,#0a0c18,transparent)}
    .roulette:after{right:0;background:linear-gradient(270deg,#0a0c18,transparent)}
    .strip{position:absolute;top:0;left:0;height:100%;display:flex;align-items:center;gap:var(--gap);padding:0 0;will-change:transform}
    .tile{flex:0 0 var(--tw);height:160px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;
      position:relative;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.35));
      border:1px solid rgba(255,255,255,.1);overflow:hidden}
    .tile:before{content:'';position:absolute;inset:auto 0 0 0;height:5px;background:var(--c)}
    .tile:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 100%,var(--c),transparent 70%);opacity:.28}
    .tile b{position:relative;z-index:1;font-size:36px;font-weight:800;text-shadow:0 0 18px var(--c);color:#fff}
    .tile small{position:relative;z-index:1;margin-top:6px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--c);font-weight:700}
    .tile.win.lit{box-shadow:0 0 0 2px var(--c),0 0 40px var(--c);animation:pop .6s ease both}
    @keyframes pop{50%{transform:scale(1.12)}}
    .marker{position:absolute;top:-4px;bottom:-4px;left:50%;width:4px;margin-left:-2px;z-index:4;
      background:linear-gradient(180deg,#ffe27a,#ff9f1a);box-shadow:0 0 16px #ffb22e,0 0 40px rgba(255,178,46,.7);border-radius:3px}
    .marker:before,.marker:after{content:'';position:absolute;left:50%;margin-left:-9px;border:9px solid transparent}
    .marker:before{top:0;border-top-color:#ffb22e}
    .marker:after{bottom:0;border-bottom-color:#ffb22e}
    .status{height:26px;color:#9aa4cf;letter-spacing:.2em;text-transform:uppercase;font-size:13px;font-weight:600}

    /* reveal */
    .score-big{font-size:clamp(64px,13vw,120px);font-weight:900;line-height:1;margin:6px 0 4px;color:#fff;
      text-shadow:0 0 40px var(--accent),0 0 90px var(--accent);animation:zoom .7s cubic-bezier(.2,1.4,.4,1) both}
    @keyframes zoom{from{transform:scale(.4);opacity:0}}
    .tier{display:inline-block;padding:6px 16px;border-radius:99px;font-size:13px;letter-spacing:.25em;text-transform:uppercase;font-weight:800;
      color:var(--accent);border:1px solid var(--accent);background:rgba(255,255,255,.05);margin-bottom:18px}
    .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:6px}
    canvas.confetti{position:absolute;inset:0;pointer-events:none;z-index:6}

    /* settings */
    .gear{position:absolute;top:18px;right:18px;z-index:10}
    .gear>button{width:44px;height:44px;border-radius:50%;cursor:pointer;border:1px solid rgba(255,255,255,.18);
      background:rgba(255,255,255,.08);color:#fff;font-size:20px;backdrop-filter:blur(10px);transition:transform .3s,background .2s}
    .gear>button:hover{background:rgba(255,255,255,.18);transform:rotate(60deg)}
    .menu{position:absolute;right:0;top:54px;width:270px;padding:16px;border-radius:16px;text-align:left;display:none;
      background:rgba(14,17,34,.92);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(18px);box-shadow:0 20px 50px rgba(0,0,0,.6)}
    .menu.open{display:block;animation:fade .2s ease both}
    .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;font-size:14px;color:#cfd6f5}
    .row+.row{border-top:1px solid rgba(255,255,255,.07)}
    .sw{position:relative;width:44px;height:24px;border-radius:99px;background:#2a2f4d;cursor:pointer;border:0;transition:background .2s}
    .sw:after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s}
    .sw.on{background:#8847ff}.sw.on:after{transform:translateX(20px)}
    select{background:#1b1f3a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 8px;font:inherit}
    .menu .btn{width:100%;margin-top:8px;padding:11px;font-size:12px}

    /* floating knop zodra origineel resultaat getoond wordt */
    .fab{position:fixed;right:20px;bottom:20px;z-index:2147483647;display:none;cursor:pointer;border:0;border-radius:99px;
      padding:12px 18px;font:700 13px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:.1em;color:#fff;
      background:linear-gradient(135deg,#8847ff,#d32ce6);box-shadow:0 8px 24px rgba(136,71,255,.5)}
    .fab.show{display:block}
    @media (max-width:640px){.panel{padding:24px 14px}.roulette{height:170px}.tile{height:130px}.tile b{font-size:28px}}
    @media (prefers-reduced-motion:reduce){.crate{animation:none}}
  `;

  const CRATE_SVG = `
    <svg class="crate" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4170"/><stop offset="1" stop-color="#151833"/></linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ff9f1a"/></linearGradient>
      </defs>
      <path d="M60 8 108 30v60L60 112 12 90V30z" fill="url(#g1)" stroke="#8847ff" stroke-width="2.5"/>
      <path d="M12 30 60 52l48-22M60 52v60" fill="none" stroke="#8847ff" stroke-width="2.5" opacity=".8"/>
      <rect x="50" y="60" width="20" height="26" rx="4" fill="url(#g2)"/>
      <circle cx="60" cy="71" r="3.5" fill="#1a1020"/>
      <path d="M60 8 108 30 60 52 12 30z" fill="#232853" stroke="#8847ff" stroke-width="2"/>
    </svg>`;

  class CrateUI {
    constructor(getScore) {
      this.getScore = getScore; // () => {percent}|null - leest "live" bij het openen
      this.state = 'locked';
      this.raf = 0;
      this.build();
    }

    $(sel) {
      return this.shadow.querySelector(sel);
    }

    build() {
      this.host = document.createElement('div');
      this.host.setAttribute('data-ss-crate', '');
      this.shadow = this.host.attachShadow({ mode: 'open' });
      const speedOpts = CONFIG.speeds
        .map((s) => `<option value="${s.value}">${s.label}</option>`)
        .join('');
      this.shadow.innerHTML = `
        <style>${STYLES}</style>
        <div class="root" part="root">
          <div class="grid"></div><div class="glow"></div>
          <div class="gear">
            <button class="gear-btn" title="Settings" aria-label="Settings">⚙</button>
            <div class="menu">
              <div class="row"><span>🔊 Sound effects</span><button class="sw" data-k="sound" aria-label="Sound"></button></div>
              <div class="row"><span>⚡ Animation speed</span><select data-k="speed">${speedOpts}</select></div>
              <button class="btn ghost" data-a="reopen">🔄 Reopen crate</button>
              <button class="btn ghost" data-a="original">👁 Show original results</button>
            </div>
          </div>
          <div class="panel">
            <div class="view v-locked active">
              ${CRATE_SVG}
              <div class="lock">🔒 SCORE LOCKED</div>
              <h1>Open your crate</h1>
              <p class="sub">Your result is sealed inside. Crack it open to reveal your score.</p>
              <button class="btn" data-a="open">Open crate</button>
            </div>
            <div class="view v-spin">
              <div class="eyebrow">Opening crate</div>
              <div class="roulette"><div class="strip"></div><div class="marker"></div></div>
              <div class="status">Rolling…</div>
            </div>
            <div class="view v-done">
              <div class="eyebrow">🎉 Crate opened!</div>
              <div class="score-big"></div>
              <div class="tier"></div>
              <div class="sub-line"></div>
              <div class="actions">
                <button class="btn" data-a="original">Show results</button>
                <button class="btn ghost" data-a="reopen">🔄 Reopen crate</button>
              </div>
            </div>
          </div>
        </div>
        <button class="fab" data-a="crate">🎁 CRATE</button>`;
      whenBodyReady(() => document.body.appendChild(this.host));

      this.root = this.$('.root');
      this.fab = this.$('.fab');
      this.shadow.addEventListener('click', (e) => this.onClick(e));
      this.shadow.addEventListener('change', (e) => {
        if (e.target.dataset.k === 'speed') Settings.set('speed', parseFloat(e.target.value));
      });
      this.syncSettings();
      this.lockScroll(true);
    }

    syncSettings() {
      this.$('.sw[data-k="sound"]').classList.toggle('on', !!Settings.data.sound);
      this.$('select[data-k="speed"]').value = String(Settings.data.speed);
    }

    lockScroll(on) {
      if (on) {
        this._prevOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      } else {
        document.documentElement.style.overflow = this._prevOverflow || '';
      }
    }

    show(view) {
      this.state = view;
      this.shadow.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      this.$('.v-' + view).classList.add('active');
    }

    onClick(e) {
      const kBtn = e.target.closest('[data-k="sound"]');
      if (kBtn) {
        Settings.set('sound', !Settings.data.sound);
        this.syncSettings();
        if (Settings.data.sound) Sound.tick();
        return;
      }
      if (e.target.closest('.gear-btn')) return this.$('.menu').classList.toggle('open');
      const a = e.target.closest('[data-a]');
      if (!a) return;
      const act = a.dataset.a;
      if (act === 'open') this.open();
      else if (act === 'reopen') this.reopen();
      else if (act === 'original') this.showOriginal();
      else if (act === 'crate') this.showCrate();
      if (act !== 'open') this.$('.menu').classList.remove('open');
    }

    /* ---- acties ---- */
    reopen() {
      cancelAnimationFrame(this.raf);
      this.clearConfetti();
      this.showCrate();
      this.show('locked');
    }

    showOriginal() {
      cancelAnimationFrame(this.raf);
      this.root.classList.add('hidden');
      this.fab.classList.add('show');
      this.lockScroll(false);
    }

    showCrate() {
      this.root.classList.remove('hidden');
      this.fab.classList.remove('show');
      this.lockScroll(true);
    }

    /* ---- roulette ---- */
    buildStrip(winner) {
      const { tileCount: n, winnerIndex: wi } = CONFIG;
      const items = [];
      for (let i = 0; i < n; i++) {
        let v;
        if (i === wi) v = winner;
        else {
          do {
            // Gewogen random: middelhoge scores vaker, extremen zeldzamer (net als in een echte case)
            v = Math.round(clamp(rand(0, 1) ** 0.8 * 100 + rand(-8, 8), 3, 100));
          } while (Math.abs(v - winner) < 1.5 && Math.abs(i - wi) < 3);
        }
        items.push(v);
      }
      const strip = this.$('.strip');
      strip.style.setProperty('--tw', CONFIG.tileWidth + 'px');
      strip.style.setProperty('--gap', CONFIG.tileGap + 'px');
      strip.innerHTML = items
        .map((v, i) => {
          const t = tierFor(v);
          return `<div class="tile${i === wi ? ' win' : ''}" style="--c:${t.color}"><b>${fmt(v)}</b><small>${t.name}</small></div>`;
        })
        .join('');
      return strip;
    }

    async open() {
      if (this.state === 'spinning') return;
      const found = this.getScore();
      if (!found) {
        this.$('.v-locked .sub').textContent =
          "Couldn't find your score on this page. Set CONFIG.scoreSelector in the userscript.";
        return;
      }
      Sound.ensure();
      this.state = 'spinning';
      this.show('spin');
      this.$('.status').textContent = 'Rolling…';
      this.$('.root').style.setProperty('--accent', '#8847ff');

      const strip = this.buildStrip(found.percent);
      const wrap = this.$('.roulette');
      const step = CONFIG.tileWidth + CONFIG.tileGap;
      const centre = wrap.clientWidth / 2;
      // Stopt op een willekeurige plek BINNEN de winnende tile (net als CS): marker ligt altijd erop.
      const target = CONFIG.winnerIndex * step + CONFIG.tileWidth / 2 + rand(-0.38, 0.38) * CONFIG.tileWidth - centre;
      const duration = CONFIG.spinBaseMs / Settings.data.speed;
      // Kleine overshoot-terugtrek aan het eind voor "echt" gevoel.
      const overshoot = rand(0.12, 0.3) * CONFIG.tileWidth;
      const peak = target + overshoot;
      const easeOut = (t) => 1 - Math.pow(1 - t, 4.2);
      let lastTick = -1;
      const t0 = performance.now();

      const frame = (now) => {
        const t = clamp((now - t0) / duration, 0, 1);
        let x;
        if (t < 0.93) x = peak * easeOut(t / 0.93);
        else {
          const k = (t - 0.93) / 0.07; // laatste 7%: zachte terugslag naar doel
          x = peak + (target - peak) * (1 - Math.pow(1 - k, 3));
        }
        strip.style.transform = `translate3d(${-x}px,0,0)`;
        const idx = Math.floor((x + centre) / step);
        if (idx !== lastTick) {
          if (lastTick !== -1) Sound.tick();
          lastTick = idx;
        }
        if (t < 1) this.raf = requestAnimationFrame(frame);
        else this.finish(found.percent);
      };
      this.raf = requestAnimationFrame(frame);
    }

    finish(percent) {
      const tier = tierFor(percent);
      this.$('.status').textContent = 'Unboxing…';
      const win = this.$('.tile.win');
      win.classList.add('lit');
      this.$('.root').style.setProperty('--accent', tier.color);
      Sound.win();
      setTimeout(() => {
        this.$('.score-big').textContent = fmt(percent);
        this.$('.tier').textContent = tier.name;
        this.$('.sub-line').innerHTML = '<p class="sub">Your score</p>';
        this.show('done');
        this.confetti(tier.color);
        this.state = 'revealed';
      }, 1300);
    }

    /* ---- confetti (lichte canvas-animatie) ---- */
    confetti(color) {
      this.clearConfetti();
      const cv = document.createElement('canvas');
      cv.className = 'confetti';
      this.root.appendChild(cv);
      const ctx = cv.getContext('2d');
      const W = (cv.width = this.root.clientWidth);
      const H = (cv.height = this.root.clientHeight);
      const palette = [color, '#ffe27a', '#ffffff', '#d32ce6', '#4b69ff'];
      const parts = Array.from({ length: 140 }, () => ({
        x: W / 2,
        y: H * 0.45,
        vx: rand(-9, 9),
        vy: rand(-16, -4),
        s: rand(5, 10),
        r: rand(0, 6),
        vr: rand(-0.3, 0.3),
        c: palette[(Math.random() * palette.length) | 0],
      }));
      let frames = 0;
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        parts.forEach((p) => {
          p.vy += 0.35;
          p.x += p.vx;
          p.y += p.vy;
          p.r += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          ctx.restore();
        });
        if (++frames < 200 && cv.isConnected) this.confettiRaf = requestAnimationFrame(tick);
        else cv.remove();
      };
      tick();
    }

    clearConfetti() {
      cancelAnimationFrame(this.confettiRaf);
      this.shadow.querySelectorAll('canvas.confetti').forEach((c) => c.remove());
    }
  }

  /* ======================================================================
   * 8. Boot
   * ==================================================================== */
  function boot() {
    if (CONFIG.urlPattern && !CONFIG.urlPattern.test(location.href)) return;
    if (window.top !== window.self) return; // niet in iframes
    Settings.load();
    PendingGuard.on();

    whenBodyReady(async () => {
      const first = await ScoreDetector.wait();
      if (!first) {
        log('Geen score gevonden - pagina blijft ongewijzigd. Stel CONFIG.scoreSelector in als dit een resultatenpagina is.');
        PendingGuard.off();
        return;
      }
      log('Score gevonden:', first.percent, `(via ${first.via})`, first.el);
      let latest = first;
      // Bij het openen opnieuw lezen, zodat een late DOM-update de juiste waarde geeft.
      const ui = new CrateUI(() => {
        const r = ScoreDetector.detect();
        if (r) latest = r;
        return latest;
      });
      void ui;
      PendingGuard.off();
    });
  }

  boot();
})();
