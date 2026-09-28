/* MineWater Ledger — portfolio simulation over the 447 copper mines in Lutter et al. (2019 volumes).
   Deterministic: every mine gets a fixed pseudo-random draw, so the same settings always give the same result. */
(function (root) {
  "use strict";
  const hash = (s, salt) => { let h = 2166136261 ^ salt; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
  const REGION_W = { "Oceania": 1.6, "North America": 1.3, "Latin America & Caribbean": 1.1, "Europe & Central Asia": 1.0, "Africa": 0.8, "East Asia": 0.25, "South and West Asia": 0.3 }; // assumption
  const YEARS = Array.from({ length: 11 }, (_, i) => 2026 + i);
  const SCEN = {
    none: { label: "Nothing changes", reportUp: 0.01, fullShare: [0.40, 0.45], passTo: null },
    reg: { label: "Regulation only", reportUp: 0.03, fullShare: [0.40, 0.65], passTo: 0.5 },
    ledger: { label: "Regulation + site ledger", reportUp: null, fullShare: [0.40, 0.95], passTo: 0.9 }
  };
  function universe(known) {
    return root.MWL_LUTTER.filter(m => m[3][4] != null).map(m => ({ mine: m[0], country: m[1], region: m[2], V: m[3][4], T: m[4][4], known: known[m[0]] || null }));
  }
  function run(opts) {
    const { scenario = "ledger", today = 0.26, modelErr = 0.30, passNow = 0.17, known = {} } = opts;
    const S = SCEN[scenario];
    const U = universe(known);
    const total = U.reduce((a, m) => a + m.V, 0);
    // today's reporters: known ones first, then by region weight x draw, until the volume share reaches `today`
    U.forEach(m => { m.p = m.known ? 99 : (REGION_W[m.region] || 1) * (0.5 + hash(m.mine, 1)); m.full = m.known === "full" || (!m.known && hash(m.mine, 2) < S.fullShare[0]); });
    const byP = [...U].sort((a, b) => b.p - a.p);
    let acc = 0; byP.forEach(m => { m.rep0 = acc / total < today; if (m.rep0) acc += m.V; });
    // who moves next: under the site-ledger scenario, buyers ask the biggest mines first; otherwise the order is regional
    const order = scenario === "ledger" ? [...U].sort((a, b) => b.V - a.V) : byP;
    const rows = YEARS.map((y, t) => {
      let shareTarget;
      if (scenario === "ledger") shareTarget = today + (0.92 - today) / (1 + Math.exp(-0.75 * (t - 4)));
      else shareTarget = Math.min(0.98, today + S.reportUp * t * (scenario === "reg" && t >= 1 ? 1.5 : 1));
      if (t === 0) shareTarget = today;
      let a = 0; const rep = new Set();
      U.filter(m => m.rep0).forEach(m => { rep.add(m.mine); a += m.V; });
      for (const m of order) { if (a / total >= shareTarget) break; if (!rep.has(m.mine)) { rep.add(m.mine); a += m.V; } }
      const fullShare = S.fullShare[0] + (S.fullShare[1] - S.fullShare[0]) * t / 10;
      const pass = S.passTo == null ? passNow : passNow + (S.passTo - passNow) * Math.min(1, t / (scenario === "ledger" ? 5 : 10));
      let vFull = 0, vPart = 0, vDark = 0, nFull = 0, nRep = 0, vVerified = 0;
      const status = {};
      for (const m of U) {
        if (rep.has(m.mine)) {
          nRep++;
          const full = m.known === "full" || (m.known !== "partial" && hash(m.mine, 2) < fullShare);
          if (full) { vFull += m.V; nFull++; if (hash(m.mine, 3) < pass) vVerified += m.V; status[m.mine] = "full"; }
          else { vPart += m.V; status[m.mine] = "partial"; }
        } else { vDark += m.V; status[m.mine] = "dark"; }
      }
      return { year: y, total, vFull, vPart, vDark, vVerified, nFull, nRep, n: U.length, band: vDark * modelErr, status };
    });
    const last = rows[rows.length - 1];
    const priority = U.filter(m => rows[0].status[m.mine] === "dark").sort((a, b) => b.V - a.V).slice(0, 12)
      .map(m => ({ ...m, until: (rows.find(r => r.status[m.mine] !== "dark") || { year: "after 2036" }).year }));
    return { rows, priority, total, n: U.length, scenario: S.label, last };
  }
  root.MWLSim = { run, SCEN, YEARS, REGION_W };
})(window);
