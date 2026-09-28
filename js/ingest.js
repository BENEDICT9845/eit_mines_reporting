/* MineWater Ledger — generic ingestion.
   Reads any .xlsx/.xlsm (no library: native zip + DecompressionStream) or .csv,
   finds water tables, and emits canonical ledger records with provenance.
   Works in the browser; exposes window.MWLIngest. */
(function (root) {
  "use strict";

  /* ---------- zip / xlsx reader ---------- */
  async function unzip(buf) {
    const dv = new DataView(buf);
    let e = buf.byteLength - 22;
    while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e <= 0) throw new Error("Not a zip-based Office file (it may be encrypted or an old .xls)");
    const n = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const out = {};
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const lo = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nl));
      const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true);
      out[name] = { method, data: new Uint8Array(buf, lo + 30 + lnl + lxl, csize) };
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  async function entryText(ent) {
    if (!ent) return null;
    if (ent.method === 0) return new TextDecoder().decode(ent.data);
    const s = new Blob([ent.data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(s).text();
  }
  const colNum = c => c.split("").reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);

  async function readXlsx(buf) {
    const z = await unzip(buf);
    const P = new DOMParser();
    const shared = [];
    const sst = await entryText(z["xl/sharedStrings.xml"]);
    if (sst) P.parseFromString(sst, "application/xml").querySelectorAll("si")
      .forEach(si => shared.push([...si.querySelectorAll("t")].map(t => t.textContent).join("")));
    const wb = P.parseFromString(await entryText(z["xl/workbook.xml"]), "application/xml");
    const rels = P.parseFromString(await entryText(z["xl/_rels/workbook.xml.rels"]), "application/xml");
    const rmap = {};
    rels.querySelectorAll("Relationship").forEach(r => (rmap[r.getAttribute("Id")] = r.getAttribute("Target")));
    const sheets = [];
    for (const s of wb.querySelectorAll("sheet")) {
      const rid = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      let t = rmap[rid] || "";
      t = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\.\//, "");
      const xml = await entryText(z[t]);
      if (!xml) continue;
      const d = P.parseFromString(xml, "application/xml");
      const rows = [];
      d.querySelectorAll("sheetData row").forEach(r => {
        const cells = [];
        r.querySelectorAll("c").forEach(c => {
          const ref = c.getAttribute("r"), ty = c.getAttribute("t");
          const v = c.querySelector("v");
          let val = v ? v.textContent : null;
          if (ty === "s" && val != null) val = shared[+val];
          else if (ty === "inlineStr") val = [...c.querySelectorAll("is t")].map(x => x.textContent).join("");
          if (val != null && String(val).trim() !== "") cells.push({ col: colNum(ref.replace(/\d+/g, "")), ref, v: val, num: ty !== "s" && ty !== "inlineStr" && ty !== "str" && isFinite(+val) });
        });
        if (cells.length) rows.push({ r: +r.getAttribute("r"), cells });
      });
      sheets.push({ name: s.getAttribute("name"), rows });
    }
    return sheets;
  }

  function readCsv(text) {
    const delim = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    const rows = text.split(/\r?\n/).map((line, i) => ({
      r: i + 1,
      cells: line.split(delim).map((v, j) => ({ col: j + 1, ref: "", v: v.trim(), num: v.trim() !== "" && isFinite(+v) })).filter(c => c.v !== "")
    })).filter(r => r.cells.length);
    return [{ name: "csv", rows }];
  }

  /* ---------- vocabulary: label → canonical meaning ---------- */
  const WATER = /water|withdraw|abstract|discharg|effluent|consum|recycl|re-?use|dewater|megalit|seawater/i;
  const METRIC = [
    ["intensity", /intensity|per tonne|per t\b|m3\/t|m³\/t|l\/t|per ounce|per oz/i],
    ["rate", /rate|percent|%|share/i],
    ["recycled", /recycl|re-?use|reclaim|worked water/i],
    ["discharge", /discharg|effluent|release|outflow/i],
    ["consumption", /consum/i],
    ["storage_change", /storage|change in stor/i],
    ["omw", /other managed water|\bOMW\b/i],
    ["water_use", /operational water use|total water use|water used in process|total water used|total water$/i],
    ["withdrawal", /withdraw|abstract|intake|new water|fresh ?water|water (use|usage|input|sourced)|total water$|^water$|water used|dewater/i],
  ];
  const SOURCE = [
    ["seawater", /sea ?water|marine|ocean/i],
    ["groundwater", /ground ?water|bore|aquifer|dewater/i],
    ["surface", /surface|river|lake|rain|precipit|runoff|run-off/i],
    ["third_party", /third[- ]party|municipal|utilit|purchas|supplied|other industrial/i],
    ["produced", /produced|entrain|ore moisture/i],
  ];
  const QUALITY = [["high", /fresh|high[- ]quality|category 1|cat(egory)? ?[12]\b|≤ ?1,?000 ?mg/i], ["low", /low[- ]quality|other water|saline|brackish|category 3|cat 3|> ?1,?000 ?mg/i]];
  const UNITS = [
    [/(^|[^A-Za-z])GL(?![A-Za-z])|gigalit/i, 1000, "GL"],
    [/million (cubic met|m3|m³)|(^|[^A-Za-z])Mm(3|³)(?![A-Za-z0-9])|mln\.? ?m(3|³)|million m/i, 1000, "Mm³"],
    [/thousand (cubic met|m3|m³)|thousand kilolit|'000 ?m(3|³)|(^|[^A-Za-z])km(3|³)(?![A-Za-z0-9])/i, 1, "thousand m³"],
    [/megalit|(^|[^A-Za-z])M[Ll](?![A-Za-z])/, 1, "ML"],
    [/cubic met|(^|[^A-Za-z])m(3|³)(?![A-Za-z0-9])/i, 0.001, "m³"],
    [/kilolit|(^|[^A-Za-z])kL(?![A-Za-z])/i, 0.001, "kL"],
  ];
  const YEAR = v => {
    const s = String(v).replace(/\s*\(\d+\)|\*+|\^/g, "").trim();
    let m = s.match(/^(?:FY|CY)?\s?'?(19|20)(\d{2})(?:\.0)?$/i); if (m) return +(m[1] + m[2]);
    m = s.match(/^FY\s?'?(\d{2})$/i); if (m) return 2000 + +m[1];
    m = s.match(/^(19|20)\d{2}\s?[/-]\s?(\d{2}|\d{4})$/); if (m) return +s.slice(0, 4) + 1;
    return null;
  };
  const pick = (list, s) => { for (const [k, re] of list) if (re.test(s)) return k; return null; };
  const unitOf = s => { for (const [re, f, u] of UNITS) if (re.test(s)) return { factor: f, unit: u }; return null; };

  /* ---------- table detection ---------- */
  const NOT_WATER = /energy|fuel|diesel|natural gas|propane|gasoline|petrol|electric|\bGJ\b|\bMWh\b|emission|CO2|greenhouse|waste rock|cyanide|explosive|lime|reagent|spend|employee|injur/i;
  const isYearHeader = row => {
    const yc = row.cells.map(c => [c.col, YEAR(c.v)]).filter(x => x[1] && x[1] >= 2000 && x[1] <= 2035);
    const nums = row.cells.filter(c => c.num).length;
    return yc.length >= 2 && yc.length >= 0.6 * Math.max(nums, 1) ? yc : null;
  };
  const yearIn = s => { const m = String(s).match(/FY\s?'?(\d{2})\b|\b(20\d{2})\b/i); return m ? (m[1] ? 2000 + +m[1] : +m[2]) : null; };
  const COMPANY = /^(company|total|group|consolidated|overall|all sites|corporate)\b/i;
  function isEntityHeader(row, next) {
    const txt = row.cells.filter(c => !c.num && c.col > 1 && !YEAR(c.v));
    if (txt.length < 2 || row.cells.some(c => c.num)) return null;
    if (next[0] && next[0].r === row.r + 1 && isYearHeader(next[0])) return null; // a column-group label row
    const numCols = new Set();
    next.slice(0, 4).forEach(n => n.cells.forEach(c => { if (c.num) numCols.add(c.col); }));
    const ent = txt.filter(c => numCols.has(c.col));
    return ent.length >= 2 ? ent : null;
  }
  function detect(sheet, file) {
    const out = [], notes = [];
    const rows = sheet.rows;
    const top = rows.slice(0, 6).map(r => r.cells.map(c => c.v).join(" ")).join(" ");
    let cols = null, unitCol = null, ctxMetric = null, ctxSource = null, ctxQuality = null, tableYear = yearIn(sheet.name) || yearIn(file);
    let ctxUnit = unitOf(sheet.name) || unitOf(top), ctxLabel = "", ctxAge = 99;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const yc = isYearHeader(row);
      const ec = !yc && isEntityHeader(row, rows.slice(i + 1));
      if (yc || ec) {
        const fresh = yc ? Object.fromEntries(yc.map(([c, y]) => [c, { year: y }])) : Object.fromEntries(ec.map(c => [c.col, { entity: String(c.v).replace(/\s*\(\d+\)|\s*\(.*?\)/g, "").trim() }]));
        if (yc && i > 0) { // column-group labels in the row above (e.g. "Reuse" | "Total water use")
          const above = rows[i - 1].r === row.r - 1 ? rows[i - 1].cells.filter(c => !c.num && c.col >= Math.min(...yc.map(x => x[0]))) : [];
          for (const k of Object.keys(fresh)) { const g = above.filter(c => c.col <= +k).pop(); if (g && WATER.test(g.v)) { fresh[k].group = String(g.v); fresh[k].groupMetric = pick(METRIC, String(g.v)); } }
        }
        const overlap = cols && Object.keys(fresh).some(k => cols[k]);
        cols = cols && yc && !overlap && Object.values(cols)[0].year ? Object.assign({}, cols, fresh) : fresh;
        const uc = row.cells.find(c => /^units?$|^unit of measure|^uom$/i.test(String(c.v).trim()));
        unitCol = uc ? uc.col : null;
        const lbl = row.cells.filter(c => yc ? !YEAR(c.v) : c.col === 1).map(c => c.v).join(" ");
        const u = unitOf(lbl); if (u) ctxUnit = u;
        if (WATER.test(lbl) && !NOT_WATER.test(lbl)) { ctxMetric = pick(METRIC, lbl) || ctxMetric; ctxLabel = lbl; ctxAge = 0; }
        continue;
      }
      ctxAge++;
      const firstDataCol = cols ? Math.min(...Object.keys(cols).map(Number)) : Infinity;
      const nums = cols ? row.cells.filter(c => c.num && cols[c.col]) : [];
      const text = row.cells.filter(c => !c.num && (!nums.length || c.col < firstDataCol) && c.col !== unitCol).map(c => String(c.v).replace(/\s+/g, " ").trim());
      const label = text.join(" · ");
      const unitCell = unitCol ? row.cells.find(c => c.col === unitCol) : null;
      const u = (unitCell && unitOf(String(unitCell.v))) || unitOf(row.cells.filter(c => !c.num).map(c => c.v).join(" "));
      if (NOT_WATER.test(label)) { if (!nums.length) { ctxMetric = null; ctxLabel = ""; } continue; }
      const m = pick(METRIC, label), src = pick(SOURCE, label), q = pick(QUALITY, label);
      if (!nums.length) {
        if (label && WATER.test(label)) { ctxMetric = m || ctxMetric; ctxSource = src; ctxQuality = q; ctxLabel = label; ctxAge = 0; if (u) ctxUnit = u; const y = yearIn(label); if (y) tableYear = y; }
        else if (label && /category|cat\.?\s?\d|high|low quality/i.test(label)) { ctxQuality = pick(QUALITY, label) || ctxQuality; }
        else if (label.length > 12 && !/^\(?\d+\)|^note|^\*|^source/i.test(label)) { ctxMetric = null; ctxLabel = ""; ctxQuality = null; }
        continue;
      }
      const labelIsWater = WATER.test(label);
      let metric = labelIsWater ? m : null, site = null, source = src, quality = q || ctxQuality;
      if (!metric && ctxMetric && ctxAge < 30 && label) { metric = ctxMetric; if (!src && !/total/i.test(label)) site = text[0]; source = source || ctxSource; }
      else if (metric && !labelIsWater) site = text[0];
      if (!metric) continue;
      if (labelIsWater && m && !site) { ctxMetric = m; ctxSource = src; ctxQuality = q || ctxQuality; ctxLabel = label; ctxAge = 0; if (u) ctxUnit = u; }
      const unit = metric === "rate" ? { factor: null, unit: "ratio" } : metric === "intensity" ? { factor: null, unit: "intensity" } : (u || ctxUnit);
      for (const c of nums) {
        const k = cols[c.col], val = +c.v;
        const cm = k.groupMetric && k.groupMetric !== metric ? k.groupMetric : metric;
        const allSmall = nums.filter(n => (cols[n.col].group || "") === (k.group || "")).every(n => Math.abs(+n.v) <= 1);
        const cu = cm === "rate" || (cm === "recycled" && allSmall) ? { factor: null, unit: "ratio" } : unit;
        const ent = k.entity ? (COMPANY.test(k.entity) ? null : k.entity) : site;
        out.push({
          file, sheet: sheet.name, row: row.r, cell: c.ref || `R${row.r}C${c.col}`,
          label: label || ctxLabel, context: ctxLabel, site: ent, metric: cu && cu.unit === "ratio" ? "rate" : cm, source, quality,
          year: k.year || tableYear, value: val, unit: cu ? cu.unit : "unknown",
          value_ml: cu && cu.factor != null ? val * cu.factor : null,
          confidence: !cu || !(k.year || tableYear) ? "low" : (u ? "high" : "medium")
        });
      }
      if (!unit) notes.push(`${sheet.name} row ${row.r}: no unit found for "${(label || ctxLabel).slice(0, 60)}"`);
    }
    return { records: out, notes };
  }

  async function ingestFile(name, bufOrText) {
    let sheets;
    if (/\.csv$/i.test(name)) sheets = readCsv(typeof bufOrText === "string" ? bufOrText : new TextDecoder().decode(bufOrText));
    else sheets = await readXlsx(bufOrText);
    const water = sheets.filter(s => !NOT_WATER.test(s.name) && s.rows.filter(r => r.cells.some(c => WATER.test(String(c.v)))).length >= 3);
    const res = { file: name, sheetsTotal: sheets.length, waterSheets: water.map(s => s.name), records: [], notes: [] };
    for (const s of water) { const d = detect(s, name); res.records.push(...d.records); res.notes.push(...d.notes); }
    return res;
  }

  root.MWLIngest = { readXlsx, readCsv, detect, ingestFile, YEAR, unitOf };
})(typeof window !== "undefined" ? window : globalThis);
