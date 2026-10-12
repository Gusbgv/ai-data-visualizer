// Built-in datasets. Each one is just a CSV file plus a few chart "specs".
// Any uploaded CSV gets the same treatment automatically (see autoSpecs in engine.js).

const pct = (n, d) => `${Math.round((n / d) * 100)}%`;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const TREATED = "% who sought treatment";

export const BUILT_IN = [
  {
    id: "minds",
    emoji: "🧠",
    name: "Minds in Tech",
    description: "How mental health shows up for tech workers, across ages and workplaces",
    file: "/data/mental-health-tech.csv",
    source: "OSMI Mental Health in Tech Survey 2014 (Kaggle)",
    kpis: (rows) => [
      { value: rows.length.toLocaleString(), label: "tech workers surveyed" },
      { value: pct(rows.filter((r) => r["Sought treatment"] === "Yes").length, rows.length), label: "have sought treatment" },
      { value: pct(rows.filter((r) => ["Yes", "Maybe"].includes(r["Fears career impact"])).length, rows.length), label: "fear or are unsure about career impact" },
    ],
    charts: [
      {
        id: "m1", kind: "group", title: "Who seeks treatment, by age",
        group: "Age group", measure: { type: "pctYes", col: "Sought treatment" }, valueLabel: TREATED,
      },
      {
        id: "m2", kind: "cross", title: "Family history vs seeking treatment",
        row: "Family history", col: "Sought treatment",
        rowOrder: ["Yes", "No"], colOrder: ["Yes", "No"],
        rowLabels: { Yes: "Has family history", No: "No family history" },
        colLabels: { Yes: "Sought treatment", No: "Did not" },
        rowTitle: "Family history of mental illness",
        note: "Each bar is one group of people, split by whether they sought treatment",
      },
      {
        id: "m3", kind: "group", title: "Does knowing your benefits matter?",
        group: "Employer benefits", measure: { type: "pctYes", col: "Sought treatment" }, valueLabel: TREATED,
        order: ["Yes", "No", "Don't know"], labels: { Yes: "Has benefits", No: "No benefits", "Don't know": "Doesn't know" },
        groupLabel: "Does the employer offer mental health benefits?",
      },
      {
        id: "m4", kind: "group", title: "How often it interferes with work",
        group: "Work interference", measure: { type: "count" }, valueLabel: "Number of people",
        filter: { col: "Sought treatment", eq: "Yes" }, order: ["Never", "Rarely", "Sometimes", "Often"],
        note: "Only people who sought treatment",
      },
      { id: "m5", kind: "dist", title: "Ages of the people surveyed", col: "Age" },
      {
        id: "m6", kind: "cross", title: "Would you tell your supervisor? By company size",
        row: "Company size", col: "Would tell supervisor",
        rowOrder: ["1-5", "6-25", "26-100", "100-500", "500-1000", "More than 1000"],
        colOrder: ["Yes", "Some of them", "No"], rowTitle: "Company size (employees)",
      },
    ],
  },
  {
    id: "planets",
    emoji: "🪐",
    name: "Exoplanets",
    description: "Planets found beyond our solar system, and how astronomers found them",
    file: "/data/exoplanets.csv",
    source: "NASA Exoplanet Archive via seaborn-data",
    kpis: (rows) => {
      const years = rows.map((r) => r["Discovery year"]);
      const rv = rows.filter((r) => r["Discovery method"] === "Radial Velocity").length;
      return [
        { value: rows.length.toLocaleString(), label: "planets discovered" },
        { value: `${Math.min(...years)}–${Math.max(...years)}`, label: "years covered" },
        { value: pct(rv, rows.length), label: "found by Radial Velocity" },
      ];
    },
    charts: [
      { id: "p1", kind: "group", title: "Discoveries per year", group: "Discovery year", measure: { type: "count" }, valueLabel: "Planets found", note: "2014 is a partial year" },
      { id: "p2", kind: "group", title: "How planets are found", group: "Discovery method", measure: { type: "count" }, valueLabel: "Planets found", topN: 6 },
      { id: "p5", kind: "dist", title: "When each method made its finds", col: "Discovery year", by: "Discovery method", topN: 5 },
      { id: "p4", kind: "scatter", title: "Orbit length vs planet mass", x: "Orbital period (days)", y: "Mass (Jupiter = 1)", highlightBy: "Discovery method", xLog: true, yLog: true, note: "Log scales" },
      { id: "p3", kind: "group", title: "Typical distance by method", group: "Discovery method", measure: { type: "median", col: "Distance (parsecs)" }, topN: 6, note: "Median distance in parsecs (1 pc ≈ 3.26 light-years)" },
      { id: "p6", kind: "corr", title: "How the planet numbers relate" },
    ],
  },
  {
    id: "world",
    emoji: "🌍",
    name: "World Development",
    description: "Life expectancy, wealth and population for 142 countries, 1952 to 2007",
    file: "/data/world-development.csv",
    source: "Gapminder via plotly/datasets",
    kpis: (rows) => {
      const life = (y) => mean(rows.filter((r) => r.Year === y).map((r) => r["Life expectancy"]));
      const gain = Math.round((life(2007) - life(1952)) * 10) / 10;
      return [
        { value: String(new Set(rows.map((r) => r.Country)).size), label: "countries" },
        { value: "1952–2007", label: "years covered" },
        { value: `+${gain} yrs`, label: "average life expectancy gained" },
      ];
    },
    charts: [
      { id: "w1", kind: "group", title: "Average life expectancy over time", group: "Year", measure: { type: "avg", col: "Life expectancy" } },
      { id: "w3", kind: "scatter", title: "Wealth vs life expectancy (2007)", x: "GDP per person ($)", y: "Life expectancy", size: "Population", label: "Country", highlightBy: "Continent", filter: { col: "Year", eq: 2007 }, xLog: true, note: "Each bubble is a country · log scale" },
      { id: "w2", kind: "dist", title: "Life expectancy spread by continent (2007)", col: "Life expectancy", by: "Continent", filter: { col: "Year", eq: 2007 } },
      { id: "w5", kind: "cross", title: "Life expectancy by continent and year", row: "Continent", col: "Year", measure: { type: "avg", col: "Life expectancy" }, colTitle: "Year" },
      { id: "w4", kind: "group", title: "World population by continent (2007)", group: "Continent", measure: { type: "sum", col: "Population" }, valueLabel: "Population", filter: { col: "Year", eq: 2007 } },
      { id: "w6", kind: "group", title: "Average wealth by continent (2007)", group: "Continent", measure: { type: "avg", col: "GDP per person ($)" }, filter: { col: "Year", eq: 2007 } },
    ],
  },
];
