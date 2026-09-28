(function () {
"use strict";
const NS = "http://www.w3.org/2000/svg", $ = s => document.querySelector(s);
const fmt = (x, d = 0) => x == null || isNaN(x) ? "–" : Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function el(tag, a, p) { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
function txt(p, x, y, s, cls, anchor) { const t = el("text", { x, y, class: cls || "", "text-anchor": anchor || "start" }, p); t.textContent = s; return t; }
function svg(host, w, h, label) { host.innerHTML = ""; const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label }); host.appendChild(s); return s; }
const tip = $("#tip");
function showTip(e, t, lines) { tip.innerHTML = `<div class="tt">${esc(t)}</div>` + lines.map(l => `<div class="tv">${esc(l)}</div>`).join(""); tip.classList.add("on"); moveTip(e); }
function moveTip(e) { let x = e.clientX + 14, y = e.clientY + 14; const r = tip.getBoundingClientRect(); if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; }
function hideTip() { tip.classList.remove("on"); }
function hover(n, t, l) { n.addEventListener("mouseenter", e => showTip(e, t, typeof l === "function" ? l() : l)); n.addEventListener("mousemove", moveTip); n.addEventListener("mouseleave", hideTip); }
function seg(id, cb) { const g = $(id); g.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); cb(b.dataset.v); }); return () => g.querySelector('[aria-pressed="true"]').dataset.v; }

/* tabs */
const tabs = [...document.querySelectorAll(".tab")];
function openTab(id) { tabs.forEach(t => { const on = t.id === "t-" + id; t.setAttribute("aria-selected", on); $("#" + t.getAttribute("aria-controls")).hidden = !on; }); try { localStorage.setItem("mwl-tab", id); } catch (e) {} }
tabs.forEach(t => t.addEventListener("click", () => openTab(t.id.slice(2))));

/* state */
const REF = window.MWL_REF, R = window.MWLRules;
const LIB = REF.sites.slice();
const REVIEW = REF.reviewQueue.slice();
const RECORDS = [];
const coName = id => (REF.companies.find(c => c.id === id) || { name: id }).name;

