/* MineWater Ledger — reference library.
   Site ledgers taken from company files in Dr. Lutter's "Water and copper / Data / Reports" folder (WU Wien SharePoint),
   read by js/ingest.js and checked by hand. Units: ML (megalitres, 1 ML = 1,000 m³). null = not reported.
   W = withdrawal (operational, excl. seawater unless stated), Wsea = seawater withdrawal, Whigh = high-quality (Cat 1+2) withdrawal,
   OMW = other managed water, D = discharge, dS = change in storage, C = consumption, R = recycled/reused, USE = total water use (new + recycled),
   RR = reuse rate (0-1). lutter = matching mine name in Lutter et al. 2025. */
window.MWL_REF = {
  companies: [
    { id: "NCM", name: "Newcrest Mining", file: "201104_Newcrest 2020 Sustainability Report - GRI Content Index and supplementary data.xlsx", format: "GRI data workbook, sites as columns", verified: "by hand, cell by cell" },
    { id: "FQM", name: "First Quantum Minerals", file: "First Quantum mines 2019-2021.xlsx", format: "Lutter compilation of FQM ESG data summary, years as columns", verified: "by hand; equals Lutter 2019 values" },
    { id: "TECK", name: "Teck Resources", file: "Teck-2022_Sustainability-Performance-Data(2).xlsx", format: "Performance data workbook, sites as columns (sheet Water Stewardship, rows 71-76)", verified: "labels checked by hand" },
    { id: "AEM", name: "Agnico Eagle", file: "Agnico-Eagle-2019-Sustainability-Performance-Data.xlsx", format: "Performance data workbook, m³, sites as columns", verified: "unit conversion checked by hand" },
    { id: "LUT", name: "Lutter compilation (New Gold, PanAust)", file: "Capstone_Newgold_Teck_et al_water data.xlsx", format: "researcher's hand compilation, mixed units", verified: "by hand" }
  ],
  sites: [
    // ---- Newcrest FY20 (Jul 2019 - Jun 2020). GRI 300 sheet rows 106-179; GRI 200 row 49-53; 302-3 rows 72, 91.
    { co: "NCM", site: "Lihir", country: "Papua New Guinea", metal: "gold", year: 2020, W: 92214, Wsea: 222149, Whigh: 92214, D: 38041, dS: null, C: 276322, R: 17309, ore_t: 13798024, oz: 775978, rev: 1196, lutter: null, flags: ["sea_discharge_unknown"],
      notes: "Seawater (Cat 3) used in processing; seawater discharge volume 'unknown', so all seawater is booked as consumed.", cells: "F120, F124, F128, F168, F179, F142" },
    { co: "NCM", site: "Telfer", country: "Australia", metal: "gold-copper", year: 2020, W: 18159, Wsea: 0, Whigh: 17627, D: 3667.21, dS: null, C: 18159, R: 4081, ore_t: 16209458, oz: 482883, rev: 579, lutter: "Telfer",
      notes: "Reported consumption equals withdrawal although 3,667 ML was discharged.", cells: "G120, G128, G168, G179, G142" },
    { co: "NCM", site: "Cadia", country: "Australia", metal: "gold-copper", year: 2020, W: 14362, Wsea: 0, Whigh: 14362, D: 638, dS: -480, C: 13056, R: 70455, ore_t: 29346774, oz: 1372682, rev: 1802, lutter: "Cadia East",
      notes: "Oct 2019: Orange on level 5 restrictions; Cadia returned 2 ML/day of ~30 ML/day.", cells: "H120, H128, H168, H174, H179, H142" },
    { co: "NCM", site: "Gosowong", country: "Indonesia", metal: "gold", year: 2020, W: 7858, Wsea: 0, Whigh: 7858, D: null, dS: null, C: null, R: null, ore_t: 478185, oz: 103282, rev: 160, lutter: null,
      notes: "Divested 4 Mar 2020: discharge, storage and consumption not disclosed.", cells: "I120, I128" },
    { co: "NCM", site: "Red Chris", country: "Canada", metal: "copper-gold", year: 2020, W: null, Wsea: null, Whigh: null, D: null, dS: null, C: null, R: null, ore_t: null, oz: null, rev: 185, lutter: "Red Chris",
      notes: "Owned since Aug 2019; revenue and workforce reported, no water or energy data.", cells: "GRI 200 E53" },

    // ---- First Quantum 2019-2021 (Tabelle1 rows 24-39). W excludes seawater; Cobre Panama cooling seawater reported separately.
    ...[
      ["Çayeli", "Turkey", "copper-zinc", [3750, 3972, 4440], [287, 244, 256], [4411.76, 4565.52, 5162.79], [0.15, 0.13, 0.14], "Cayeli"],
      ["Cobre las Cruces", "Spain", "copper", [2047, 3143, 3020], [0, 0, 0], [2924.29, 5238.33, 5298.25], [0.30, 0.40, 0.43], "Las Cruces"],
      ["Cobre Panama", "Panama", "copper", [121848, 113321, 138073], [446748, 468517, 438064], [297190.24, 377736.67, 627604.55], [0.59, 0.70, 0.78], "Cobre Panama"],
      ["Guelb Moghrein", "Mauritania", "copper-gold", [2327, 2486, 2610], [0, 0, 0], [8618.52, 8878.57, 9321.43], [0.73, 0.72, 0.72], "Guelb Moghrein"],
      ["Kansanshi", "Zambia", "copper-gold", [45681, 43075, 46776], [0, 0, 0], [207640.91, 179479.17, 137576.47], [0.78, 0.76, 0.66], "Kansanshi"],
      ["Pyhäsalmi", "Finland", "copper-zinc", [4871, 4395, 4130], [0, 0, 0], [6765.28, 5860, 7245.61], [0.28, 0.25, 0.43], "Pyhasalmi"],
      ["Ravensthorpe", "Australia", "nickel", [555, 1011, 756], [125, 5516, 5576], [555, 1773.68, 1400], [null, 0.43, 0.46], null],
      ["Sentinel", "Zambia", "copper", [66362, 60908, 57526], [0, 0, 0], [201096.97, 138427.27, 147502.56], [0.67, 0.56, 0.61], "Trident - Sentinel"]
    ].flatMap(([site, country, metal, W, S, U, RR, lut]) => [2019, 2020, 2021].map((year, i) => ({
      co: "FQM", site, country, metal, year, W: W[i], Wsea: S[i], Whigh: null, D: null, dS: null, C: null, R: RR[i] != null ? Math.round(U[i] - W[i]) : null, USE: U[i], RR: RR[i], lutter: lut,
      notes: site === "Cobre Panama" ? "The same workbook also lists 581,900 ML for 2020 — withdrawal including seawater used to cool the power plant." : "Withdrawal and total water use only; no discharge or consumption.",
      cells: "Tabelle1 rows 27-39" }))),

    // ---- Teck 2022, sheet Water Stewardship rows 71-76 (ML). No site-level storage change.
    ...[
      ["Highland Valley Copper", "Canada", "copper", 17180, 11232, 1863, 24212, 53205, 70385, "Highland Valley"],
      ["Carmen de Andacollo", "Chile", "copper", 10500, 1316, 2212, 8734, 31117, 40577, "Carmen de Andacollo"],
      ["Quebrada Blanca", "Chile", "copper", 2139, 912, 312, 2305, 20580, 22750, "Quebrada Blanca"],
      ["Red Dog", "USA", "zinc", 5013, 8143, 13213, 1580, 6805, 11818, null],
      ["Elkview", "Canada", "coal", 3556, 44262, 40164, 2342, 0, 3556, null],
      ["Fording River", "Canada", "coal", 6091, 82808, 75840, 3515, 18792, 24882, null],
      ["Line Creek", "Canada", "coal", 956, 28645, 29099, 1638, 523, 1479, null],
      ["Greenhills", "Canada", "coal", 2266, 7010, 10455, 1464, 3110, 5376, null],
      ["Trail", "Canada", "smelter", 69626, 0, 62513, 7113, 0, 69626, null]
    ].map(([site, country, metal, W, OMW, D, C, R, USE, lut]) => ({
      co: "TECK", site, country, metal, year: 2022, W, OMW, Wsea: 0, Whigh: null, D, dS: null, C, R, USE, lutter: lut,
      notes: "Balance uses withdrawal + other managed water; storage change not reported per site.", cells: "Water Stewardship C71:L76" })),

    // ---- Agnico Eagle 2019, sheet Water Management rows 9, 20, 21, 26 (m³ converted to ML).
    ...[
      ["LaRonde", "Canada", 1130.41, 5375.6, 4245.19, 4179.23, "LaRonde"],
      ["Goldex", "Canada", 1833.15, 5408.4, 3575.25, 987.3, null],
      ["Kittilä", "Finland", 1880.31, 5584.42, 3704.11, 3800.26, null],
      ["Pinos Altos", "Mexico", 1164.98, 4424.57, 3259.59, 515.82, null],
      ["La India", "Mexico", 918.9, 944.15, 25.25, null, null],
      ["Meadowbank", "Canada", 2280.84, 2889.27, 608.44, 7589.6, null],
      ["Meliadine", "Canada", 323.62, 1407.02, 1083.4, 335.68, null]
    ].map(([site, country, W, USE, R, D, lut]) => ({
      co: "AEM", site, country, metal: "gold", year: 2019, W, Wsea: 0, Whigh: W, D, dS: null, C: null, R, USE, lutter: lut,
      notes: "Freshwater withdrawal, recycling and discharge reported; consumption not reported, so the balance cannot be checked.", cells: "Water Management C9:I26" })),

    // ---- Lutter compilation (researcher's own sheet)
    ...[[2016, 2905.95, 11989.31], [2018, 3104.26, 13014.3], [2019, 2518.45, 11600], [2020, 2800, null], [2021, 2700, null]].map(([year, W, R]) => ({
      co: "LUT", site: "New Afton", country: "Canada", metal: "copper-gold", year, W, Wsea: 0, Whigh: null, D: null, dS: null, C: null, R, USE: R != null ? W + R : null, lutter: "New Afton",
      notes: "New Gold data compiled by Lutter; 2019 value equals the study's input.", cells: "New Gold!C3:H4" })),
    { co: "LUT", site: "Phu Kham", country: "Laos", metal: "copper-gold", year: 2020, W: 7094, Wsea: 0, Whigh: 7094, D: null, dS: null, C: null, R: 30403, USE: 37496, lutter: "Phu Kham", notes: "PanAust; recycled water booked as 'other surface water' withdrawal.", cells: "PanAust!B16:B25" },
    { co: "LUT", site: "Phu Kham", country: "Laos", metal: "copper-gold", year: 2021, W: 5585, Wsea: 0, Whigh: 5585, D: null, dS: null, C: null, R: 23515, USE: 29100, lutter: "Phu Kham", notes: "PanAust; recycled water booked as 'other surface water' withdrawal.", cells: "PanAust!H16:H25" }
  ],

  /* Automated run of js/ingest.js over the 12 Tier-1 workbooks (28 Sep 2026, in the browser, files read from SharePoint). */
  ingestRun: [
    { company: "Newcrest Mining", file: "201104_Newcrest … GRI Content Index and supplementary data.xlsx", sheets: 7, waterSheets: 4, records: 161, high: 12, medium: 149, low: 0, usable: 161, sites: 4, years: "2018–2020" },
    { company: "Lutter compilation", file: "Capstone_Newgold_Teck_et al_water data.xlsx", sheets: 8, waterSheets: 5, records: 214, high: 0, medium: 141, low: 73, usable: 94, sites: 3, years: "2015–2021" },
    { company: "First Quantum", file: "First Quantum mines 2019-2021.xlsx", sheets: 1, waterSheets: 1, records: 253, high: 147, medium: 106, low: 0, usable: 124, sites: 8, years: "2019–2021" },
    { company: "Teck Resources", file: "Teck-2022_Sustainability-Performance-Data(2).xlsx", sheets: 20, waterSheets: 5, records: 807, high: 0, medium: 605, low: 202, usable: 331, sites: 11, years: "2015–2022" },
    { company: "Newmont", file: "Newmont-2019-ESG-Data-Tables-Locked_Final.xlsx", sheets: 39, waterSheets: 7, records: 759, high: 7, medium: 732, low: 20, usable: 201, sites: 0, years: "2015–2019" },
    { company: "Evolution Mining", file: "Evolution mining_EVN_FY24-ESG-Performance-Data_web.xlsx", sheets: 16, waterSheets: 7, records: 194, high: 100, medium: 88, low: 6, usable: 115, sites: 9, years: "2020–2024" },
    { company: "BHP", file: "BHP_230822_ESGStandardsandDatabook2023.xlsx", sheets: 25, waterSheets: 15, records: 521, high: 138, medium: 10, low: 373, usable: 148, sites: 1, years: "2019–2023" },
    { company: "MMG", file: "MMG-SR-Appendix-B-2022.xlsx", sheets: 19, waterSheets: 7, records: 20, high: 0, medium: 10, low: 10, usable: 0, sites: 0, years: "–" },
    { company: "Freeport-McMoRan", file: "Freeport McMoRan_2022_ESG_Trend_Data(2).xlsm", sheets: 33, waterSheets: 7, records: 761, high: 0, medium: 675, low: 86, usable: 330, sites: 0, years: "2018–2022" },
    { company: "OceanaGold", file: "OceanaGold_2022.xlsx", sheets: 5, waterSheets: 1, records: 75, high: 0, medium: 0, low: 75, usable: 0, sites: 0, years: "–" },
    { company: "Agnico Eagle", file: "Agnico-Eagle-2019-Sustainability-Performance-Data.xlsx", sheets: 11, waterSheets: 4, records: 274, high: 73, medium: 138, low: 63, usable: 76, sites: 7, years: "2015–2019" },
    { company: "Barrick Gold", file: "Barrick_2019-GRI-Index.xlsx", sheets: 15, waterSheets: 2, records: 0, high: 0, medium: 0, low: 0, usable: 0, sites: 0, years: "–" }
  ],

  /* What the automated run could not resolve on its own: these go to a person. */
  reviewQueue: [
    { company: "First Quantum", issue: "Two withdrawal figures for Cobre Panama 2020 in one workbook", detail: "113,321 ML (excl. seawater) vs 581,900 ML (incl. ~468,500 ML seawater used for power-plant cooling).", kind: "definition" },
    { company: "Teck Resources", issue: "Six candidate values for 2022 company consumption", detail: "52,904 · 45,791 · 26,324 · 19,211 · 4,866 · 11,040 ML across sub-tables (by quality, by stress area).", kind: "ambiguous table" },
    { company: "BHP", issue: "Five candidate totals for FY2023 withdrawal", detail: "408,540 · 270,120 · 87,890 · 50,520 · 29,710 ML: totals incl./excl. seawater, other managed water and by type.", kind: "ambiguous table" },
    { company: "Newmont", issue: "Unit written as 'thousand kiloliters'", detail: "Parsed as kL; values are 1,000× too small until a person confirms 'thousand kL = ML'.", kind: "unit" },
    { company: "Evolution Mining", issue: "Recycled volume found in a tailings table", detail: "Mixes tonnes and Mm³; rejected.", kind: "unit" },
    { company: "OceanaGold", issue: "75 values, no unit anywhere on the sheet", detail: "All held at low confidence.", kind: "unit" },
    { company: "Barrick Gold", issue: "Water sheet laid out as free text", detail: "No year or site header found; 0 values extracted.", kind: "layout" },
    { company: "Newcrest Mining", issue: "FY18 'high quality' withdrawal equals FY18 total", detail: "322,121 ML both; no restatement note for water.", kind: "definition" }
  ],

  units: ["ML", "m³", "kL", "thousand m³", "Mm³", "thousand kL"]
};
