// ==UserScript==
// @name         Smartschool CS:GO Crate Opener
// @namespace    https://github.com/kobejanssen26-wq/vynra
// @version      2.0.0
// @description  CS:GO-style crate opening animation for Smartschool results
// @author       Vynra
// @match        https://*.smartschool.be/*
// @match        https://*.smartschool.nl/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/*
 * INSTALLATIE
 *   1. Installeer Tampermonkey, maak een nieuw script en plak dit bestand erin
 *      (of open de "raw" URL van dit bestand: Tampermonkey biedt dan zelf Install aan).
 *   2. Controleer dat de @match-regels hierboven overeenkomen met jouw Smartschool-URL.
 *      Staat je URL er niet bij? Voeg een regel toe, bv.  // @match  https://jouwdomein.nl/resultaat/*
 *   3. Het script doet niets, behalve op de Resultaten-pagina (Ga naar -> Resultaten).
 *      Worden jouw resultaten niet goed gelezen? Vul CONFIG.rowSelector /
 *      scoreInRowSelector / titleInRowSelector in (rechtsklik -> Inspect). Zie CONFIG.
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
    // Herkenning van de Resultaten-pagina (domein-onafhankelijk): pad/hash/zoekopdracht OF een kop "Resultaten".
    resultsUrlPattern: /\/results(?:\/|$|\?|#)|\/skore|resultaten/i,
    resultsHeading: /^(resultaten|results)$/i,

    // Optionele overrides als de automatische uitlezing bij jouw school niet klopt:
    rowSelector: '', // bv. 'table.results tr' - een rij per resultaat
    scoreInRowSelector: '', // bv. 'td.score' (binnen de rij)
    titleInRowSelector: '', // bv. 'td.name' (binnen de rij)
    scoreCellSelector: '', // alternatief: selector die enkel de score-elementen pakt


    // Elementen waar we NIET in zoeken (navigatie, voetnoot, onze eigen UI, ...).
    ignoreSelector: 'script,style,noscript,nav,footer,header nav,[aria-hidden="true"],progress,[role="progressbar"]',

    debounceMs: 300, // wachttijd na DOM-wijzigingen voor we opnieuw controleren
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
   * 3. Pagina-herkenning: ALLEEN de Resultaten-pagina (SPA-proof)
   * ==================================================================== */
  const PageGate = {
    /** Pre-hide alleen als de URL er al op wijst - voorkomt een flits van de echte scores. */
    urlLooksLikeResults() {
      return CONFIG.resultsUrlPattern.test(location.pathname + location.hash + location.search);
    },
    /** Zichtbare kop "Resultaten" in de pagina-inhoud (niet in het navigatiemenu). */
    hasResultsHeading() {
      const heads = document.querySelectorAll('h1,h2,h3,[class*="title" i],[class*="heading" i]');
      return Array.from(heads).some(
        (h) =>
          !h.closest(CONFIG.ignoreSelector + ',[data-ss-crate]') &&
          CONFIG.resultsHeading.test((h.textContent || '').trim()) &&
          h.getClientRects().length > 0
      );
    },
    isResultsPage() {
      return this.urlLooksLikeResults() || this.hasResultsHeading();
    },
  };

  const PendingGuard = {
    on() {
      if (!document.documentElement) return setTimeout(() => this.on(), 5);
      if (document.getElementById('ss-crate-pending-style')) return;
      const s = document.createElement('style');
      s.id = 'ss-crate-pending-style';
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
   * 4. Resultaten uitlezen uit de bestaande DOM (nooit random)
   * ==================================================================== */
  const ResultsScanner = {
    PCT: /^\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%\s*$/,
    FRAC: /^\s*(\d{1,4}(?:[.,]\d+)?)\s*(?:\/|van de|van|out of|uit)\s*(\d{1,4}(?:[.,]\d+)?)\s*$/i,
    num: (s) => parseFloat(String(s).replace(',', '.')),

    /** "78%" of "15/20" -> {percent, kind} ; strikt, de hele celtekst moet de score zijn. */
    parseScore(text) {
      const t = (text || '').replace(/ /g, ' ').trim();
      if (!t || t.length > 20) return null;
      let m = t.match(this.PCT);
      if (m) {
        const v = this.num(m[1]);
        return v <= 100 ? { percent: v, kind: 'pct' } : null;
      }
      m = t.match(this.FRAC);
      if (m) {
        const a = this.num(m[1]);
        const b = this.num(m[2]);
        if (b > 0 && a >= 0 && a <= b) return { percent: Math.round((a / b) * 1000) / 10, kind: 'frac' };
      }
      return null;
    },

    visible(el) {
      return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    },

    /** Alle "scorecellen": kleine elementen waarvan de volledige tekst een score is. */
    scoreCells() {
      const out = [];
      const all = CONFIG.scoreCellSelector
        ? document.querySelectorAll(CONFIG.scoreCellSelector)
        : document.body.querySelectorAll('*');
      for (const el of all) {
        if (el.children.length > 2 || el.closest(CONFIG.ignoreSelector + ',[data-ss-crate]')) continue;
        const text = el.textContent;
        if (!text || text.length > 20) continue;
        // Alleen het diepste element dat de tekst bevat (geen dubbele telling van wrappers)
        if (el.children.length === 1 && el.firstElementChild.textContent === text) continue;
        const sc = this.parseScore(text);
        if (sc && this.visible(el)) out.push({ el, text: text.trim(), ...sc });
      }
      return out;
    },

    /** Bepaal de "rij" waar een scorecel bij hoort (tr/li/kaart). */
    rowFor(cell, cells) {
      const sem = cell.el.closest('tr,li,[role="row"],[role="listitem"]');
      if (sem && !sem.matches('body,main')) return sem;
      let row = cell.el;
      for (let i = 0; i < 5 && row.parentElement; i++) {
        const p = row.parentElement;
        if (p.matches('body,main,form,[role="main"]')) break;
        if (cells.filter((c) => p.contains(c.el)).length > 1) break;
        row = p;
      }
      return row;
    },

    /** Titel/vak/toets uit de tekst van de rij halen (zonder de score zelf). */
    labels(row, scoreEls) {
      const parts = [];
      const w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue.replace(/\s+/g, ' ').trim();
        if (!t || scoreEls.some((s) => s.contains(n))) continue;
        if (this.parseScore(t) || /^[-–—•|:]+$/.test(t)) continue;
        if (!parts.includes(t)) parts.push(t);
      }
      return parts;
    },

    scan() {
      if (CONFIG.rowSelector) return this.scanCustom();
      const cells = this.scoreCells();
      const rows = new Map();
      for (const c of cells) {
        const row = this.rowFor(c, cells);
        if (!rows.has(row)) rows.set(row, []);
        rows.get(row).push(c);
      }
      const results = [];
      rows.forEach((group, row) => {
        // Voorkeur: breuk (bv. 15/20), anders percentage - beide leveren hetzelfde percentage.
        const main = group.find((g) => g.kind === 'frac') || group[0];
        const parts = this.labels(row, group.map((g) => g.el));
        const title = parts[0] || 'Result';
        results.push({
          title,
          subtitle: parts.slice(1, 3).join(' · '),
          percent: main.percent,
          raw: main.text,
          el: row,
        });
      });
      results.forEach((r, i) => (r.id = `${i}|${r.title}|${r.raw}`));
      return results;
    },

    /** Optioneel: eigen selectors (CONFIG.rowSelector + scoreInRowSelector + titleInRowSelector). */
    scanCustom() {
      return Array.from(document.querySelectorAll(CONFIG.rowSelector))
        .map((row, i) => {
          const sEl = CONFIG.scoreInRowSelector ? row.querySelector(CONFIG.scoreInRowSelector) : row;
          const sc = sEl && this.parseScore(sEl.textContent.trim());
          if (!sc) return null;
          const tEl = CONFIG.titleInRowSelector && row.querySelector(CONFIG.titleInRowSelector);
          const title = (tEl ? tEl.textContent : this.labels(row, [sEl])[0] || 'Result').trim();
          return { id: `${i}|${title}|${sEl.textContent.trim()}`, title, subtitle: '', percent: sc.percent, raw: sEl.textContent.trim(), el: row };
        })
        .filter(Boolean);
    },

    signature: (list) => list.map((r) => r.id).join('\n'),
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
    .list{display:grid;gap:10px;max-height:min(46vh,420px);overflow:auto;padding:4px;margin:6px 0 18px;text-align:left}
    .card{text-align:left;display:flex;align-items:center;gap:14px;cursor:pointer;font:inherit;color:#e8ecf8;padding:14px 18px;border-radius:14px;
      background:linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.12);
      border-left:4px solid var(--c);transition:transform .15s,background .15s,box-shadow .15s}
    .card:hover{transform:translateX(4px);background:rgba(255,255,255,.12);box-shadow:0 0 24px color-mix(in srgb,var(--c) 40%,transparent)}
    .card .ico{font-size:22px}
    .card .txt{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
    .card .txt b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .card .txt small{color:#8d97c4;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
    .card .val{font-size:22px;font-weight:800;color:var(--c)}
    .card:not(.done) .val{opacity:.6;letter-spacing:.1em}
    .done-title{margin-top:4px;font-size:18px;font-weight:700;color:#cfd6f5}
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
    constructor(results, rescan) {
      this.results = results;
      this.rescan = rescan; // () => results[] - leest "live" opnieuw bij het openen
      this.current = null;
      this.opened = new Set();
      this.state = 'pick';
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
            <div class="view v-pick active">
              <div class="eyebrow">Smartschool · Results</div>
              <h1>Choose a crate</h1>
              <p class="sub">Every result is sealed in its own crate. <span class="pick-count"></span></p>
              <div class="list"></div>
              <div class="actions"><button class="btn ghost" data-a="original">👁 Show original results</button></div>
            </div>
            <div class="view v-locked">
              ${CRATE_SVG}
              <div class="lock">🔒 SCORE LOCKED</div>
              <h1 class="crate-title">Open your crate</h1>
              <p class="sub crate-sub"></p>
              <div class="actions">
                <button class="btn" data-a="open">Open crate</button>
                <button class="btn ghost" data-a="back">← All results</button>
              </div>
            </div>
            <div class="view v-spin">
              <div class="eyebrow">Opening crate</div>
              <div class="roulette"><div class="strip"></div><div class="marker"></div></div>
              <div class="status">Rolling…</div>
            </div>
            <div class="view v-done">
              <div class="eyebrow">🎉 Crate opened!</div>
              <div class="done-title"></div>
              <div class="score-big"></div>
              <div class="tier"></div>
              <div class="sub-line"></div>
              <div class="actions">
                <button class="btn" data-a="back">Open another crate</button>
                <button class="btn ghost" data-a="original">Show original results</button>
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
      this.renderList();
      this.lockScroll(true);
    }

    destroy() {
      cancelAnimationFrame(this.raf);
      cancelAnimationFrame(this.confettiRaf);
      this.lockScroll(false);
      this.host.remove();
    }

    setResults(results) {
      this.results = results;
      if (this.current && !results.some((r) => r.id === this.current.id)) this.current = null;
      this.renderList();
    }

    renderList() {
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      this.$('.list').innerHTML = this.results
        .map((r, i) => {
          const done = this.opened.has(r.id);
          const t = tierFor(r.percent);
          return `<button class="card${done ? ' done' : ''}" data-a="choose" data-i="${i}" style="--c:${done ? t.color : '#8847ff'}">
            <span class="ico">${done ? '🔓' : '🔒'}</span>
            <span class="txt"><b>${esc(r.title)}</b><small>${esc(r.subtitle || (done ? tier(r) : 'Sealed crate'))}</small></span>
            <span class="val">${done ? fmt(r.percent) : '???'}</span>
          </button>`;
        })
        .join('');
      const n = this.results.length;
      this.$('.pick-count').textContent = `${this.opened.size} / ${n} opened`;
      function tier(r) { return tierFor(r.percent).name; }
    }

    choose(i) {
      this.current = this.results[i];
      this.$('.crate-title').textContent = this.current.title;
      this.$('.crate-sub').textContent = this.current.subtitle || 'Crack it open to reveal your score.';
      this.show('locked');
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
      else if (act === 'choose') this.choose(+a.dataset.i);
      else if (act === 'back') this.backToList();
      if (act !== 'open') this.$('.menu').classList.remove('open');
    }

    /* ---- acties ---- */
    backToList() {
      cancelAnimationFrame(this.raf);
      this.clearConfetti();
      this.root.style.setProperty('--accent', '#8847ff');
      this.renderList();
      this.show('pick');
    }

    reopen() {
      cancelAnimationFrame(this.raf);
      this.clearConfetti();
      this.showCrate();
      if (this.current) this.show('locked');
      else this.backToList();
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
      if (!this.current) return this.backToList();
      // Opnieuw uit de pagina lezen, zodat de échte (actuele) score gebruikt wordt.
      const live = this.rescan().find((r) => r.id === this.current.id);
      const found = live || this.current;
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
      this.opened.add(this.current.id);
      this.$('.status').textContent = 'Unboxing…';
      const win = this.$('.tile.win');
      win.classList.add('lit');
      this.$('.root').style.setProperty('--accent', tier.color);
      Sound.win();
      setTimeout(() => {
        this.$('.score-big').textContent = fmt(percent);
        this.$('.tier').textContent = tier.name;
        this.$('.done-title').textContent = this.current.title;
        const raw = this.current.raw;
        this.$('.sub-line').innerHTML = '<p class="sub"></p>';
        this.$('.sub-line .sub').textContent = 'Your score' + (raw && raw !== fmt(percent) ? ` (${raw})` : '');
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
   * 8. Boot + SPA-navigatie: UI verschijnt alleen op de Resultaten-pagina
   * ==================================================================== */
  const App = {
    ui: null,
    timer: 0,

    start() {
      if (window.top !== window.self) return; // niet in iframes
      Settings.load();
      if (PageGate.urlLooksLikeResults()) PendingGuard.on();

      // History-API haken (pushState/replaceState vuren geen event af)
      ['pushState', 'replaceState'].forEach((fn) => {
        const orig = history[fn];
        history[fn] = function () {
          const r = orig.apply(this, arguments);
          App.schedule();
          return r;
        };
      });
      window.addEventListener('popstate', () => this.schedule());
      window.addEventListener('hashchange', () => this.schedule());
      whenBodyReady(() => {
        // Smartschool laadt delen van de pagina dynamisch -> DOM observeren
        new MutationObserver((muts) => {
          if (muts.every((m) => m.target.closest && m.target.closest('[data-ss-crate]'))) return;
          this.schedule();
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
        this.schedule(0);
      });
      // Vangnet: nooit blijvend verborgen
      setTimeout(() => PendingGuard.off(), CONFIG.failSafeRevealMs);
    },

    schedule(delay = CONFIG.debounceMs) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.check(), delay);
    },

    check() {
      const onResults = PageGate.isResultsPage();
      if (!onResults) {
        if (this.ui) this.unmount();
        PendingGuard.off();
        return;
      }
      const results = ResultsScanner.scan();
      if (!results.length) {
        // Resultaten zijn mogelijk nog aan het laden; pagina blijft normaal zichtbaar.
        PendingGuard.off();
        return;
      }
      if (this.ui) {
        // Al gemount: alleen de lijst verversen als de resultaten echt veranderd zijn
        if (ResultsScanner.signature(results) !== this.sig) {
          this.sig = ResultsScanner.signature(results);
          this.ui.setResults(results);
        }
        return;
      }
      this.sig = ResultsScanner.signature(results);
      log('Resultaten-pagina gedetecteerd:', results.map((r) => `${r.title} ${r.raw}`));
      this.ui = new CrateUI(results, () => ResultsScanner.scan());
      PendingGuard.off();
    },

    unmount() {
      this.ui.destroy();
      this.ui = null;
      this.sig = '';
    },
  };

  App.start();
})();
