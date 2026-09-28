/* MineWater Ledger - Water-at-Risk engine (risk.html).
   1 Reconcile: precision-weighted fusion of reported, balance-implied and modelled withdrawal.
   2 Predict:   Monte Carlo (seeded) of freshwater demand vs availability, 2021-2030 -> shortfall odds, revenue at risk.
   3 Decide:    prices recycling and a new source against the risk they remove (common random numbers).
   Inputs: data/newcrest.js (Newcrest FY20 GRI file), data/lutter.js (Lutter et al. 2025). Parameters marked "assumed" in the UI. */
(function () {
"use strict";
const NS = "http://www.w3.org/2000/svg", $ = s => document.querySelector(s);
const fmt = (x, d = 0) => x == null || isNaN(x) ? "–" : Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function el(t, a, p) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
function txt(p, x, y, s, cls, anchor) { const t = el("text", { x, y, class: cls || "", "text-anchor": anchor || "start" }, p); t.textContent = s; return t; }
function svgRoot(host, w, h, label) { host.innerHTML = ""; const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label }); host.appendChild(s); return s; }
const tip = $("#tip");
function mv(e) { let x = e.clientX + 14, y = e.clientY + 14; const r = tip.getBoundingClientRect(); if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; }
function hover(n, t, lines) { n.addEventListener("mouseenter", e => { tip.innerHTML = `<div class="tt">${esc(t)}</div>` + lines().map(l => `<div class="tv">${esc(l)}</div>`).join(""); tip.classList.add("on"); mv(e); }); n.addEventListener("mousemove", mv); n.addEventListener("mouseleave", () => tip.classList.remove("on")); }

/* ---------- data ---------- */
const NCM = window.NCM, LUT = window.MWL_LUTTER || [];
const G_MEAN = Math.pow(1.183, 1 / 4) - 1; // +18.3% copper-mine new water 2015-2019 (Lutter et al.)
const SITES = {
  Cadia: { drought: 25, basin: "Central West NSW, Australia. In Oct 2019 the town of Orange was on level 5 water restrictions and Cadia handed back ~2 of its ~30 ML/day." },
  Telfer: { drought: 15, basin: "Great Sandy Desert, Western Australia. Almost all freshwater is groundwater from a borefield." },
  Lihir: { drought: 5, basin: "Tropical island, Papua New Guinea. 71% of withdrawal is seawater; the freshwater part is analysed here." },
  "Red Chris": { drought: 10, basin: "Northern British Columbia, Canada. Bought Aug 2019; no water figures in the FY20 report, so the model is the only source." }
};
const NAMES = Object.keys(SITES);
const lut = n => { const m = NCM.lutter && NCM.lutter[n]; const r = m ? LUT.find(x => x[0] === m) : null; return r && r[3][4] != null ? r[3][4] : null; };

/* ---------- 1. reconcile ---------- */
function reconcile(n, verified) {
  const s = NCM.sites[n], src = [];
  if (s.W != null) src.push({ k: "Company report", v: s.W, sd: verified ? .03 : .10, use: true, note: "GRI 303-3 total withdrawal" });
  if (s.W != null && s.C != null && s.D != null) {
    const bal = verified ? s.W : s.C + s.D + (s.dS || 0);
    const indep = n !== "Lihir"; // Lihir: consumption = withdrawal - discharge, so it closes by construction
    src.push({ k: "Water balance", v: bal, sd: .10, use: indep, note: indep ? "consumption + discharge + storage change" : "not independent: consumption was set to withdrawal − discharge" });
  }
  const m = lut(n);
  if (m != null) src.push({ k: "WU Wien model", v: m, sd: .35, use: true, note: "Lutter et al. 2025, 2019 new water, R² 0.79" });
  const used = src.filter(x => x.use);
  if (!used.length) return null;
  let wsum = 0, vsum = 0; used.forEach(x => { const sd = x.v * x.sd, w = 1 / (sd * sd); wsum += w; vsum += w * x.v; });
  const f = vsum / wsum, sf = 1 / Math.sqrt(wsum);
  let maxZ = 0; for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) { const a = used[i], b = used[j]; maxZ = Math.max(maxZ, Math.abs(a.v - b.v) / Math.hypot(a.v * a.sd, b.v * b.sd)); }
  const status = used.length < 2 ? "single" : maxZ < 1 ? "agree" : maxZ < 2 ? "tension" : "conflict";
  const trust = Math.max(5, Math.min(99, Math.round(100 - 150 * sf / f - 12 * Math.max(0, maxZ - 1) - (used.length < 2 ? 15 : 0))));
  const share = s.W_high != null && s.W ? s.W_high / s.W : 1;
  return { src, f, sf, maxZ, status, trust, share, fresh0: f * share, freshSd: sf * share };
}

