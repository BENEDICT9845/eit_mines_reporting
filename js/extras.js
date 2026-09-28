/* MineWater Ledger - dashboard extras: Years & output, Water cost, Source codes, CSV / print download,
   and the generic header that only names the company once data is loaded.
   Reads window.MWL_STATE (exposed by dashboard.js) and window.NCM_YEARS / NCM_CODEMAP (data/newcrest_years.js). */
(function () {
"use strict";
const NS = "http://www.w3.org/2000/svg", $ = s => document.querySelector(s);
const fmt = (x, d = 0) => x == null || isNaN(x) ? "–" : Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function el(t, a, p) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
function txt(p, x, y, s, cls, anchor) { const t = el("text", { x, y, class: cls || "", "text-anchor": anchor || "start" }, p); t.textContent = s; return t; }
function svgRoot(host, w, h, label) { host.innerHTML = ""; const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label }); host.appendChild(s); return s; }
const tip = $("#tip");
function mv(e) { let x = e.clientX + 14, y = e.clientY + 14; const r = tip.getBoundingClientRect(); if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; }
function hover(n, t, lines) { n.addEventListener("mouseenter", e => { tip.innerHTML = `<div class="tt">${esc(t)}</div>` + lines.map(l => `<div class="tv">${esc(l)}</div>`).join(""); tip.classList.add("on"); mv(e); }); n.addEventListener("mousemove", mv); n.addEventListener("mouseleave", () => tip.classList.remove("on")); }
const ST = () => window.MWL_STATE, Y = window.NCM_YEARS;
const SITE_DEFAULT = "Cadia";
function curSite() { const s = ST().SEL(); return s === "All" ? null : s; }

/* ---------- generic header: company named only after data is loaded ---------- */
function header() {
  const st = ST(), loaded = st.loaded();
  $("#co-eyebrow").textContent = loaded ? "Company page · example company" : "Company page";
  $("#co-name").textContent = loaded ? "Newcrest Mining" : "Set up your company page";
  $("#co-lede").textContent = loaded
    ? "Gold and copper miner, loaded as an example from public files. Your own reports fill the same page."
    : "Add your company's water reports, one file per year, or type each mine's figures. Every mine then gets its own water account: what comes in, what goes out, whether it balances, and where it is heading.";
  const prof = $("#co-profile");
  if (loaded) {
    const sites = st.sites(), withData = sites.filter(n => st.S[n].W != null).length;
    prof.innerHTML = [["Mines", sites.length], ["With water data", withData], ["Countries", "PNG · Australia · Indonesia · Canada"], ["Metals", "gold, copper"], ["Years", "2016 – FY20"], ["Sources", "2 files"]]
      .map(x => `<span><i>${x[0]}</i><b>${x[1]}</b></span>`).join("");
    prof.hidden = false;
  } else prof.hidden = true;
  $("#reg-co").textContent = loaded ? "Newcrest Mining (example)" : "–";
  $("#reg-period").textContent = loaded ? "FY20 in full · history 2016–FY19" : "–";
  $("#reg-src").textContent = loaded ? "Company report FY20 + WU Wien benchmark" : "–";
  $("#dl-row").hidden = !loaded; $("#filter-card").hidden = !loaded;
  document.title = (loaded ? "Newcrest (example) · " : "Company page · ") + "MineWater Ledger";
}