/* ---------- overview flow ---------- */
(function flow() {
  const s = svg($("#flow"), 1000, 150, "From company files to checked site ledgers");
  const steps = [["Company files", ".xlsx · .xlsm · .csv", "any layout"], ["Ingest engine", "water tables, units → ML", "cell kept for each value"], ["Site ledger", "W · D · ΔS · C · R · quality", "one format for all"], ["Rule engine", "balance · 12 checks · grade", "ICMM 2021 · GRI 303"], ["Outputs", "review queue · site grades", "portfolio simulation"]];
  const w = 172, gap = (1000 - 5 * w) / 4;
  const d = el("defs", {}, s), m = el("marker", { id: "ar", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, d); el("path", { d: "M0 0L10 5L0 10z", fill: "var(--muted)" }, m);
  steps.forEach((st, i) => { const x = i * (w + gap); el("rect", { x: x + 1, y: 20, width: w - 2, height: 96, rx: 6, fill: i === 1 || i === 3 ? "var(--copper-soft)" : "var(--surface-2)", stroke: "var(--rule-2)" }, s);
    txt(s, x + 14, 48, st[0], "t-ink").style.fontWeight = 600; txt(s, x + 14, 72, st[1], ""); txt(s, x + 14, 94, st[2], "t-muted");
    if (i < 4) el("line", { x1: x + w + 4, x2: x + w + gap - 4, y1: 68, y2: 68, stroke: "var(--muted)", "stroke-width": 1.5, "marker-end": "url(#ar)" }, s); });
  txt(s, 0, 142, "Anything the engine cannot settle (two candidate values, an unknown unit) goes to a person before it enters a ledger.", "t-muted");
})();
(function passCount() { const chk = LIB.map(x => R.balance(x)).filter(b => b.status !== "unchecked"); $("#ov-pass").innerHTML = `${chk.filter(b => b.status === "pass").length} of ${chk.length}<small>site balances close</small>`; })();

/* ---------- ingest ---------- */
function renderRun() {
  const rows = REF.ingestRun;
  const tot = rows.reduce((a, r) => (a.rec += r.records, a.use += r.usable, a), { rec: 0, use: 0 });
  $("#run-table").innerHTML = `<thead><tr><th>Company</th><th class="r">Sheets</th><th class="r">Water sheets</th><th class="r">Values</th><th>Confidence</th><th class="r">Usable</th><th class="r">Sites</th><th>Years</th></tr></thead><tbody>` +
    rows.map(r => { const t = r.records || 1; return `<tr><td>${esc(r.company)}<div class="ref">${esc(r.file)}</div></td><td class="r">${r.sheets}</td><td class="r">${r.waterSheets}</td><td class="r">${fmt(r.records)}</td><td><div class="score"><span class="bar" style="display:flex">${["high", "medium", "low"].map(k => `<i style="width:${r[k] / t * 100}%;background:var(${k === "high" ? "--good" : k === "medium" ? "--q2" : "--crit"})"></i>`).join("")}</span></div><div class="ref">${r.high} high · ${r.medium} medium · ${r.low} low</div></td><td class="r">${fmt(r.usable)}</td><td class="r">${r.sites}</td><td class="mono small">${r.years}</td></tr>`; }).join("") +
    `<tr><td><b>Total</b></td><td></td><td></td><td class="r"><b>${fmt(tot.rec)}</b></td><td></td><td class="r"><b>${fmt(tot.use)}</b></td><td></td><td></td></tr></tbody>`;
}
function renderReview() {
  $("#review-table").innerHTML = `<thead><tr><th>Company</th><th>Issue</th><th>Kind</th></tr></thead><tbody>` + REVIEW.map(r => `<tr><td>${esc(r.company)}</td><td>${esc(r.issue)}<div class="ref">${esc(r.detail)}</div></td><td><span class="pill ${r.kind === "unit" ? "warn" : r.kind === "definition" ? "crit" : "info"}">${esc(r.kind)}</span></td></tr>`).join("") + "</tbody>";
}
function renderRecords() {
  if (!RECORDS.length) return;
  const show = RECORDS.filter(r => ["withdrawal", "discharge", "consumption", "recycled", "storage_change", "omw", "water_use"].includes(r.metric)).slice(0, 400);
  $("#rec-sum").textContent = `${fmt(RECORDS.length)} values from ${new Set(RECORDS.map(r => r.file)).size} file(s). Showing volumes (first 400).`;
  $("#rec-table").innerHTML = `<thead><tr><th>Site</th><th>Year</th><th>Metric</th><th class="r">ML</th><th>Cell</th><th>Conf.</th></tr></thead><tbody>` + show.map(r => `<tr><td>${esc(r.site || "(company)")}${r.source ? `<div class="ref">${esc(r.source)}${r.quality ? " · " + esc(r.quality) : ""}</div>` : ""}</td><td class="mono">${r.year || "–"}</td><td>${esc(r.metric)}</td><td class="r">${fmt(r.value_ml, r.value_ml < 10 ? 2 : 0)}</td><td class="ref">${esc(r.sheet)}!${esc(r.cell)}<div>${esc(String(r.label).slice(0, 40))}</div></td><td><span class="pill ${r.confidence === "high" ? "good" : r.confidence === "medium" ? "info" : "warn"}">${r.confidence}</span></td></tr>`).join("") + "</tbody>";
}
async function ingest(name, buf) {
  const msg = $("#ingest-msg"); msg.textContent = `Reading ${name}…`;
  try {
    const t0 = performance.now();
    const res = await window.MWLIngest.ingestFile(name, buf);
    RECORDS.push(...res.records);
    const company = name.replace(/\.(xlsx|xlsm|csv)$/i, "").slice(0, 40);
    const { ledgers, review } = R.ledgersFromRecords(res.records, "UP:" + company);
    REF.companies.push({ id: "UP:" + company, name: company + " (uploaded)", file: name, format: "uploaded", verified: "not reviewed" });
    ledgers.forEach(l => LIB.push(l)); REVIEW.unshift(...review.slice(0, 12));
    const conf = { high: 0, medium: 0, low: 0 }; res.records.forEach(r => conf[r.confidence]++);
    REF.ingestRun.unshift({ company: company + " (this session)", file: name, sheets: res.sheetsTotal, waterSheets: res.waterSheets.length, records: res.records.length, ...conf, usable: res.records.filter(r => r.value_ml != null).length, sites: new Set(res.records.filter(r => r.site).map(r => r.site)).size, years: [...new Set(res.records.map(r => r.year))].filter(Boolean).sort().join(", ") });
    msg.textContent = `${name}: ${fmt(res.records.length)} values from ${res.waterSheets.length} water sheet(s) in ${Math.round(performance.now() - t0)} ms. ${ledgers.length} ledgers added to Site checks.`;
    renderRun(); renderReview(); renderRecords(); fillSites();
  } catch (e) { msg.textContent = `${name}: ${e.message}`; }
}
const drop = $("#drop"), fileIn = $("#file");
drop.addEventListener("click", () => fileIn.click());
drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileIn.click(); } });
fileIn.addEventListener("change", async () => { for (const f of fileIn.files) await ingest(f.name, /\.csv$/i.test(f.name) ? await f.text() : await f.arrayBuffer()); });
drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", async e => { e.preventDefault(); drop.classList.remove("over"); for (const f of e.dataTransfer.files) await ingest(f.name, /\.csv$/i.test(f.name) ? await f.text() : await f.arrayBuffer()); });
const needServer = "Start the app with run_local.bat (localhost) to load files from its folders; or drop the file above.";
$("#load-ncm").addEventListener("click", async () => {
  const name = "201104_Newcrest 2020 Sustainability Report - GRI Content Index and supplementary data.xlsx";
  try { const r = await fetch("samples/" + encodeURIComponent(name)); if (!r.ok) throw 0; await ingest(name, await r.arrayBuffer()); } catch (e) { $("#ingest-msg").textContent = needServer; }
});
$("#load-sources").addEventListener("click", async () => {
  try {
    const html = await (await fetch("sources/")).text();
    const files = [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("a")].map(a => decodeURIComponent(a.getAttribute("href"))).filter(h => /\.(xlsx|xlsm|csv)$/i.test(h));
    if (!files.length) { $("#ingest-msg").textContent = "The sources folder is empty. Put company workbooks into minewater-ledger/sources and try again."; return; }
    for (const f of files) { const r = await fetch("sources/" + encodeURIComponent(f)); await ingest(f, /\.csv$/i.test(f) ? await r.text() : await r.arrayBuffer()); }
  } catch (e) { $("#ingest-msg").textContent = needServer; }
});