/* ---------- 2. predict (seeded Monte Carlo) ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function normal(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i), N = 1000;
function pct(arr, p) { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))]; }

function simulate(n, P, lev) {
  const s = NCM.sites[n], rc = reconcile(n, P.verified); if (!rc) return null;
  const Wf = rc.fresh0, R0 = s.R || 0, rr0 = R0 / (R0 + Wf);
  const licence = (s.W_high != null ? s.W_high : Wf) * (1 + P.head / 100); // licence set on the reported (or modelled) figure
  const rev = s.revenue_musd || 0, drought = P.drought[n] / 100;
  const r = rng(1234 + n.length * 97 + n.charCodeAt(0));
  const T = YEARS.length, out = { dB: [], dL: [], aB: [], aL: [] };
  for (let t = 0; t < T; t++) { out.dB.push([]); out.dL.push([]); out.aB.push([]); out.aL.push([]); }
  const lossB = [], lossL = [], anyB = [], anyL = []; let avoidML = 0, altML = 0;
  for (let k = 0; k < N; k++) {
    const d0 = Math.max(Wf * .3, Wf + rc.freshSd * normal(r));
    const g = P.g / 100 + 0.01 * normal(r);
    let LB = 0, LL = 0, hitB = false, hitL = false;
    for (let t = 0; t < T; t++) {
      const dr = r() < drought ? 0.05 + 0.25 * r() : 0; // drought cuts supply 5-30%
      const grow = Math.pow(1 + g, t);
      const dB = d0 * grow;
      const dL = dB * (1 - lev.rr / 100 * Math.min(1, t / 3)); // recycling / thickened tailings cut freshwater need, ramped over 3 years
      const aB = licence * Math.pow(1 - P.reg / 100, t) * (1 - dr);
      const alt = t >= 3 ? lev.alt / 100 * (s.W_high != null ? s.W_high : Wf) : 0, aL = aB + alt;
      out.dB[t].push(dB); out.dL[t].push(dL); out.aB[t].push(aB); out.aL[t].push(aL);
      if (t > 0) {
        const fB = Math.max(0, dB - aB) / dB, fL = Math.max(0, dL - aL) / dL;
        if (fB > 0) hitB = true; if (fL > 0) hitL = true;
        LB += Math.min(1, fB * P.sens / 100) * rev; LL += Math.min(1, fL * P.sens / 100) * rev;
        avoidML += (dB - dL) / N; altML += alt / N;
      }
    }
    lossB.push(LB); lossL.push(LL); anyB.push(hitB); anyL.push(hitL);
  }
  const band = key => out[key].map(a => [pct(a, .05), pct(a, .5), pct(a, .95)]);
  const cost = (avoidML * 1000 * lev.rrc + altML * 1000 * lev.altc) / 1e6; // US$m over 2021-2030
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    rc, rev, Wf, rr0, licence,
    bands: { dB: band("dB"), dL: band("dL"), aB: band("aB"), aL: band("aL") },
    pB: anyB.filter(Boolean).length / N, pL: anyL.filter(Boolean).length / N,
    elB: mean(lossB), elL: mean(lossL), varB: pct(lossB, .95), varL: pct(lossL, .95),
    cost, avoidML, altML, revPerML: s.W_high ? rev * 1e6 / s.W_high : (rev * 1e6 / Wf)
  };
}

/* ---------- state + UI ---------- */
const P = { verified: false, g: 1.5, head: 25, reg: 0.25, sens: 50, drought: Object.fromEntries(NAMES.map(n => [n, SITES[n].drought])) };
const L = { rr: 10, rrc: 1.2, alt: 0, altc: 2 };
let SEL = "Cadia";
$("#sites").innerHTML = NAMES.map(n => `<button class="chip" data-s="${n}" aria-pressed="${n === SEL}">${n}</button>`).join("");
$("#sites").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; SEL = b.dataset.s; $("#sites").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#p-drought").value = P.drought[SEL]; draw(); });
$("#verified").addEventListener("change", e => { P.verified = e.target.checked; draw(); });
$("#p-drought").value = P.drought[SEL];
[["p-g", v => P.g = v], ["p-drought", v => P.drought[SEL] = v], ["p-head", v => P.head = v], ["p-reg", v => P.reg = v], ["p-sens", v => P.sens = v],
 ["l-rr", v => L.rr = v], ["l-rrc", v => L.rrc = v], ["l-alt", v => L.alt = v], ["l-altc", v => L.altc = v]]
  .forEach(([id, f]) => $("#" + id).addEventListener("input", e => { f(+e.target.value); draw(); }));