/* ---------- where every number came from ---------- */
const LINEAGE = [
  ["Company report FY20", "GRI 300 sheet, rows 106–179 (303-3, 303-4, 303-5, ICMM recycled)", "FY20", "Water in by source and quality, water out, storage, consumption, recycled, per mine", "161", "company"],
  ["Company report FY20", "GRI 300 sheet, rows 72 and 91 (302-3); GRI 200 sheet (201-1)", "FY20", "Ore milled, gold-equivalent ounces, revenue per mine", "15", "company"],
  ["Company report FY20", "Restatements sheet, rows 42 and 48", "FY19", "Ore processed and gold per mine, as restated in the FY20 report", "12", "company"],
  ["Company report FY20", "GRI 300 sheet, rows 133–137", "FY18–FY20", "Company-wide water withdrawal, high and low quality (no per-mine split)", "9", "company"],
  ["WU Wien benchmark (Lutter et al. 2025)", "CSV, matched by mine name: Telfer, Cadia East, Red Chris", "2015–2019", "Water per mine. Telfer and Cadia values look like the company's own earlier reports (whole numbers; to confirm with WU Wien); Red Chris values are model estimates", "15", "benchmark"],
  ["Not added yet", "Company reports FY19, FY21", "–", "Would replace the benchmark rows with the company's own per-mine figures", "–", "missing"]
];
function sources() {
  const h = $("#ov-sources"); if (!h) return;
  h.innerHTML = `<div class="card stack"><div class="row" style="justify-content:space-between"><h3>Where these numbers come from</h3><span class="small">One company report gives FY20 in full. The history comes from inside that same file and from a public benchmark.</span></div>
  <div class="tbl-wrap" style="border:0"><table><thead><tr><th>Source</th><th>Where in it</th><th>Years</th><th>What it gives</th><th class="r">Values</th></tr></thead><tbody>` +
    LINEAGE.map(r => `<tr class="${r[5] === "missing" ? "muted-row" : ""}"><td><span class="src-dot ${r[5]}"></span>${esc(r[0])}</td><td class="small">${esc(r[1])}</td><td class="mono">${esc(r[2])}</td><td>${esc(r[3])}</td><td class="r">${r[4]}</td></tr>`).join("") +
    `</tbody></table></div></div>`;
}

