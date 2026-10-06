// ==UserScript==
// @name         Smartschool CS:GO Crate Opener
// @namespace    https://github.com/kobejanssen26-wq/vynra
// @version      3.1.0
// @description  CS:GO-style crate opening animation for Smartschool results
// @author       Vynra
// @updateURL    https://raw.githubusercontent.com/kobejanssen26-wq/Vynra/claude/sweet-gates-k915fg/userscripts/smartschool-crate-opener.user.js
// @downloadURL  https://raw.githubusercontent.com/kobejanssen26-wq/Vynra/claude/sweet-gates-k915fg/userscripts/smartschool-crate-opener.user.js
// @match        https://*.smartschool.be/*
// @match        https://*.smartschool.nl/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/*
 * Elke toets/taak op de Resultaten-pagina krijgt een EIGEN kleine crate (inline, naast de kaart).
 * De echte score van dat resultaat blijft verborgen tot je die crate opent.
 * Alles wordt uit de bestaande pagina gelezen; er wordt niets verzonnen en niets verwijderd.
 * Buiten de Resultaten-pagina doet het script niets.
 */

(function () {
  'use strict';

  // ===== 1. CONFIG =====
  const CONFIG = {
    // Herkenning van de Resultaten-pagina (domein-onafhankelijk): pad/hash/zoekopdracht OF een kop "Resultaten".
    resultsUrlPattern: /\/results(?:\/|$|\?|#)|\/skore|resultaten/i,
    resultsHeading: /^(resultaten|results)$/i,

    // Optionele overrides als de automatische uitlezing bij jouw school niet klopt:
    rowSelector: '', // bv. 'table.results tr' - een rij per resultaat
    scoreInRowSelector: '', // bv. 'td.score' (binnen de rij)
    titleInRowSelector: '', // bv. 'td.name' (binnen de rij)
    subjectSelector: '', // optioneel: element (binnen de rij) met de vaknaam
    scoreCellSelector: '', // alternatief: selector die enkel de score-elementen pakt

    ignoreSelector: 'script,style,noscript',
    menuSelector: 'nav,header,[role="navigation"],[role="menubar"],[class*="topnav" i],[class*="navbar" i]',

    debounceMs: 300,
    failSafeRevealMs: 4000,

    spinBaseMs: 5200, // duur bij snelheid 1x
    tileWidth: 52,
    tileGap: 8,
    tileCount: 48,
    winnerIndex: 38,

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

  // ===== 2. Utils =====
  const log = (...a) => console.log('[Crate Opener]', ...a);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const tierFor = (p) => CONFIG.tiers.find((t) => p >= t.min) || CONFIG.tiers[CONFIG.tiers.length - 1];
  const fmt = (p) => (Number.isInteger(p) ? String(p) : p.toFixed(1)) + '%';
  const nl = (n) => String(n).replace('.', ',');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const keyOf = (r) => `${r.title}|${r.raw}`;

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

  // ===== 3. Pagina-herkenning: ALLEEN de Resultaten-pagina (SPA-proof) =====
  const PageGate = {
    urlLooksLikeResults() {
      return CONFIG.resultsUrlPattern.test(location.pathname + location.hash + location.search);
    },
    hasResultsHeading() {
      const heads = document.querySelectorAll('h1,h2,h3,[class*="title" i],[class*="heading" i]');
      return Array.from(heads).some(
        (h) =>
          !h.closest(CONFIG.ignoreSelector + ',' + CONFIG.menuSelector + ',[data-ss-crate]') &&
          CONFIG.resultsHeading.test((h.textContent || '').trim()) &&
          h.getClientRects().length > 0
      );
    },
    isResultsPage() {
      return this.urlLooksLikeResults() || this.hasResultsHeading();
    },
  };

  /** Voorkomt dat de echte scores even zichtbaar zijn voordat de crates er staan. */
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

  // ===== 4. Resultaten uitlezen uit de bestaande DOM (nooit random) =====
  const ResultsScanner = {
    PCT: /^\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%\s*$/,
    FRAC: /^\s*(\d{1,4}(?:[.,]\d+)?)\s*(?:\/|van de|van|out of|uit)\s*(\d{1,4}(?:[.,]\d+)?)\s*$/i,
    num: (s) => parseFloat(String(s).replace(',', '.')),

    parseScore(text) {
      const t = (text || '').replace(/\u00a0/g, ' ').trim();
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
        if (b > 0 && a >= 0 && a <= b) return { percent: Math.round((a / b) * 1000) / 10, kind: 'frac', got: a, max: b };
      }
      return null;
    },

    visible(el) {
      return el.getClientRects().length > 0;
    },

    scoreCells() {
      const out = [];
      const all = CONFIG.scoreCellSelector
        ? document.querySelectorAll(CONFIG.scoreCellSelector)
        : document.body.querySelectorAll('*');
      for (const el of all) {
        if (el.children.length > 2 || el.closest(CONFIG.ignoreSelector + ',[data-ss-crate]')) continue;
        const text = el.textContent;
        if (!text || text.length > 20) continue;
        if (el.children.length === 1 && el.firstElementChild.textContent === text) continue;
        const sc = this.parseScore(text);
        if (sc && this.visible(el)) out.push({ el, text: text.trim(), ...sc });
      }
      return out;
    },

    /** Klim omhoog zolang de ouder nog maar EEN percentage en EEN breuk bevat (= een resultaat). */
    rowFor(cell, cells) {
      let row = cell.el;
      for (let i = 0; i < 40 && row.parentElement; i++) {
        const p = row.parentElement;
        if (p.matches('body,main,form,[role="main"]') || (p.textContent || '').length > 500) break;
        if (p.querySelector(CONFIG.menuSelector)) break;
        const inside = cells.filter((c) => p.contains(c.el));
        if (inside.filter((c) => c.kind === 'pct').length > 1 || inside.filter((c) => c.kind === 'frac').length > 1) break;
        row = p;
      }
      return row;
    },

    /** Tekstdelen van een rij (zonder de score zelf): [{t, el}] */
    labels(row, scoreEls) {
      const parts = [];
      const w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue.replace(/\s+/g, ' ').trim();
        if (!t || scoreEls.some((s) => s.contains(n))) continue;
        if (this.parseScore(t) || /^[-\u2013\u2014\u2022|:]+$/.test(t)) continue;
        if (/^(details|detail)$/i.test(t) || parts.some((p) => p.t === t)) continue;
        parts.push({ t, el: n.parentElement });
      }
      return parts;
    },

    subjectOf(row, texts, title) {
      if (CONFIG.subjectSelector) {
        const el = row.querySelector(CONFIG.subjectSelector);
        if (el) return el.textContent.replace(/\s+/g, ' ').trim();
      }
      const dateRe = /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b|\d{1,2}[\/.-]\d{1,2}/i;
      const part = texts.find((t) => t !== title && !dateRe.test(t) && / - /.test(t));
      if (!part) return '';
      let v = part.split(' - ')[0].trim();
      if (v.length > 3 && v === v.toUpperCase()) v = v.charAt(0) + v.slice(1).toLowerCase();
      return v;
    },

    /** Alle resultaten op de pagina: [{key,title,subject,percent,raw,got,max,el,cells,titleEl}] */
    scan() {
      if (CONFIG.rowSelector) return this.scanCustom();
      const cells = this.scoreCells();
      const rows = new Map();
      for (const c of cells) {
        const row = this.rowFor(c, cells);
        if (!rows.has(row)) rows.set(row, []);
        rows.get(row).push(c);
      }
      const out = [];
      rows.forEach((group, row) => {
        const pct = group.find((g) => g.kind === 'pct');
        const frac = group.find((g) => g.kind === 'frac');
        const parts = this.labels(row, group.map((g) => g.el));
        const generic = /^(details?|resultaten|results|vak|vakken)$/i;
        const head = Array.from(row.querySelectorAll('h1,h2,h3,h4,[class*="title" i],[class*="name" i]')).find((h) => {
          const t = h.textContent.replace(/\s+/g, ' ').trim();
          return t.length > 2 && !generic.test(t) && !group.some((g) => h.contains(g.el) || g.el.contains(h));
        });
        const headOk = !!head;
        const headText = headOk ? head.textContent.replace(/\s+/g, ' ').trim() : '';
        let title;
        let titleEl;
        let rest;
        if (headText) {
          title = headText;
          titleEl = head;
          rest = parts.filter((p) => !head.contains(p.el));
        } else {
          rest = parts.slice();
          const first = rest.shift();
          title = first ? first.t : 'Result';
          titleEl = first ? first.el : null;
        }
        const texts = rest.map((p) => p.t);
        const r = {
          title,
          subject: this.subjectOf(row, texts, title),
          subtitle: texts.slice(0, 2).join(' \u00b7 '),
          percent: (pct || frac).percent,
          raw: (frac || pct).text,
          got: frac && frac.got,
          max: frac && frac.max,
          el: row,
          cells: group.map((g) => g.el),
          titleEl,
        };
        r.key = keyOf(r);
        out.push(r);
      });
      return out;
    },

    scanCustom() {
      return Array.from(document.querySelectorAll(CONFIG.rowSelector))
        .map((row) => {
          const sEl = CONFIG.scoreInRowSelector ? row.querySelector(CONFIG.scoreInRowSelector) : row;
          const sc = sEl && this.parseScore(sEl.textContent.trim());
          if (!sc) return null;
          const tEl = CONFIG.titleInRowSelector && row.querySelector(CONFIG.titleInRowSelector);
          const title = (tEl ? tEl.textContent : (this.labels(row, [sEl])[0] || { t: 'Result' }).t).trim();
          const raw = sEl.textContent.trim();
          const r = {
            title,
            subject: this.subjectOf(row, [], title),
            subtitle: '',
            percent: sc.percent,
            raw,
            got: sc.got,
            max: sc.max,
            el: row,
            cells: [sEl],
            titleEl: tEl || null,
          };
          r.key = keyOf(r);
          return r;
        })
        .filter(Boolean);
    },

    /** Welke elementen moeten verborgen worden (cirkel + percentage + breuk), zonder titel/datum. */
    hideTargets(r) {
      const set = new Set();
      r.cells.forEach((c) => {
        let t = c;
        while (t.parentElement && t.parentElement !== r.el && !(r.titleEl && t.parentElement.contains(r.titleEl))) {
          t = t.parentElement;
        }
        set.add(t);
      });
      return Array.from(set);
    },
  };

  // ===== 5. Onthoud echte resultaten (voor de roulette; nooit verzonnen) =====
  const Store = {
    key: 'ssCrateOpener.seen.v2',
    cache: null,
    all() {
      if (!this.cache) {
        try {
          this.cache = JSON.parse(localStorage.getItem(this.key) || '[]');
        } catch (_) {
          this.cache = [];
        }
      }
      return this.cache;
    },
    add(results) {
      const list = this.all();
      let changed = false;
      results.forEach((r) => {
        if (list.some((x) => x.k === r.key)) return;
        list.push({ k: r.key, title: r.title, percent: r.percent, raw: r.raw });
        changed = true;
      });
      if (!changed) return;
      if (list.length > 300) list.splice(0, list.length - 300);
      try {
        localStorage.setItem(this.key, JSON.stringify(list));
      } catch (_) {}
    },
    others(key) {
      return this.all().filter((x) => x.k !== key);
    },
  };

  /** Welke crates al open zijn (blijft bewaard tijdens dit browsertabblad). */
  const Opened = {
    key: 'ssCrateOpener.opened.v1',
    set: null,
    load() {
      if (!this.set) {
        try {
          this.set = new Set(JSON.parse(sessionStorage.getItem(this.key) || '[]'));
        } catch (_) {
          this.set = new Set();
        }
      }
      return this.set;
    },
    has(k) {
      return this.load().has(k);
    },
    add(k) {
      this.load().add(k);
      this.save();
    },
    remove(k) {
      this.load().delete(k);
      this.save();
    },
    save() {
      try {
        sessionStorage.setItem(this.key, JSON.stringify(Array.from(this.set)));
      } catch (_) {}
    },
  };

  // ===== 6. Instellingen =====
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

  // ===== 7. Geluid (WebAudio; standaard uit) =====
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

  // ===== 8. Crate-overlay (Shadow DOM, per resultaat): ligt BOVEN de kaart en raakt Smartschool's HTML niet aan =====
  const WIDGET_CSS = `
    *{box-sizing:border-box}
    .crate{position:absolute;inset:0;display:flex;align-items:center;gap:14px;padding:8px 14px;border-radius:10px;
      color:#e8ecf8;font-family:'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;overflow:hidden;pointer-events:none;
      background:linear-gradient(180deg,#1c2230,#10141c);border:1px solid rgba(255,255,255,.08);
      box-shadow:0 6px 18px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.06)}
    .crate:not(.wide){flex-direction:column;justify-content:center;gap:6px;text-align:center}
    .crate:not(.wide) .info{display:none}
    .info{flex:1;min-width:0;text-align:left}
    .info b{display:block;font-size:17px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
    .info small{display:block;margin-top:3px;font-size:11px;color:#8d97c4;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mid{flex:0 0 min(300px,52%);min-width:0;text-align:center}
    .crate:not(.wide) .mid{flex:none;width:min(310px,100%)}
    .label{font-size:9.5px;letter-spacing:.28em;font-weight:800;color:#8d97c4;text-transform:uppercase}
    .window{position:relative;margin-top:5px;width:100%;height:56px;overflow:hidden;border-radius:9px;background:#0b0e14;border:1px solid rgba(255,255,255,.12)}
    .window:before,.window:after{content:'';position:absolute;top:0;bottom:0;width:20%;z-index:2;pointer-events:none}
    .window:before{left:0;background:linear-gradient(90deg,#0b0e14,transparent)}
    .window:after{right:0;background:linear-gradient(270deg,#0b0e14,transparent)}
    .strip{position:absolute;top:0;left:0;height:100%;display:flex;align-items:center;gap:var(--gap);padding-left:6px;will-change:transform}
    .tile{flex:0 0 var(--tw);height:42px;border-radius:7px;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(180deg,#323a4b,#232937);border-bottom:3px solid var(--c);
      font-weight:800;font-size:13px;color:#fff;text-shadow:0 0 10px var(--c)}
    .tile.win.lit{box-shadow:0 0 0 2px var(--c),0 0 18px var(--c)}
    .marker{position:absolute;top:0;bottom:0;left:50%;width:3px;margin-left:-1.5px;z-index:3;border-radius:2px;
      background:linear-gradient(180deg,#ffe27a,#ff9f1a);box-shadow:0 0 10px #ffb22e}
    .btn,.chip{pointer-events:auto;cursor:pointer;border:1px solid rgba(255,255,255,.28);border-radius:8px;padding:7px 13px;
      font:800 10.5px/1 'Segoe UI',system-ui,sans-serif;letter-spacing:.13em;text-transform:uppercase;color:#fff;background:rgba(255,255,255,.1);white-space:nowrap}
    .btn:hover:not([disabled]){background:rgba(255,255,255,.2)}
    .btn.go{border-color:#ffd25e;color:#ffe9a8;background:rgba(255,200,70,.14)}
    .btn[disabled]{cursor:default;color:#ffe9a8;border-color:#ffd25e}
    .side{flex:0 0 auto}
    .rv{flex:1;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;animation:pop .5s cubic-bezier(.2,1.4,.4,1) both}
    @keyframes pop{from{transform:scale(.85);opacity:0}}
    .subj{padding:4px 12px;border-radius:99px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;background:linear-gradient(135deg,#8847ff,#d32ce6);color:#fff}
    .subj:empty{display:none}
    .rt{font-size:15px;font-weight:700;color:#cfd6f5;max-width:40%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pts{font-size:22px;font-weight:800}
    .pct{font-size:30px;font-weight:900;color:#fff;text-shadow:0 0 18px var(--c)}
    .tier{font-size:10px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--c);border:1px solid var(--c);padding:3px 9px;border-radius:99px}
    .crate.done{border-color:var(--c);box-shadow:0 0 22px color-mix(in srgb,var(--c) 40%,transparent),0 6px 18px rgba(0,0,0,.28)}
    .crate.chipmode{display:block;padding:0;background:none;border:0;box-shadow:none}
    .chip{width:100%;height:100%;padding:0 8px;background:rgba(16,20,28,.92);border-color:rgba(255,255,255,.25)}
  `;

  class CrateWidget {
    constructor(r, manager) {
      this.m = manager;
      this.r = r;
      this.key = r.key;
      this.state = 'idle';
      this.raf = 0;
      this.timer = 0;
      this.wide = false;
      this.scrollers = null;
      this.host = document.createElement('div');
      this.host.setAttribute('data-ss-crate', '');
      this.host.style.cssText = 'position:fixed;left:0;top:0;display:none;pointer-events:none;';
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.shadow.addEventListener('click', (e) => this.onClick(e));
      manager.layer.appendChild(this.host);
      if (Opened.has(this.key)) this.showChip();
      else this.showIdle();
    }

    $(s) {
      return this.shadow.querySelector(s);
    }

    update(r) {
      this.r = r;
    }

    // ---- positie: volgt de kaart (ook bij scrollen) en wordt bijgesneden door scrollcontainers ----
    region() {
      const rect = this.r.el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;
      if (rect.height <= 260) return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      // Groot paneel (detail): alleen het scoregebied (cirkel) afdekken
      const ts = ResultsScanner.hideTargets(this.r)
        .map((t) => t.getBoundingClientRect())
        .filter((b) => b.width > 0);
      if (!ts.length) return null;
      const l = Math.min(...ts.map((b) => b.left)) - 8;
      const t = Math.min(...ts.map((b) => b.top)) - 8;
      const rr = Math.max(...ts.map((b) => b.right)) + 8;
      const bb = Math.max(...ts.map((b) => b.bottom)) + 8;
      return { x: l, y: t, w: Math.min(Math.max(rr - l, 340), 440), h: Math.max(bb - t, 170) };
    }

    getScrollers() {
      if (this.scrollersFor !== this.r.el) {
        const list = [];
        let n = this.r.el.parentElement;
        while (n && n !== document.body && n !== document.documentElement) {
          const cs = getComputedStyle(n);
          if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) list.push(n);
          n = n.parentElement;
        }
        this.scrollers = list;
        this.scrollersFor = this.r.el;
      }
      return this.scrollers;
    }

    position() {
      const st = this.host.style;
      if (this.m.originalMode || !this.r.el.isConnected) {
        st.display = 'none';
        return;
      }
      const reg = this.region();
      if (!reg) {
        st.display = 'none';
        return;
      }
      let box = reg;
      if (this.state === 'done') box = { x: reg.x + reg.w - 132, y: reg.y + 6, w: 124, h: 26 };
      let L = 0;
      let T = 0;
      let R = window.innerWidth;
      let B = window.innerHeight;
      for (const sc of this.getScrollers()) {
        const b = sc.getBoundingClientRect();
        L = Math.max(L, b.left);
        T = Math.max(T, b.top);
        R = Math.min(R, b.right);
        B = Math.min(B, b.bottom);
      }
      const il = Math.max(0, L - box.x);
      const it = Math.max(0, T - box.y);
      const ir = Math.max(0, box.x + box.w - R);
      const ib = Math.max(0, box.y + box.h - B);
      if (il + ir >= box.w || it + ib >= box.h) {
        st.display = 'none';
        return;
      }
      st.display = 'block';
      st.width = box.w + 'px';
      st.height = box.h + 'px';
      st.transform = `translate(${box.x}px,${box.y}px)`;
      st.clipPath = il || it || ir || ib ? `inset(${it}px ${ir}px ${ib}px ${il}px)` : 'none';
      const wide = box.w >= 460;
      if (wide !== this.wide) {
        this.wide = wide;
        const c = this.$('.crate');
        if (c) c.classList.toggle('wide', wide);
      }
    }

    // ---- weergave ----
    chrome(inner, cls = '') {
      this.shadow.innerHTML = `<style>${WIDGET_CSS}</style><div class="crate ${cls}${this.wide ? ' wide' : ''}">${inner}</div>`;
    }

    /** Echte resultaten (zonder dit resultaat) als tegels; "?" als er nog geen andere bekend zijn. */
    buildItems(winnerItem) {
      const pool = Store.others(this.key);
      const items = [];
      const bag = [];
      for (let i = 0; i < CONFIG.tileCount; i++) {
        if (i === CONFIG.winnerIndex) {
          items.push(winnerItem);
          continue;
        }
        if (!pool.length) {
          items.push(null);
          continue;
        }
        if (!bag.length) bag.push(...pool.slice().sort(() => Math.random() - 0.5));
        let pick = bag.pop();
        const prev = items[i - 1];
        if (prev && prev.k === pick.k && bag.length) {
          const alt = bag.pop();
          bag.push(pick);
          pick = alt;
        }
        items.push(pick);
      }
      return { items, hasReal: pool.length > 0 };
    }

    tilesHtml(items, hideWinner) {
      return items
        .map((it, i) => {
          const isWin = i === CONFIG.winnerIndex;
          if (!it || (isWin && hideWinner)) return `<div class="tile${isWin ? ' win' : ''}" style="--c:#b0c3d9">?</div>`;
          const t = tierFor(it.percent);
          return `<div class="tile${isWin ? ' win' : ''}" style="--c:${t.color}" title="${esc(it.title || '')}">${fmt(it.percent)}</div>`;
        })
        .join('');
    }

    infoHtml() {
      const r = this.r;
      return `<div class="info"><b>${esc(r.title)}</b><small>${esc(r.subtitle || r.subject || 'Sealed result')}</small></div>`;
    }

    stripHtml(items, hideWinner, button) {
      return `${this.infoHtml()}
        <div class="mid"><div class="label">Result crate</div>
          <div class="window"><div class="strip" style="--tw:${CONFIG.tileWidth}px;--gap:${CONFIG.tileGap}px">${this.tilesHtml(items, hideWinner)}</div><div class="marker"></div></div></div>
        <div class="side">${button}</div>`;
    }

    showIdle() {
      clearTimeout(this.timer);
      this.state = 'idle';
      const { items } = this.buildItems({ percent: this.r.percent, title: this.r.title, k: this.key });
      this.chrome(this.stripHtml(items, true, '<button class="btn go" data-a="open">Click to open</button>'));
    }

    showCelebrate() {
      const r = this.r;
      const t = tierFor(r.percent);
      this.state = 'celebrate';
      this.chrome(
        `<div class="rv" style="--c:${t.color}">
           <span class="subj">${esc(r.subject || '')}</span>
           <span class="rt">${esc(r.title)}</span>
           ${r.max ? `<span class="pts">${nl(r.got)} / ${nl(r.max)}</span>` : ''}
           <span class="pct">${fmt(r.percent)}</span>
           <span class="tier">${t.name}</span>
         </div>`,
        'done'
      );
      this.$('.crate').style.setProperty('--c', t.color);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.showChip(), 3000);
    }

    /** Crate is open: de overlay verdwijnt en de originele kaart (met echte score) is zichtbaar. */
    showChip() {
      clearTimeout(this.timer);
      this.state = 'done';
      this.chrome('<button class="chip" data-a="reopen">\u21bb Reopen crate</button>', 'chipmode');
    }

    onClick(e) {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'open') this.open();
      else if (a.dataset.a === 'reopen') {
        Opened.remove(this.key);
        this.m.relock(this.key);
      }
    }

    // ---- animatie ----
    open() {
      if (this.state === 'spinning') return;
      const live = this.m.live(this.key);
      if (live) this.r = live;
      Sound.ensure();
      this.state = 'spinning';
      const { items, hasReal } = this.buildItems({ percent: this.r.percent, title: this.r.title, k: this.key });
      this.chrome(this.stripHtml(items, !hasReal, '<button class="btn go" disabled>Opening...</button>'));
      const strip = this.$('.strip');
      const wrap = this.$('.window');
      const step = CONFIG.tileWidth + CONFIG.tileGap;
      const centre = wrap.clientWidth / 2;
      const target = CONFIG.winnerIndex * step + 6 + CONFIG.tileWidth / 2 + rand(-0.36, 0.36) * CONFIG.tileWidth - centre;
      const duration = CONFIG.spinBaseMs / Settings.data.speed;
      const peak = target + rand(0.12, 0.3) * CONFIG.tileWidth;
      const easeOut = (t) => 1 - Math.pow(1 - t, 4.2);
      let last = -1;
      const t0 = performance.now();
      const frame = (now) => {
        const t = clamp((now - t0) / duration, 0, 1);
        let x;
        if (t < 0.93) x = peak * easeOut(t / 0.93);
        else {
          const k = (t - 0.93) / 0.07;
          x = peak + (target - peak) * (1 - Math.pow(1 - k, 3));
        }
        strip.style.transform = `translate3d(${-x}px,0,0)`;
        const idx = Math.floor((x + centre) / step);
        if (idx !== last) {
          if (last !== -1) Sound.tick();
          last = idx;
        }
        if (t < 1) this.raf = requestAnimationFrame(frame);
        else this.finish(hasReal);
      };
      this.raf = requestAnimationFrame(frame);
    }

    finish(hasReal) {
      const win = this.$('.tile.win');
      if (win) {
        if (!hasReal) win.textContent = fmt(this.r.percent);
        win.classList.add('lit');
      }
      Sound.win();
      this.timer = setTimeout(() => {
        Opened.add(this.key);
        this.m.revealKey(this.key, this);
      }, 900);
    }

    destroy() {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.timer);
      this.host.remove();
    }
  }

  // ===== 10. Kleine instellingenknop =====
  const SETTINGS_CSS = `
    *{box-sizing:border-box}
    .wrap{position:fixed;right:18px;bottom:18px;z-index:2147483646;font-family:'Segoe UI',system-ui,sans-serif;color:#e8ecf8}
    .gear{width:42px;height:42px;border-radius:50%;cursor:pointer;border:1px solid rgba(255,255,255,.2);background:#1c2230;color:#fff;font-size:19px;
      box-shadow:0 6px 20px rgba(0,0,0,.4)}
    .menu{display:none;position:absolute;right:0;bottom:52px;width:260px;padding:14px;border-radius:14px;background:#141824;
      border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 40px rgba(0,0,0,.5)}
    .menu.open{display:block}
    .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;font-size:13px}
    .row+.row,.row+button,button+button{margin-top:4px}
    .sw{position:relative;width:42px;height:22px;border-radius:99px;background:#2a2f4d;cursor:pointer;border:0}
    .sw:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s}
    .sw.on{background:#8847ff}.sw.on:after{transform:translateX(20px)}
    select{background:#1b1f3a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:5px 7px;font:inherit}
    .b{width:100%;cursor:pointer;margin-top:6px;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:700 12px inherit;letter-spacing:.06em}
    .b:hover{background:rgba(255,255,255,.16)}
  `;

  class SettingsPanel {
    constructor(manager) {
      this.m = manager;
      this.host = document.createElement('div');
      this.host.setAttribute('data-ss-crate', '');
      this.shadow = this.host.attachShadow({ mode: 'open' });
      const speeds = CONFIG.speeds.map((s) => `<option value="${s.value}">${s.label}</option>`).join('');
      this.shadow.innerHTML = `<style>${SETTINGS_CSS}</style>
        <div class="wrap">
          <div class="menu">
            <div class="row"><span>\u{1F50A} Sound effects</span><button class="sw" data-k="sound" aria-label="Sound"></button></div>
            <div class="row"><span>\u26a1 Animation speed</span><select data-k="speed">${speeds}</select></div>
            <button class="b" data-a="reopen">\u{1F504} Reopen all crates</button>
            <button class="b" data-a="original">\u{1F441} Show original results</button>
          </div>
          <button class="gear" aria-label="Crate settings" title="Crate settings">\u2699</button>
        </div>`;
      this.shadow.addEventListener('click', (e) => this.onClick(e));
      this.shadow.addEventListener('change', (e) => {
        if (e.target.dataset.k === 'speed') Settings.set('speed', parseFloat(e.target.value));
      });
      this.sync();
      whenBodyReady(() => document.body.appendChild(this.host));
    }

    sync() {
      this.shadow.querySelector('.sw').classList.toggle('on', !!Settings.data.sound);
      this.shadow.querySelector('select').value = String(Settings.data.speed);
      this.shadow.querySelector('[data-a="original"]').textContent = this.m.originalMode
        ? '\u{1F381} Show crates'
        : '\u{1F441} Show original results';
    }

    onClick(e) {
      if (e.target.closest('.gear')) return this.shadow.querySelector('.menu').classList.toggle('open');
      if (e.target.closest('[data-k="sound"]')) {
        Settings.set('sound', !Settings.data.sound);
        if (Settings.data.sound) Sound.tick();
        return this.sync();
      }
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'reopen') this.m.reopenAll();
      else if (a.dataset.a === 'original') this.m.setOriginalMode(!this.m.originalMode);
      this.sync();
    }

    destroy() {
      this.host.remove();
    }
  }

  // ===== 11. Manager: houdt de crates in sync met de pagina =====
  const Manager = {
    crates: new Map(), // rij-element -> CrateWidget
    originalMode: false,
    panel: null,
    layer: null,
    raf: 0,

    ensureLayer() {
      if (this.layer && this.layer.isConnected) return;
      const old = Array.from(this.crates.values());
      const l = document.createElement('div');
      l.setAttribute('data-ss-crate', '');
      l.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:900;pointer-events:none;';
      document.body.appendChild(l);
      this.layer = l;
      old.forEach((c) => l.appendChild(c.host)); // layer was door de site weggegooid: widgets terugzetten
      const frame = () => {
        this.crates.forEach((c) => c.position());
        this.raf = requestAnimationFrame(frame);
      };
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(frame);
    },

    sync(all) {
      this.ensureLayer();
      if (!this.panel) this.panel = new SettingsPanel(this);
      // Een rij die een andere rij omvat is geen resultaat maar een container
      const results = all.filter((r) => !all.some((o) => o !== r && r.el.contains(o.el)));
      this.crates.forEach((c, el) => {
        if (!el.isConnected || !results.some((r) => r.el === el)) {
          c.destroy();
          this.crates.delete(el);
        }
      });
      results.forEach((r) => {
        const c = this.crates.get(r.el);
        if (c && c.key === r.key) return c.update(r);
        if (c) c.destroy();
        this.crates.set(r.el, new CrateWidget(r, this));
      });
      this.crates.forEach((c) => c.position()); // meteen plaatsen, nog voor de pagina zichtbaar wordt
    },

    live(key) {
      return ResultsScanner.scan().find((r) => r.key === key) || null;
    },

    /** Een crate is open: alle widgets met hetzelfde resultaat (lijst + detail) volgen. */
    revealKey(key, origin) {
      this.crates.forEach((c) => {
        if (c.key !== key) return;
        if (c !== origin) c.r = Object.assign({}, c.r, { percent: origin.r.percent, got: origin.r.got, max: origin.r.max, raw: origin.r.raw });
        if (c === origin) c.showCelebrate();
        else c.showChip();
      });
    },

    relock(key) {
      this.crates.forEach((c) => c.key === key && c.showIdle());
    },

    reopenAll() {
      this.crates.forEach((c) => Opened.remove(c.key));
      this.originalMode = false;
      this.crates.forEach((c) => c.showIdle());
    },

    setOriginalMode(on) {
      this.originalMode = on;
    },

    destroy() {
      cancelAnimationFrame(this.raf);
      this.crates.forEach((c) => c.destroy());
      this.crates.clear();
      if (this.panel) this.panel.destroy();
      this.panel = null;
      if (this.layer) this.layer.remove();
      this.layer = null;
    },
  };

  // ===== 12. Label linksonder: laat zien dat het script draait =====
  function badge(text, ok) {
    let host = document.querySelector('[data-ss-crate-badge]');
    if (host && !host.shadowRoot) {
      host.remove();
      host = null;
    }
    if (!host) {
      host = document.createElement('div');
      host.setAttribute('data-ss-crate-badge', '');
      host.attachShadow({ mode: 'open' }).innerHTML =
        '<style>div{position:fixed;left:16px;bottom:16px;z-index:2147483646;font:600 12px system-ui,sans-serif;color:#fff;' +
        'padding:8px 12px;border-radius:99px;box-shadow:0 6px 20px rgba(0,0,0,.35);transition:opacity .4s}</style><div></div>';
      document.body.appendChild(host);
    }
    const d = host.shadowRoot.querySelector('div');
    d.textContent = '\u{1F381} Crate Opener: ' + text;
    d.style.background = ok ? '#2e9e5b' : '#c2410c';
    d.style.opacity = '1';
    clearTimeout(badge.t);
    badge.t = setTimeout(() => (d.style.opacity = '0'), 6000);
  }

  // ===== 13. Boot + SPA-navigatie: alleen actief op de Resultaten-pagina =====
  const App = {
    timer: 0,
    mounted: false,

    start() {
      if (window.top !== window.self) return;
      log('v3.1.0 geladen op', location.href);
      Settings.load();
      if (PageGate.urlLooksLikeResults()) PendingGuard.on();

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
        new MutationObserver((muts) => {
          if (muts.every((m) => m.target.closest && m.target.closest('[data-ss-crate]'))) return;
          this.schedule();
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
        this.schedule(0);
      });
      setTimeout(() => PendingGuard.off(), CONFIG.failSafeRevealMs);
    },

    schedule(delay = CONFIG.debounceMs) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.check(), delay);
    },

    check() {
      if (!PageGate.isResultsPage()) {
        if (this.mounted) {
          Manager.destroy();
          this.mounted = false;
        }
        PendingGuard.off();
        return;
      }
      const results = ResultsScanner.scan();
      window.__ssCrate = { results, scan: () => ResultsScanner.scan(), cells: () => ResultsScanner.scoreCells() };
      Store.add(results);
      if (!results.length) {
        if (this.mounted) return; // tussentijdse herrender van de site
        log('Resultaten-pagina, maar geen scores gevonden. Score-cellen:', ResultsScanner.scoreCells().length);
        badge('actief, maar geen scores herkend', false);
        PendingGuard.off();
        return;
      }
      if (!this.mounted) {
        log('Resultaten-pagina gedetecteerd:', results.map((r) => `${r.title} ${r.raw}`));
        badge(`${results.length} resultaat${results.length === 1 ? '' : 'en'} herkend`, true);
        this.mounted = true;
      }
      Manager.sync(results);
      PendingGuard.off();
    },
  };

  App.start();
})();