function outputs() {
  $("#o-g").textContent = P.g.toFixed(1) + "%/yr"; $("#o-drought").textContent = P.drought[SEL] + "%"; $("#o-head").textContent = "+" + P.head + "%"; $("#o-reg").textContent = P.reg + "%/yr"; $("#o-sens").textContent = P.sens + "%";
  $("#o-rr").textContent = "−" + L.rr + "%"; $("#o-rrc").textContent = "$" + L.rrc.toFixed(1) + "/m³"; $("#o-alt").textContent = L.alt + "%"; $("#o-altc").textContent = "$" + L.altc.toFixed(1) + "/m³";
}

function drawRec(n) {
  const rc = reconcile(n, P.verified), s = NCM.sites[n];
  $("#rec-title").textContent = `${n}: one best estimate from three sources`;
  $("#site-note").textContent = SITES[n].basin;
  if (!rc) { $("#rec-chart").innerHTML = "<p class='small'>No source available.</p>"; return; }
  const rows = [...rc.src.map(x => ({ ...x, lo: x.v * (1 - 1.96 * x.sd), hi: x.v * (1 + 1.96 * x.sd) })), { k: "Reconciled", v: rc.f, lo: rc.f - 1.96 * rc.sf, hi: rc.f + 1.96 * rc.sf, use: true, fused: true, note: "precision-weighted" }];
  const W = 620, Lm = 150, Rm = 30, top = 18, rh = 44, H = top + rows.length * rh + 34;
  const max = Math.max(...rows.map(x => x.hi)) * 1.05, min = Math.max(0, Math.min(...rows.map(x => x.lo)) * .9);
  const x = v => Lm + (v - min) / (max - min) * (W - Lm - Rm);
  const G = svgRoot($("#rec-chart"), W, H, "Sources and reconciled estimate");
  const step = (max - min) > 100000 ? 50000 : (max - min) > 40000 ? 10000 : (max - min) > 15000 ? 5000 : (max - min) > 6000 ? 2000 : 1000;
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) { el("line", { x1: x(t), x2: x(t), y1: top - 6, y2: H - 30, class: "gridline" }, G); txt(G, x(t), H - 12, fmt(t), "t-muted t-mono", "middle"); }
  txt(G, W - Rm, H - 12 + 0, "ML/yr", "t-muted t-mono", "end");
  el("rect", { x: x(rc.f - 1.96 * rc.sf), y: top - 6, width: x(rc.f + 1.96 * rc.sf) - x(rc.f - 1.96 * rc.sf), height: rows.length * rh, fill: "var(--good)", opacity: .1 }, G);
  rows.forEach((r, i) => {
    const y = top + i * rh + rh / 2;
    txt(G, Lm - 12, y + 4, r.k, r.fused ? "t-ink" : "", "end");
    const c = r.fused ? "var(--good)" : r.use ? "var(--ink)" : "var(--muted)";
    el("line", { x1: x(r.lo), x2: x(r.hi), y1: y, y2: y, stroke: c, "stroke-width": r.fused ? 4 : 2, "stroke-linecap": "round", opacity: r.use ? 1 : .5 }, G);
    const dot = el("circle", { cx: x(r.v), cy: y, r: r.fused ? 7 : 5.5, fill: c, stroke: "var(--surface)", "stroke-width": 2 }, G);
    if (!r.use) txt(G, x(r.v) + 10, y - 8, "not counted", "t-muted");
    hover(dot, r.k, () => [fmt(r.v) + " ML", `95% range ${fmt(r.lo)}–${fmt(r.hi)}`, r.note]);
  });
  const st = { agree: ["good", "Sources agree"], tension: ["warn", "Sources in tension"], conflict: ["crit", "Sources conflict"], single: ["warn", "Only one source"] }[rc.status];
  $("#rec-status").innerHTML = `<div class="row"><span class="pill ${st[0]}">${st[1]}</span><span class="small">largest gap between two sources: ${fmt(rc.maxZ, 1)}× their combined error</span></div>`;
  $("#rec-kpis").innerHTML = [
    [fmt(rc.f), "ML/yr reconciled withdrawal", `±${fmt(1.96 * rc.sf / rc.f * 100)}% (95%)`],
    [rc.trust + "/100", "trust score", P.verified ? "with a verified site ledger" : "tick the box to see a verified ledger"]
  ].map(k => `<div class="kpi"><div class="v">${k[0]}</div><div class="l">${k[1]}</div><div class="d">${k[2]}</div></div>`).join("");
  const bal = rc.src.find(x => x.k === "Water balance");
  let note = "";
  if (n === "Telfer") note = `<b>Telfer:</b> the report says ${fmt(s.W)} ML in, but consumption + discharge add up to ${fmt(bal.v)} ML. The model sits at ${fmt(rc.src[2].v)} ML. The engine does not pick one; it weights them and carries the doubt forward into the forecast.`;
  else if (n === "Cadia") note = `<b>Cadia:</b> report, balance and model land within about 10% of each other. That agreement is what earns a high trust score and a narrow forecast band.`;
  else if (n === "Lihir") note = `<b>Lihir:</b> the balance was built from withdrawal minus discharge, so it cannot confirm anything and is not counted. Lihir is a gold mine, outside the copper model. One source, one wide band.`;
  else note = `<b>Red Chris:</b> ${fmt(s.revenue_musd)} US$m revenue and no water figures in the report. The WU Wien model is the only view, so the band is ±69%. A single reported number would shrink it to about ±19%.`;
  $("#rec-note").innerHTML = note;
}