/* ---------- water flows: one picture per mine ---------- */
const SRC_COL = { "Surface water": "--s1", "Groundwater": "--s2", "Ground water": "--s2", "Third-party water": "--s4", "Seawater": "--s3", "Produced water": "--q3" };
function flowData(n) {
  const st = ST(), s = st.S[n]; if (!s || s.W == null) return null;
  const by = {}; st.wrows().filter(r => r[0] === n).forEach(r => { const k = r[2] === "Ground water" ? "Groundwater" : r[2]; by[k] = (by[k] || 0) + r[3]; });
  const L = Object.keys(by).filter(k => by[k] > 0).map(k => ({ label: k, v: by[k], col: `var(${SRC_COL[k] || "--q2"})` }));
  if (!L.length) L.push({ label: "Withdrawal", v: s.W, col: "var(--q2)" });
  const R = [], known = s.D != null && s.C != null;
  let gap = null, status;
  if (known) {
    const dS = s.dS || 0; gap = s.W - s.D - s.C - dS;
    R.push({ label: "Consumed", v: s.C, col: "var(--copper)" });
    if (s.D > 0) R.push({ label: "Discharged", v: s.D, col: "var(--ink-2)" });
    if (dS > 0) R.push({ label: "Into storage", v: dS, col: "var(--q3)" });
    if (dS < 0) L.push({ label: "Drawn from storage", v: -dS, col: "var(--q3)" });
    if (gap > 0.5) R.push({ label: "Not accounted for", v: gap, hatch: true });
    if (gap < -0.5) L.push({ label: "Missing inflow", v: -gap, hatch: true });
    const pct = Math.abs(gap) / s.W * 100;
    status = n === "Lihir" && pct <= 5 ? ["warn", "closes only by construction"] : pct <= 5 ? ["good", "balance closes"] : ["crit", `off by ${gap < 0 ? "+" : "−"}${fmt(pct, 1)}%`];
  } else { R.push({ label: "Outflows not reported", v: s.W, none: true }); status = ["info", "cannot be checked"]; }
  return { n, s, L, R, gap, status, inT: L.reduce((a, x) => a + x.v, 0), outT: R.reduce((a, x) => a + x.v, 0) };
}
function hatchDef(G, id) { const d = el("defs", {}, G), p = el("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, d); el("rect", { width: 6, height: 6, fill: "var(--copper-soft)" }, p); el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "var(--crit)", "stroke-width": 2.4 }, p); }
function drawFlow(host, f, big) {
  const W = big ? 960 : 320, H = big ? 360 : 150, pad = big ? 10 : 5, top = big ? 26 : 8, bw = big ? 14 : 8;
  const xL = big ? 200 : 8, xC = W / 2 - bw / 2, xR = big ? W - 200 - bw : W - 8 - bw;
  const tot = Math.max(f.inT, f.outT), ph = H - top - 12 - pad * Math.max(f.L.length, f.R.length), k = ph / tot;
  const id = "h" + Math.random().toString(36).slice(2, 8);
  const G = svgRoot(host, W, H, `${f.n} water in and out`); hatchDef(G, id);
  const fillOf = x => x.hatch ? `url(#${id})` : x.none ? "var(--surface-2)" : x.col;
  const cH = tot * k, cY = top + (ph + pad * Math.max(f.L.length, f.R.length) - cH) / 2;
  el("rect", { x: xC, y: cY, width: bw, height: cH, rx: 2, fill: "var(--ink)" }, G);
  if (big) { txt(G, xC + bw / 2, cY - 8, f.n, "t-ink", "middle"); txt(G, xL, 14, "Water in", "t-muted", "start"); txt(G, xR + bw, 14, "Water out", "t-muted", "end"); }
  const side = (arr, x, left) => {
    const sum = arr.reduce((a, q) => a + q.v * k, 0) + pad * (arr.length - 1);
    let y = top + (ph + pad * Math.max(f.L.length, f.R.length) - sum) / 2, cy = cY + (cH - arr.reduce((a, q) => a + q.v * k, 0)) / 2;
    arr.forEach(q => {
      const h = Math.max(q.v * k, 1.5);
      const x0 = left ? x + bw : xC + bw, x1 = left ? xC : x, y0 = left ? y : cy, y1 = left ? cy : y, mx = (x0 + x1) / 2;
      const band = el("path", { d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + h} C${mx},${y1 + h} ${mx},${y0 + h} ${x0},${y0 + h} Z`, fill: fillOf(q), opacity: q.hatch ? .9 : q.none ? 1 : .42, stroke: q.none ? "var(--rule-2)" : "none", "stroke-dasharray": q.none ? "4 3" : "" }, G);
      el("rect", { x, y, width: bw, height: h, rx: 2, fill: q.none ? "var(--rule-2)" : fillOf(q) }, G);
      hover(band, `${f.n} · ${q.label}`, [fmt(q.v) + " ML", fmt(q.v / f.s.W * 100, 1) + "% of withdrawal"]);
      if (big) { const tx = left ? x - 8 : x + bw + 8, an = left ? "end" : "start"; txt(G, tx, y + h / 2 - 1, q.label, q.hatch ? "t-ink" : "", an); txt(G, tx, y + h / 2 + 13, fmt(q.v) + " ML", "t-muted t-mono", an); }
      y += h + pad; cy += q.v * k;
    });
  };
  side(f.L, xL, true); side(f.R, xR, false);
}
function flows() {
  const st = ST(), host = $("#ov-flows"); if (!host) return;
  const sel = curSite(), list = st.sites();
  if (!sel) {
    host.innerHTML = `<div class="card stack"><div class="row" style="justify-content:space-between"><h3>Each mine at a glance: water in → water out</h3><span class="small">Band width = volume. Hatched = water the report cannot account for. Click a mine to open it.</span></div><div class="flow-grid" id="flow-grid"></div></div>`;
    const g = $("#flow-grid");
    list.forEach(n => {
      const f = flowData(n), c = document.createElement("button"); c.className = "flow-card"; c.type = "button";
      c.innerHTML = `<div class="row" style="justify-content:space-between"><b>${esc(n)}</b>${f ? `<span class="pill ${f.status[0]}">${f.status[1]}</span>` : `<span class="pill crit">no water data</span>`}</div><div class="fc-chart"></div><div class="fc-nums">${f ? `<span>in <b>${fmt(f.s.W)}</b> ML</span><span>out <b>${f.s.D != null && f.s.C != null ? fmt(f.s.D + f.s.C + Math.max(0, f.s.dS || 0)) : "–"}</b> ML</span>${f.s.R ? `<span>↻ ${fmt(f.s.R)} ML reused</span>` : ""}` : `<span class="small">Not in the report. The WU Wien model puts it near ${fmt((Y.sites[n] && Y.sites[n]["2019"] && Y.sites[n]["2019"].fresh) || null)} ML.</span>`}</div>`;
      if (f) drawFlow(c.querySelector(".fc-chart"), f, false);
      c.addEventListener("click", () => { const b = document.querySelector(`#chips button[data-s="${CSS.escape(n)}"]`); if (b) b.click(); });
      g.appendChild(c);
    });
  } else {
    const f = flowData(sel);
    host.innerHTML = `<div class="card stack"><div class="row" style="justify-content:space-between"><h3>${esc(sel)}: where the water comes from and where it goes</h3>${f ? `<span class="pill ${f.status[0]}">${f.status[1]}</span>` : ""}</div><div class="chart" id="flow-big"></div>${f ? `<div class="fc-nums big"><span>Water in <b>${fmt(f.s.W)}</b> ML</span><span>Water out <b>${f.s.D != null && f.s.C != null ? fmt(f.s.D + f.s.C) : "–"}</b> ML</span><span>Storage change <b>${f.s.dS != null ? fmt(f.s.dS) : "not reported"}</b></span><span>Reused inside the site <b>${f.s.R != null ? fmt(f.s.R) + " ML" : "not reported"}</b></span></div>` : ""}<p class="small">See this mine over the years on <a href="#" id="go-years">Years &amp; output</a>, and its cost on <a href="#" id="go-cost">Water cost</a>.</p></div>`;
    if (f) drawFlow($("#flow-big"), f, true); else $("#flow-big").innerHTML = `<p class="small">${esc(sel)} reports no water figures. Enter them by hand, or see the model estimate on Years &amp; output.</p>`;
    $("#go-years").addEventListener("click", e => { e.preventDefault(); $("#t-years").click(); });
    $("#go-cost").addEventListener("click", e => { e.preventDefault(); $("#t-cost").click(); });
  }
}

/* ---------- years & output ---------- */
function intensities(n) {
  const d = Y.sites[n] || {};
  return Object.keys(d).filter(y => d[y].fresh != null && d[y].ore).map(y => ({ y, mt: d[y].fresh * 1000 / d[y].ore, moz: d[y].oz ? d[y].fresh * 1000 / d[y].oz : null }));
}
function years() {
  const n = curSite() || SITE_DEFAULT, d = Y.sites[n];
  $("#yr-title").textContent = `${n}: water and output over the years`;
  $("#yr-hint").textContent = curSite() ? "" : `Showing ${SITE_DEFAULT}. Pick a site above to switch.`;
  if (!d) { $("#yr-chart").innerHTML = `<p class="small">No history for ${esc(n)}.</p>`; $("#yr-table").innerHTML = ""; $("#yr-pred").innerHTML = ""; return; }
  // chart: freshwater by year, coloured by where the number comes from
  const ys = Y.years, vals = ys.map(y => d[y] && d[y].fresh), max = Math.max(...vals.filter(v => v != null), 1) * 1.15;
  const W = 760, L = 64, R = 20, top = 16, H = 250, ph = H - top - 36, bw = (W - L - R) / ys.length;
  const G = svgRoot($("#yr-chart"), W, H, "Freshwater withdrawal by year");
  const step = max > 60000 ? 20000 : max > 25000 ? 5000 : max > 8000 ? 2000 : 1000;
  for (let t = 0; t <= max; t += step) { el("line", { x1: L, x2: W - R, y1: top + ph - t / max * ph, y2: top + ph - t / max * ph, class: "gridline" }, G); txt(G, L - 8, top + ph - t / max * ph + 4, fmt(t), "t-muted t-mono", "end"); }
  txt(G, L - 8, 11, "ML", "t-muted t-mono", "end");
  ys.forEach((y, i) => {
    const r = d[y], x = L + i * bw + bw * .2, w = bw * .6;
    txt(G, x + w / 2, H - 12, y === "2020" ? "FY20" : y, "t-muted t-mono", "middle");
    if (!r || r.fresh == null) { txt(G, x + w / 2, top + ph - 6, "not in file", "t-muted", "middle"); return; }
    const src = r.src || "", c = /model/i.test(src) ? "var(--muted)" : /GRI data file/.test(src) ? "var(--q1)" : "var(--q2)";
    const h = r.fresh / max * ph, b = el("rect", { x, y: top + ph - h, width: w, height: h, rx: 3, fill: c }, G);
    txt(G, x + w / 2, top + ph - h - 6, fmt(r.fresh), "t-ink t-mono", "middle");
    hover(b, `${n} · ${y}`, [fmt(r.fresh) + " ML freshwater", r.ore ? fmt(r.ore / 1e6, 1) + " Mt ore milled" : "ore: not in file", src]);
  });
  // table
  const rows = ys.filter(y => d[y]);
  $("#yr-table").innerHTML = `<thead><tr><th>Year</th><th class="r">Freshwater ML</th><th class="r">Ore milled Mt</th><th class="r">Gold-eq koz</th><th class="r">m³ per t ore</th><th class="r">m³ per oz</th><th>Source</th></tr></thead><tbody>` +
    rows.map(y => { const r = d[y], mt = r.fresh != null && r.ore ? r.fresh * 1000 / r.ore : null, mo = r.fresh != null && r.oz ? r.fresh * 1000 / r.oz : null;
      return `<tr><td>${y === "2020" ? "FY20" : y === "2019" && r.ore ? "2019 / FY19" : y}</td><td class="r">${fmt(r.fresh)}</td><td class="r">${r.ore ? fmt(r.ore / 1e6, 1) : "–"}</td><td class="r">${r.oz ? fmt(r.oz / 1000) : "–"}</td><td class="r">${fmt(mt, 2)}</td><td class="r">${fmt(mo, 1)}</td><td class="small">${esc(r.src)}</td></tr>`; }).join("") + "</tbody>";
  predictor(n);
}
function predictor(n) {
  const I = intensities(n), d = Y.sites[n], last = d["2020"] || {};
  const box = $("#yr-pred");
  if (!I.length || !last.ore) { box.innerHTML = `<p class="small">${esc(n)} has no year with both water and output in the file, so there is nothing to learn from yet. One reported year is enough to start.</p>`; return; }
  const mts = I.map(x => x.mt), mean = mts.reduce((a, b) => a + b, 0) / mts.length;
  const spread = mts.length > 1 ? (Math.max(...mts) - Math.min(...mts)) / 2 : mean * .10; // one year: ±10% (assumed)
  const lo = mean - spread, hi = mean + spread, ozPerT = last.oz / last.ore, revPerOz = last.rev ? last.rev * 1e6 / last.oz : null;
  const base = last.fresh || (d["2019"] && d["2019"].fresh);
  if (!box.dataset.site || box.dataset.site !== n) {
    box.dataset.site = n;
    box.innerHTML = `<div class="slider"><label for="yp-w">Freshwater available next year <output id="yp-wo"></output></label><input type="range" id="yp-w" min="${Math.round(base * .5)}" max="${Math.round(base * 1.3)}" step="${Math.max(10, Math.round(base / 200))}" value="${base}"></div>
      <div class="kpis k3" id="yp-k"></div><p class="note" id="yp-note"></p>`;
    $("#yp-w").addEventListener("input", () => predictor(n));
  }
  const w = +$("#yp-w").value;
  $("#yp-wo").textContent = fmt(w) + " ML (" + fmt(w / base * 100) + "% of FY20)";
  const ore = w * 1000 / mean, oreLo = w * 1000 / hi, oreHi = w * 1000 / lo, oz = ore * ozPerT;
  $("#yp-k").innerHTML = [
    [fmt(ore / 1e6, 1) + " Mt", "ore that water can process", `range ${fmt(oreLo / 1e6, 1)}–${fmt(oreHi / 1e6, 1)} Mt`],
    [fmt(oz / 1000) + " koz", "gold-equivalent output", `at FY20 grade, ${fmt(ozPerT * 1000, 2)} oz per 1,000 t`],
    [revPerOz ? "$" + fmt(oz * revPerOz / 1e6) + "m" : "–", "revenue that water supports", revPerOz ? `vs $${fmt(last.rev)}m in FY20` : ""]
  ].map(k => `<div class="kpi"><div class="v">${k[0]}</div><div class="l">${k[1]}</div><div class="d">${k[2]}</div></div>`).join("");
  $("#yp-note").innerHTML = `<b>How it predicts:</b> ${n} used ${I.map(x => `${fmt(x.mt, 2)} m³ per tonne in ${x.y}`).join(" and ")}. We apply the average (${fmt(mean, 2)} m³/t) to the water you set; the range comes from the year-to-year spread${mts.length > 1 ? "" : " (±10% assumed with only one year)"}. Every extra reported year narrows it.`;
}

/* ---------- water cost ---------- */
const COST = { "Surface water": 0.20, "Groundwater": 0.50, "Third-party water": 1.20, "Seawater": 0.05, "Produced water": 0.10, discharge: 0.40 };
const COST_KEYS = ["Surface water", "Groundwater", "Third-party water", "Seawater", "discharge"];
const COST_COL = { "Surface water": "--s1", "Groundwater": "--s2", "Third-party water": "--s4", "Seawater": "--s3", discharge: "--muted" };
function costInit() {
  $("#cost-ctl").innerHTML = COST_KEYS.map(k => `<div class="slider"><label for="c-${k.replace(/\W/g, "")}">${k === "discharge" ? "Treating and discharging" : k} <output id="co-${k.replace(/\W/g, "")}"></output></label><input type="range" id="c-${k.replace(/\W/g, "")}" min="0" max="3" step="0.05" value="${COST[k]}"></div>`).join("");
  COST_KEYS.forEach(k => $("#c-" + k.replace(/\W/g, "")).addEventListener("input", e => { COST[k] = +e.target.value; cost(); }));
}
function siteCost(n) {
  const st = ST(), rows = st.wrows().filter(r => r[0] === n), s = st.S[n];
  const by = {}; rows.forEach(r => { const k = r[2] === "Ground water" ? "Groundwater" : r[2]; by[k] = (by[k] || 0) + r[3]; });
  const parts = COST_KEYS.map(k => [k, k === "discharge" ? (s.D || 0) * 1000 * COST.discharge / 1e6 : (by[k] || 0) * 1000 * (COST[k] || 0) / 1e6]);
  const total = parts.reduce((a, p) => a + p[1], 0);
  return { n, parts, total, oz: s.oz, ore: s.ore, rev: s.rev, has: s.W != null };
}
function cost() {
  COST_KEYS.forEach(k => $("#co-" + k.replace(/\W/g, "")).textContent = "$" + COST[k].toFixed(2) + "/m³");
  const st = ST(), list = st.sites().map(siteCost).filter(c => c.has);
  const max = Math.max(...list.map(c => c.total), .01) * 1.1;
  const W = 760, L = 110, R = 90, rh = 38, top = 10, H = top + list.length * rh + 30;
  const G = svgRoot($("#cost-chart"), W, H, "Water cost by site and source");
  list.forEach((c, i) => {
    const y = top + i * rh; txt(G, L - 10, y + rh / 2 + 4, c.n, "t-ink", "end");
    let x = L; c.parts.forEach(([k, v]) => { const w = v / max * (W - L - R); if (w <= 0) return; const r = el("rect", { x, y: y + 8, width: Math.max(w - 2, 1), height: rh - 16, rx: 3, fill: `var(${COST_COL[k]})` }, G); hover(r, `${c.n} · ${k === "discharge" ? "treating and discharging" : k}`, ["$" + fmt(v, 2) + "m per year"]); x += w; });
    txt(G, x + 8, y + rh / 2 + 4, "$" + fmt(c.total, 1) + "m", "t-ink t-mono");
  });
  $("#cost-legend").innerHTML = COST_KEYS.map(k => `<span><i class="sw" style="background:var(${COST_COL[k]})"></i>${k === "discharge" ? "Treating and discharging" : k}</span>`).join("");
  const tot = list.reduce((a, c) => a + c.total, 0);
  $("#cost-table").innerHTML = `<thead><tr><th>Site</th><th class="r">Water cost / yr</th><th class="r">per oz gold-eq</th><th class="r">per t ore</th><th class="r">% of revenue</th></tr></thead><tbody>` +
    list.map(c => `<tr><td>${esc(c.n)}</td><td class="r">$${fmt(c.total, 1)}m</td><td class="r">${c.oz ? "$" + fmt(c.total * 1e6 / c.oz, 2) : "–"}</td><td class="r">${c.ore ? "$" + fmt(c.total * 1e6 / c.ore, 3) : "–"}</td><td class="r">${c.rev ? fmt(c.total / c.rev * 100, 2) + "%" : "–"}</td></tr>`).join("") +
    `<tr><td><b>Company</b></td><td class="r"><b>$${fmt(tot, 1)}m</b></td><td></td><td></td><td></td></tr></tbody>`;
  const cad = list.find(c => c.n === "Cadia");
  $("#cost-note").innerHTML = `<b>What this shows:</b> the direct bill is small next to revenue, which is why water rarely gets managed as a cost. The real exposure is the revenue that stops when water runs short: see <a href="risk.html">Water-at-Risk</a>.` + (cad ? ` Cadia buys ${fmt(st.wrows().filter(r => r[0] === "Cadia" && /Third/.test(r[2])).reduce((a, r) => a + r[3], 0))} ML from third parties, its most expensive source.` : "");
}

/* ---------- source codes ---------- */
function codes() {
  $("#code-table").innerHTML = `<thead><tr><th>Code in the file</th><th>What it is</th><th>Rows</th><th>Goes to</th><th>Split into</th><th class="r">Values</th><th>Status</th></tr></thead><tbody>` +
    window.NCM_CODEMAP.map(c => `<tr><td><span class="code">${esc(c.code)}</span></td><td>${esc(c.title)}</td><td class="small">${esc(c.rows)}</td><td><b>${esc(c.field)}</b></td><td class="small">${esc(c.split)}</td><td class="r">${c.values}</td><td>${c.status === "auto" ? '<span class="pill good">mapped</span>' : '<span class="pill warn">check</span>'}</td></tr>`).join("") + "</tbody>";
  $("#row-table").innerHTML = `<thead><tr><th>Label in the file</th><th>Meaning</th><th>Becomes</th></tr></thead><tbody>` +
    window.NCM_ROWMAP.map(r => `<tr><td><span class="code">${esc(r[0])}</span></td><td>${esc(r[1])}</td><td>${esc(r[2])}${r[3] ? ` · <b>${esc(r[3])}</b>` : ""}</td></tr>`).join("") + "</tbody>";
}

/* ---------- download ---------- */
function csv() {
  const st = ST(), out = [["site", "year", "metric", "value", "unit", "source"]];
  st.sites().forEach(n => {
    const s = st.S[n];
    [["withdrawal_total", s.W, "ML"], ["withdrawal_freshwater", s.fresh, "ML"], ["withdrawal_seawater", s.sea, "ML"], ["discharge", s.D, "ML"], ["storage_change", s.dS, "ML"], ["consumption", s.C, "ML"], ["recycled_reused", s.R, "ML"], ["ore_milled", s.ore, "t"], ["gold_eq", s.oz, "oz"], ["revenue", s.rev, "US$m"]]
      .forEach(([m, v, u]) => { if (v != null) out.push([n, "FY20", m, v, u, s.source === "entered" ? "entered by hand" : "GRI data file"]); });
    st.wrows().filter(r => r[0] === n).forEach(r => out.push([n, "FY20", `withdrawal_cat${r[1]}_${r[2].toLowerCase().replace(/\W+/g, "_")}`, r[3], "ML", "GRI 303-3"]));
    const c = siteCost(n); if (c.has) out.push([n, "FY20", "water_cost_estimate", c.total.toFixed(3), "US$m/yr", "unit costs set on the Water cost tab (assumed)"]);
    const h = Y.sites[n] || {}; Object.keys(h).forEach(y => { if (y === "2020") return; const r = h[y]; if (r.fresh != null) out.push([n, y, "withdrawal_freshwater", r.fresh, "ML", r.src]); if (r.ore) out.push([n, y, "ore_milled", r.ore, "t", r.src]); if (r.oz) out.push([n, y, "gold_eq", r.oz, "oz", r.src]); });
  });
  const text = out.map(r => r.map(v => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = "minewater-ledger-export.csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
$("#btn-csv").addEventListener("click", csv);
$("#btn-print").addEventListener("click", () => window.print());

/* ---------- wiring ---------- */
let costReady = false;
function renderExtras() {
  header();
  if (!ST().loaded()) return;
  flows(); sources(); years(); codes();
  if (!costReady) { costInit(); costReady = true; }
  cost();
}
document.addEventListener("mwl:render", renderExtras);
header();
})();
