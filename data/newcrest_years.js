/* Multi-year view for the sample company (Newcrest Mining). ML, tonnes, troy oz.
   FY20: GRI 300 sheet rows 106-179 (site water), 302-3 rows 72 and 91 (ore milled, gold-eq oz).
   FY19 production: "Restatements" sheet rows 42 and 48 (ore processed, gold-eq oz) of the same FY20 file.
   Company withdrawal FY18-FY20: GRI 300 sheet rows 133-137.
   Site water 2016-2019: Lutter et al. (2025) compilation; for Telfer and Cadia these are whole numbers that match
   company reports (calendar years in the study vs Newcrest's July-June year: treat the pairing as approximate).
   Add more years by appending to `sites[...]` - every chart and table reads from here. */
window.NCM_YEARS = {
  years: ["2016", "2017", "2018", "2019", "2020"],
  company: {
    "2018": { W: 322121, fresh: 322121, low: null, note: "FY18 'high quality' equals total: seawater at Lihir was counted as Category 2 before 2019" },
    "2019": { W: 361730, fresh: 144017, low: 217713 },
    "2020": { W: 354742, fresh: 132061, low: 222681 }
  },
  sites: {
    Cadia: {
      "2016": { fresh: 20754, src: "Lutter compilation" }, "2017": { fresh: 31755, src: "Lutter compilation" }, "2018": { fresh: 16409, src: "Lutter compilation" },
      "2019": { fresh: 13420, ore: 29302113, oz: 1413454, src: "Lutter compilation + FY19 production (Restatements)" },
      "2020": { fresh: 14362, ore: 29346774, oz: 1372682, rev: 1802, src: "FY20 GRI data file" }
    },
    Telfer: {
      "2016": { fresh: 18617, src: "Lutter compilation" }, "2017": { fresh: 17459, src: "Lutter compilation" }, "2018": { fresh: 16137, src: "Lutter compilation" },
      "2019": { fresh: 17744, ore: 22734119, oz: 535226, src: "Lutter compilation + FY19 production (Restatements)" },
      "2020": { fresh: 17627, ore: 16209458, oz: 482883, rev: 579, src: "FY20 GRI data file" }
    },
    Lihir: {
      "2019": { fresh: null, ore: 13350443, oz: 932784, src: "FY19 production (Restatements); site water not in this file" },
      "2020": { fresh: 92214, ore: 13798024, oz: 775978, rev: 1196, src: "FY20 GRI data file" }
    },
    Gosowong: {
      "2019": { fresh: null, ore: 707911, oz: 190186, src: "FY19 production (Restatements); site water not in this file" },
      "2020": { fresh: 7858, ore: 478185, oz: 103282, rev: 160, src: "FY20 GRI data file" }
    },
    "Red Chris": {
      "2016": { fresh: 5006, src: "Lutter model estimate" }, "2017": { fresh: 4857, src: "Lutter model estimate" }, "2018": { fresh: 4065, src: "Lutter model estimate" },
      "2019": { fresh: 4914, src: "Lutter model estimate" }, "2020": { fresh: null, rev: 185, src: "not reported" }
    }
  }
};

/* Where each figure came from in the file: disclosure code -> field. Shown on the "Source codes" tab. */
window.NCM_CODEMAP = [
  { code: "303-3", title: "Water withdrawal by source", rows: "106–128", field: "Withdrawal", split: "Category 1 / 2 / 3 × surface, ground, sea, produced, third-party", values: 85, status: "auto" },
  { code: "303-3", title: "Water withdrawal FY18–20", rows: "133–137", field: "Withdrawal history (company)", split: "high quality (Cat 1+2) / low quality (Cat 3)", values: 9, status: "auto" },
  { code: "ICMM – WAF", title: "Water recycled and reused", rows: "140–142", field: "Recycled", split: "per site", values: 4, status: "auto" },
  { code: "303-4", title: "Water discharge by destination", rows: "145–168", field: "Discharge", split: "Category 1 / 2 / 3 × surface, ground, sea, third-party", values: 52, status: "auto" },
  { code: "303-5", title: "Change in on-site water storage", rows: "172–174", field: "Storage change", split: "per site; '-' kept as 'not reported'", values: 4, status: "review" },
  { code: "303-5", title: "Total water consumption", rows: "177–179", field: "Consumption", split: "per site", values: 4, status: "auto" },
  { code: "302-3", title: "Ore milled; gold-equivalent ounces", rows: "72, 91", field: "Production (denominator)", split: "per site", values: 12, status: "auto" },
  { code: "302-3 (restated)", title: "FY19 ore processed; gold-equivalent ounces", rows: "Restatements 42, 48", field: "Production FY19", split: "per site", values: 12, status: "auto" },
  { code: "201-1", title: "Revenue by operation", rows: "GRI 200 sheet", field: "Revenue (US$m)", split: "per site", values: 5, status: "auto" }
];
window.NCM_ROWMAP = [
  ["Category 1", "Freshwater, near drinking quality", "ICMM high quality", "freshwater"],
  ["Category 2", "Freshwater, needs treatment", "ICMM high quality", "freshwater"],
  ["Category 3", "Low quality (seawater, saline groundwater)", "ICMM low quality", "other water"],
  ["Surface water", "Rivers, lakes, rain captured on site", "source", ""],
  ["Ground water", "Bores and pit dewatering", "source", ""],
  ["Sea water", "Ocean intake", "source", ""],
  ["Produced water", "Water entrained in ore", "source", ""],
  ["Third-party water", "Bought from a utility or another user", "source", ""],
  ["'-' / 'n/a'", "Not reported / not applicable", "kept as a flag, never as zero", ""]
];