function drawPred(n, R) {
  $("#pred-title").textContent = `${n}: will there be enough freshwater?`;
  const b = R.bands, Wd = 1000, Lm = 70, Rm = 150, top = 20, H = 320, ph = H - top - 40;
  const ymax = Math.max(...b.dB.map(x => x[2]), ...b.aL.map(x => x[2])) * 1.08;
  const x = i => Lm + i / (YEARS.length - 1) * (Wd - Lm - Rm), y = v => top + ph - v / ymax * ph;
  const G = svgRoot($("#pred-chart"), Wd, H, "Freshwater needed vs available");
  const step = ymax > 200000 ? 50000 : ymax > 80000 ? 20000 : ymax > 40000 ? 10000 : ymax > 15000 ? 5000 : ymax > 6000 ? 2000 : 1000;
  for (let t = 0; t <= ymax; t += step) { el("line", { x1: Lm, x2: Wd - Rm, y1: y(t), y2: y(t), class: "gridline" }, G); txt(G, Lm - 8, y(t) + 4, fmt(t), "t-muted t-mono", "end"); }
  txt(G, Lm - 8, 12, "ML/yr", "t-muted t-mono", "end");
  YEARS.forEach((yr, i) => { if (i % 2 === 0) txt(G, x(i), H - 14, yr === 2020 ? "FY20" : yr, "t-muted t-mono", "middle"); });
  const area = (bb, c, op) => el("path", { d: "M" + bb.map((p, i) => `${x(i)},${y(p[2])}`).join(" L") + " L" + bb.map((p, i) => [i, p]).reverse().map(([i, p]) => `${x(i)},${y(p[0])}`).join(" L") + " Z", fill: c, opacity: op }, G);
  const line = (bb, c, w, dash) => el("path", { d: "M" + bb.map((p, i) => `${x(i)},${y(p[1])}`).join(" L"), fill: "none", stroke: c, "stroke-width": w, "stroke-dasharray": dash || "" }, G);
  const lever = L.alt > 0 ? b.aL : b.aB;
  area(lever, "var(--copper)", .16); area(b.dB, "var(--q2)", .18);
  line(lever, "var(--copper)", 2.2); line(b.dB, "var(--q2)", 2.2);
  if (L.rr > 0) line(b.dL, "var(--good)", 2.2, "6 4");
  const end = YEARS.length - 1, lab = [[b.dB[end][1], "needed " + fmt(b.dB[end][1]), "var(--q2)"], [lever[end][1], "available " + fmt(lever[end][1]), "var(--copper)"]];
  if (L.rr > 0) lab.push([b.dL[end][1], "with fixes " + fmt(b.dL[end][1]), "var(--good)"]);
  lab.map(l => ({ l, yy: y(l[0]) })).sort((a, c) => a.yy - c.yy).forEach((o, i, arr) => { if (i && o.yy - arr[i - 1].yy < 16) o.yy = arr[i - 1].yy + 16; txt(G, x(end) + 10, o.yy + 4, o.l[1], "t-ink t-mono"); });
  const cross = el("line", { y1: top, y2: top + ph, stroke: "var(--ink)", opacity: 0 }, G);
  const ov = el("rect", { x: Lm, y: top, width: Wd - Lm - Rm, height: ph, fill: "transparent" }, G);
  ov.addEventListener("mousemove", e => { const p = G.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(G.getScreenCTM().inverse()); const i = Math.round((q.x - Lm) / ((Wd - Lm - Rm) / (YEARS.length - 1))); if (i < 0 || i > end) return;
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", .3);
    tip.innerHTML = `<div class="tt">${YEARS[i]}</div>` + [`needed ${fmt(b.dB[i][1])} ML (${fmt(b.dB[i][0])}–${fmt(b.dB[i][2])})`, `available ${fmt(lever[i][1])} ML (${fmt(lever[i][0])}–${fmt(lever[i][2])})`].concat(L.rr > 0 ? [`needed with fixes ${fmt(b.dL[i][1])} ML`] : []).map(l => `<div class="tv">${l}</div>`).join(""); tip.classList.add("on"); mv(e); });
  ov.addEventListener("mouseleave", () => { tip.classList.remove("on"); cross.setAttribute("opacity", 0); });
  $("#pred-kpis").innerHTML = [
    ["$" + fmt(R.revPerML / 1000) + "k", "revenue per ML of freshwater", "FY20 revenue ÷ freshwater withdrawal (data)", ""],
    [fmt(R.pB * 100) + "%", "chance of at least one short year by 2030", "if nothing changes", R.pB > .5 ? "crit" : ""],
    ["$" + fmt(R.elB) + "m", "expected revenue lost, 2021–2030", "average of 1,000 runs, undiscounted", R.elB > 50 ? "crit" : ""],
    ["$" + fmt(R.varB) + "m", "bad case (1 run in 20)", "95th percentile: the water-at-risk number", ""]
  ].map(k => `<div class="kpi"><div class="v ${k[3]}">${k[0]}</div><div class="l">${k[1]}</div><div class="d">${k[2]}</div></div>`).join("");
}

