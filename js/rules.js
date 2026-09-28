/* MineWater Ledger — rule engine. Pure functions over one site ledger (ML). */
(function (root) {
  "use strict";
  const n = v => v != null && !isNaN(v);
  function balance(s) {
    if (!n(s.W) || !n(s.C) || !n(s.D)) return { status: "unchecked", reason: !n(s.W) ? "no withdrawal" : !n(s.C) ? "no consumption reported" : "no discharge reported" };
    const inflow = s.W + (s.Wsea || 0) + (s.OMW || 0);
    const dS = n(s.dS) ? s.dS : 0;
    const expected = inflow - s.D - dS;
    const gap = s.C - expected;
    const pct = inflow ? gap / inflow * 100 : 0;
    let status = Math.abs(pct) <= 5 ? "pass" : "fail";
    if (status === "pass" && (s.flags || []).includes("sea_discharge_unknown")) status = "construction";
    return { status, inflow, dS, dSassumed: !n(s.dS), expected, gap, pct };
  }
  const CHECKS = [
    ["Withdrawal reported", "ICMM 1.2a · GRI 303-3", s => n(s.W)],
    ["Split by quality (high/low)", "ICMM 1.2a · Table 6", s => n(s.Whigh)],
    ["Seawater separated", "ICMM 1.2a", s => n(s.Wsea)],
    ["Discharge reported", "ICMM 1.2c · GRI 303-4", s => n(s.D)],
    ["Consumption reported", "ICMM 1.2d · GRI 303-5", s => n(s.C)],
    ["Change in storage", "ICMM Table 4 · GRI 303-5", s => n(s.dS)],
    ["Recycled / reused", "ICMM 3.6", s => n(s.R) || n(s.RR)],
    ["Other managed water", "ICMM 1.2b", s => n(s.OMW)],
    ["Balance closes (±5%)", "ICMM §2.4", s => balance(s).status === "pass"],
    ["Water-stress flag", "ICMM 1.3 · 2.6", s => !!s.stress],
    ["Accuracy statement", "ICMM §2.4 (WAF)", s => !!s.accuracy],
    ["Three or more years", "trend", (s, lib) => lib.filter(x => x.co === s.co && x.site === s.site).length >= 3]
  ];
  function completeness(s, lib) {
    const res = CHECKS.map(([name, ref, f]) => ({ name, ref, ok: !!f(s, lib || []) }));
    const score = res.filter(r => r.ok).length;
    const grade = score >= 10 ? "A" : score >= 8 ? "B" : score >= 6 ? "C" : score >= 4 ? "D" : "E";
    return { checks: res, score, grade };
  }
  function intensity(s) {
    const out = {};
    if (n(s.W) && s.ore_t) out.m3_per_t = s.W * 1000 / s.ore_t;
    if (n(s.W) && s.oz) out.m3_per_oz = s.W * 1000 / s.oz;
    if (n(s.W) && s.rev) out.ml_per_musd = s.W / s.rev;
    if (n(s.R) && n(s.W)) out.recycled_share = s.R / (s.R + s.W);
    return out;
  }
  /* Turn extracted records into site ledgers; conflicts become review items. */
  function ledgersFromRecords(records, company) {
    const by = {};
    const review = [];
    for (const r of records) {
      if (r.value_ml == null || !r.year) continue;
      const site = r.site || "(company total)";
      const k = site + "|" + r.year;
      const L = by[k] = by[k] || { co: company, site, year: r.year, W: null, Wsea: null, Whigh: null, OMW: null, D: null, dS: null, C: null, R: null, USE: null, cells: [], _c: {} };
      const slot = r.metric === "withdrawal" ? (r.source === "seawater" ? "Wsea" : r.source ? null : (r.quality === "high" ? "Whigh" : "W"))
        : r.metric === "discharge" ? (r.source ? null : "D") : r.metric === "consumption" ? "C" : r.metric === "recycled" ? "R"
        : r.metric === "storage_change" ? "dS" : r.metric === "omw" ? (r.source ? null : "OMW") : r.metric === "water_use" ? "USE" : null;
      if (!slot) continue;
      (L._c[slot] = L._c[slot] || []).push(r);
      L[slot] = r.value_ml;
      L.cells.push(r.sheet + "!" + r.cell);
    }
    const out = Object.values(by).map(L => {
      for (const [slot, arr] of Object.entries(L._c)) {
        const vals = [...new Set(arr.map(a => Math.round(a.value_ml)))];
        if (vals.length > 1) review.push({ company, issue: `${vals.length} candidate values for ${L.site} ${L.year} ${slot}`, detail: vals.map(v => v.toLocaleString("en-US")).join(" · ") + " ML", kind: "ambiguous table" });
      }
      if (L.W == null && L.Whigh != null) L.W = L.Whigh;
      delete L._c; L.cells = [...new Set(L.cells)].slice(0, 6).join(", "); L.notes = "Extracted automatically; not yet reviewed.";
      return L;
    });
    return { ledgers: out, review };
  }
  root.MWLRules = { balance, completeness, intensity, ledgersFromRecords, CHECKS };
})(window);