/* ---------- site checks ---------- */
const sel = $("#site-select");
function fillSites() {
  const cur = sel.value;
  sel.innerHTML = LIB.map((s, i) => `<option value="${i}">${esc(coName(s.co))} · ${esc(s.site)} · ${s.year}</option>`).join("");
  sel.value = cur && LIB[cur] ? cur : String(LIB.findIndex(s => s.site === "Telfer"));
  drawSite(); drawLib();
}
sel.addEventListener("change", drawSite);
function lutterFor(s) { if (!s.lutter) return null; const m = window.MWL_LUTTER.find(x => x[0] === s.lutter); if (!m) return null; const i = Math.min(4, Math.max(0, s.year - 2015)); return { mine: m[0], year: 2015 + i, nw: m[3][i], tot: m[4][i] }; }
function drawSite() {
  const s = LIB[+sel.value]; if (!s) return;
  const b = R.balance(s), c = R.completeness(s, LIB), it = R.intensity(s), lu = lutterFor(s);
  $("#site-meta").textContent = [s.country, s.metal, s.cells ? "cells " + s.cells : ""].filter(Boolean).join(" · ");
  const pill = { pass: ["good", "Balance closes"], fail: ["crit", `Does not close · ${b.pct > 0 ? "+" : ""}${fmt(b.pct, 1)}%`], construction: ["warn", "Closes by construction"], unchecked: ["crit", "Cannot be checked"] }[b.status];
  $("#bal-status").innerHTML = `<div class="eyebrow">${esc(coName(s.co))} · ${esc(s.site)} · ${s.year}</div><div style="margin-top:6px"><span class="pill ${pill[0]}">${pill[1]}</span></div><p class="small" style="margin-top:8px">${esc(s.notes || "")}${b.status === "unchecked" ? " (" + b.reason + ")" : ""}</p>`;
  const W = 560, L = 60, Rr = 90, H = 170, host = $("#bal-chart");
  if (b.status === "unchecked") {
    const v = s.W != null ? s.W : lu ? lu.nw : null;
    const g = svg(host, W, 90, "Available data"); if (v != null) { const x = (W - L - Rr) * 0.8; el("rect", { x: L, y: 20, width: x, height: 34, rx: 3, fill: s.W != null ? "var(--q2)" : "var(--copper-soft)", stroke: s.W != null ? "none" : "var(--copper)" }, g); txt(g, L - 8, 42, s.W != null ? "In" : "Model", "t-ink", "end"); txt(g, L + x + 8, 42, fmt(v) + " ML", "t-ink t-mono"); txt(g, L, 78, s.W != null ? "Outflows not reported" : "Only a model estimate exists (Lutter et al.)", "t-muted"); }
  } else {
    const inflow = b.inflow + Math.max(0, -b.dS), out = s.D + s.C + Math.max(0, b.dS), max = Math.max(inflow, out) * 1.03, x = v => v / max * (W - L - Rr);
    const g = svg(host, W, H, "Water balance");
    const d = el("defs", {}, g), p = el("pattern", { id: "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, d); el("rect", { width: 6, height: 6, fill: "var(--copper-soft)" }, p); el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "var(--copper)", "stroke-width": 2.4 }, p);
    const rowY = [24, 90], bh = 38;
    let cx;
    const segm = (y, v, fill, t) => { if (v <= 0) return; const r = el("rect", { x: cx, y, width: Math.max(x(v) - 2, 1.5), height: bh, rx: 3, fill }, g); hover(r, t, [fmt(v) + " ML"]); cx += x(v); };
    txt(g, L - 8, rowY[0] + 24, "In", "t-ink", "end"); txt(g, L - 8, rowY[1] + 24, "Out", "t-ink", "end");
    cx = L; segm(rowY[0], s.W, "var(--q2)", "Withdrawal"); segm(rowY[0], s.Wsea || 0, "var(--q3)", "Seawater withdrawal"); segm(rowY[0], s.OMW || 0, "var(--s3)", "Other managed water"); if (b.dS < 0) segm(rowY[0], -b.dS, "var(--q1)", "From storage"); if (b.gap > 0) segm(rowY[0], b.gap, "url(#hatch)", "Unexplained");
    txt(g, cx + 6, rowY[0] + 24, fmt(inflow + Math.max(0, b.gap)), "t-ink t-mono");
    cx = L; segm(rowY[1], s.D, "var(--ink-2)", "Discharge"); segm(rowY[1], s.C, "var(--copper)", "Consumption (reported)"); if (b.dS > 0) segm(rowY[1], b.dS, "var(--q1)", "To storage"); if (b.gap < 0) segm(rowY[1], -b.gap, "url(#hatch)", "Unexplained");
    txt(g, cx + 6, rowY[1] + 24, fmt(out + Math.max(0, -b.gap)), "t-ink t-mono");
    txt(g, L, 160, "blue: in · grey: discharge · copper: consumption · hatched: unexplained gap", "t-muted");
  }
  $("#bal-eq").innerHTML = b.status === "unchecked" ? "" : `<div class="row"><span class="lbl">Withdrawal${s.Wsea ? " + seawater" : ""}${s.OMW ? " + other managed water" : ""}</span><span>${fmt(b.inflow)}</span></div><div class="row"><span class="lbl">− Discharge</span><span>${fmt(s.D)}</span></div><div class="row"><span class="lbl">− Change in storage</span><span>${b.dSassumed ? "– (read as 0)" : fmt(b.dS)}</span></div><div class="row"><span class="lbl">= Consumption by balance</span><span>${fmt(b.expected)}</span></div><div class="row"><span class="lbl">Consumption reported</span><span>${fmt(s.C)}</span></div><div class="row total"><span class="lbl">Gap</span><span>${b.gap > 0 ? "+" : ""}${fmt(b.gap)} ML · ${fmt(b.pct, 1)}%</span></div>`
    + (lu ? `<div class="row" style="margin-top:8px"><span class="lbl">Lutter model, ${esc(lu.mine)} ${lu.year}: new water</span><span>${fmt(lu.nw)}</span></div>` : "")
    + (it.m3_per_t ? `<div class="row"><span class="lbl">m³ per tonne ore</span><span>${fmt(it.m3_per_t, 2)}</span></div>` : "");
  $("#grade").textContent = c.grade; $("#grade").className = "grade g-" + c.grade; $("#grade-t").textContent = `Grade ${c.grade} · ${c.score} of 12`;
  $("#chk-table").innerHTML = "<tbody>" + c.checks.map(k => `<tr><td>${esc(k.name)}<div class="ref">${esc(k.ref)}</div></td><td class="c"><span class="mark ${k.ok ? "y" : "n"}">${k.ok ? "✓" : "✕"}</span></td></tr>`).join("") + "</tbody>";
}
function drawLib() {
  $("#lib-table").innerHTML = `<thead><tr><th>Company</th><th>Site</th><th>Year</th><th class="r">Withdrawal</th><th class="r">Discharge</th><th class="r">Consumption</th><th>Balance</th><th class="c">Grade</th></tr></thead><tbody>` +
    LIB.map((s, i) => { const b = R.balance(s), c = R.completeness(s, LIB); const st = { pass: "good", fail: "crit", construction: "warn", unchecked: "info" }[b.status];
      return `<tr data-i="${i}" style="cursor:pointer"><td>${esc(coName(s.co))}</td><td>${esc(s.site)}</td><td class="mono">${s.year}</td><td class="r">${fmt(s.W)}</td><td class="r">${fmt(s.D)}</td><td class="r">${fmt(s.C)}</td><td><span class="pill ${st}">${b.status === "fail" ? fmt(b.pct, 1) + "%" : b.status}</span></td><td class="c"><span class="grade g-${c.grade}" style="width:24px;height:24px;font-size:13px">${c.grade}</span></td></tr>`; }).join("") + "</tbody>";
  $("#lib-table").querySelectorAll("tr[data-i]").forEach(tr => tr.addEventListener("click", () => { sel.value = tr.dataset.i; drawSite(); window.scrollTo({ top: $("#p-sites").offsetTop, behavior: "smooth" }); }));
}

/* ---------- simulation ---------- */
const known = {}; LIB.forEach(s => { if (s.lutter) { const b = R.balance(s); known[s.lutter] = s.C != null && s.D != null ? "full" : "partial"; } });
const gSc = seg("#sc-seg", drawSim);
["s-today", "s-pass", "s-err", "s-year"].forEach(id => $("#" + id).addEventListener("input", drawSim));
function drawSim() {
  const today = +$("#s-today").value / 100, pass = +$("#s-pass").value / 100, err = +$("#s-err").value / 100, year = +$("#s-year").value;
  $("#o-today").textContent = Math.round(today * 100) + "%"; $("#o-pass").textContent = Math.round(pass * 100) + "%"; $("#o-err").textContent = "±" + Math.round(err * 100) + "%"; $("#o-year").textContent = year;
  const res = window.MWLSim.run({ scenario: gSc(), today, passNow: pass, modelErr: err, known });
  const r = res.rows.find(x => x.year === year), r0 = res.rows[0];
  const pct = v => fmt(v / r.total * 100, 0) + "%";
  $("#kpis").innerHTML = [
    [pct(r.vFull + r.vPart), "of copper-mine water reported at site level", `${pct(r0.vFull + r0.vPart).replace(/.*/, fmt((r0.vFull + r0.vPart) / r.total * 100, 0) + "%")} in 2026`],
    [pct(r.vVerified), "in a full ledger that balances", `${fmt(r0.vVerified / r.total * 100, 0)}% in 2026`],
    [fmt(r.vDark / 1e6, 2) + " km³", "modelled only (no report)", `± ${fmt(r.band / 1e6, 2)} km³ model error`],
    [fmt(r.nFull), "mines with a full ledger", `of ${res.n} mines`]
  ].map(k => `<div class="kpi"><div class="v">${k[0]}</div><div class="l">${k[1]}</div><div class="d">${k[2]}</div></div>`).join("");
  const W = 1000, L = 50, Rr = 20, top = 16, H = 280, ph = H - top - 40, n = res.rows.length, bw = (W - L - Rr) / n;
  const g = svg($("#sim-chart"), W, H, "Share of water volume by reporting status");
  const d = el("defs", {}, g), p = el("pattern", { id: "hatch2", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, d); el("rect", { width: 6, height: 6, fill: "var(--copper-soft)" }, p); el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "var(--copper)", "stroke-width": 2.4 }, p);
  const y = v => top + ph - v * ph;
  [0, .25, .5, .75, 1].forEach(t => { el("line", { x1: L, x2: W - Rr, y1: y(t), y2: y(t), class: "gridline" }, g); txt(g, L - 8, y(t) + 4, t * 100 + "%", "t-muted t-mono", "end"); });
  res.rows.forEach((row, i) => {
    const x = L + i * bw + 4, w = bw - 8; let base = 0;
    [[row.vVerified, "var(--q1)", "Full ledger, balances"], [row.vFull - row.vVerified, "var(--q2)", "Full ledger, gap > 5%"], [row.vPart, "var(--q3)", "Partial"], [row.vDark, "url(#hatch2)", "Modelled only"]].forEach(([v, fill, lab]) => {
      const h = v / row.total * ph; if (h <= 0) return; const rc = el("rect", { x, y: y(base) - h, width: w, height: Math.max(h - 1.5, 0.5), fill, rx: 2 }, g); if (fill.startsWith("url")) rc.setAttribute("stroke", "var(--copper)");
      hover(rc, `${row.year} · ${lab}`, [fmt(v / 1e3) + " GL", fmt(v / row.total * 100, 1) + "% of volume"]); base += v / row.total; });
    const t = txt(g, x + w / 2, H - 20, row.year, row.year === year ? "t-ink t-mono" : "t-muted t-mono", "middle"); if (row.year === year) t.style.fontWeight = 600;
  });
  txt(g, L, H - 4, `${res.scenario} · volumes are 2019 new water per mine (Lutter et al.), held constant`, "t-muted");
  $("#prio-table").innerHTML = `<thead><tr><th>Mine</th><th>Country</th><th class="r">New water 2019 (ML)</th><th>Starts reporting</th></tr></thead><tbody>` + res.priority.map(m => `<tr><td>${esc(m.mine)}</td><td>${esc(m.country)}</td><td class="r">${fmt(m.V)}</td><td class="mono">${m.until}</td></tr>`).join("") + "</tbody>";
}

/* init */
renderRun(); renderReview(); fillSites(); drawSim();
let start = "overview"; try { start = localStorage.getItem("mwl-tab") || start; } catch (e) {}
if (location.hash && tabs.some(t => t.id === "t-" + location.hash.slice(1))) start = location.hash.slice(1);
openTab(tabs.some(t => t.id === "t-" + start) ? start : "overview");
})();