function options(n) {
  const base = { rr: 0, rrc: L.rrc, alt: 0, altc: L.altc };
  return [["Do nothing", base], ["Cut freshwater " + L.rr + "%", { ...base, rr: L.rr }], ["New source " + L.alt + "%", { ...base, alt: L.alt }], ["Both", { ...L }]]
    .filter((o, i) => i === 0 || (i === 1 && L.rr > 0) || (i === 2 && L.alt > 0) || (i === 3 && L.rr > 0 && L.alt > 0))
    .map(([k, lev]) => { const R = simulate(n, P, lev); return { k, R, saved: R.elB - R.elL, net: R.elB - R.elL - R.cost }; });
}

function drawDec(n) {
  $("#dec-title").textContent = `${n}: which fix pays back?`;
  const O = options(n), best = O.slice(1).sort((a, b) => b.net - a.net)[0];
  $("#dec-table").innerHTML = `<thead><tr><th>Option</th><th class="r">Short year by 2030</th><th class="r">Expected loss</th><th class="r">Bad case</th><th class="r">Cost 2021–30</th><th class="r">Net benefit</th></tr></thead><tbody>` +
    O.map(o => `<tr class="${best && o.k === best.k && o.net > 0 ? "best" : ""}"><td>${o.k}</td><td class="r">${fmt((o.k === "Do nothing" ? o.R.pB : o.R.pL) * 100)}%</td><td class="r">$${fmt(o.k === "Do nothing" ? o.R.elB : o.R.elL)}m</td><td class="r">$${fmt(o.k === "Do nothing" ? o.R.varB : o.R.varL)}m</td><td class="r">$${fmt(o.R.cost)}m</td><td class="r">${o.k === "Do nothing" ? "–" : (o.net >= 0 ? "+" : "−") + "$" + fmt(Math.abs(o.net)) + "m"}</td></tr>`).join("") + "</tbody>";
  const F = [];
  if (best) F.push([best.net > 0 ? "good" : "warn", best.net > 0 ? "Pays back" : "Does not pay back", best.net > 0 ? `${best.k} protects $${fmt(best.saved)}m of expected revenue for $${fmt(best.R.cost)}m: ${fmt(best.saved / Math.max(best.R.cost, .01), 1)}× the cost.` : `At these costs no fix protects more revenue than it costs at ${n}. Water is not the binding risk here.`]);
  else F.push(["info", "Set a fix", "Move a lever on the left to price a fix."]);
  const R0 = O[0].R;
  F.push(["info", "Why it differs by mine", `At ${n} one ML of freshwater carries $${fmt(R0.revPerML / 1000)}k of revenue. The same fix is worth more where that number is high.`]);
  $("#dec-find").innerHTML = F.map(f => `<li><span class="pill ${f[0]}">${f[1]}</span><span>${esc(f[2])}</span></li>`).join("");
}

function drawPort() {
  const rows = NAMES.map(n => { const O = options(n), best = O.slice(1).sort((a, b) => b.net - a.net)[0], R = O[0].R; return { n, R, best }; });
  const tot = rows.reduce((a, r) => a + r.R.elB, 0), totAfter = rows.reduce((a, r) => a + (r.best && r.best.net > 0 ? r.best.R.elL : r.R.elB), 0);
  $("#port-table").innerHTML = `<thead><tr><th>Site</th><th class="r">Revenue per ML</th><th class="r">Trust</th><th class="r">Short year by 2030</th><th class="r">Expected loss</th><th>Best fix</th><th class="r">Net benefit</th></tr></thead><tbody>` +
    rows.map(r => `<tr><td>${r.n}</td><td class="r">$${fmt(r.R.revPerML / 1000)}k</td><td class="r">${r.R.rc.trust}</td><td class="r">${fmt(r.R.pB * 100)}%</td><td class="r">$${fmt(r.R.elB)}m</td><td>${r.best && r.best.net > 0 ? r.best.k : "none needed"}</td><td class="r">${r.best && r.best.net > 0 ? "+$" + fmt(r.best.net) + "m" : "–"}</td></tr>`).join("") +
    `<tr><td><b>Company</b></td><td></td><td></td><td></td><td class="r"><b>$${fmt(tot)}m</b></td><td>$${fmt(totAfter)}m expected loss after best fixes</td><td class="r"><b>+$${fmt(rows.reduce((a, r) => a + (r.best && r.best.net > 0 ? r.best.net : 0), 0))}m</b></td></tr></tbody>`;
}

function draw() { outputs(); drawRec(SEL); const R = simulate(SEL, P, L); drawPred(SEL, R); drawDec(SEL); drawPort(); }
draw();
window.MWLRisk = { reconcile, simulate, P, L };
})();
