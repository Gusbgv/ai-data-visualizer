import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import styles from "../styles/app.module.css";
import ChartCard from "../components/ChartCard";
import ChatBot from "../components/ChatBot";
import { Astronaut, SpaceCat, Planet } from "../components/Stickers";
import { BUILT_IN } from "../lib/datasets";
import {
  profileColumns, autoSpecs, autoKpis, measureOptions, measureLabel, compute, takeaway,
} from "../lib/engine";

const PARSE = { header: true, dynamicTyping: true, skipEmptyLines: true };
const STORE_KEY = "cosmic-data-uploads";

function prepare(base, result) {
  const columns = (result.meta.fields || []).filter(Boolean);
  const rows = result.data;
  const profile = profileColumns(rows, columns);
  return { ...base, rows, columns, profile, charts: base.charts || autoSpecs(profile, rows) };
}

function fromUpload(name, text) {
  const result = Papa.parse(text, PARSE);
  const clean = name.replace(/\.[^.]+$/, "");
  return prepare(
    { id: `u-${clean}-${text.length}`, emoji: "📁", name: clean, description: `Your upload · ${result.data.length.toLocaleString()} rows`, source: "Uploaded CSV", uploaded: true, text },
    result
  );
}

export default function Home() {
  const [datasets, setDatasets] = useState(BUILT_IN);
  const [activeId, setActiveId] = useState(BUILT_IN[0].id);
  const [custom, setCustom] = useState({}); // extra charts per dataset
  const [chatOpen, setChatOpen] = useState(false);
  const [chartContext, setChartContext] = useState(null);
  const [request, setRequest] = useState(null);

  const active = datasets.find((d) => d.id === activeId) || datasets[0];

  // Load a built-in dataset's CSV the first time its tab is opened
  useEffect(() => {
    if (active.rows || !active.file) return;
    Papa.parse(active.file, {
      ...PARSE, download: true,
      complete: (r) => setDatasets((ds) => ds.map((d) => (d.id === active.id ? prepare(d, r) : d))),
    });
  }, [active]);

  // Restore uploads saved in this browser
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      if (saved.length) setDatasets((ds) => [...ds, ...saved.map((s) => fromUpload(s.name, s.text))]);
    } catch { /* storage unavailable: uploads just won't persist */ }
  }, []);

  const saveUploads = (list) => {
    try {
      const small = list.filter((d) => d.uploaded && d.text.length < 1_500_000).map((d) => ({ name: d.name, text: d.text }));
      localStorage.setItem(STORE_KEY, JSON.stringify(small));
    } catch { /* ignore */ }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    file.text().then((text) => {
      const ds = fromUpload(file.name, text);
      if (!ds.columns.length) return alert("That file doesn't look like a CSV with a header row.");
      setDatasets((list) => {
        const next = [...list.filter((d) => d.id !== ds.id), ds];
        saveUploads(next);
        return next;
      });
      setActiveId(ds.id);
      setChartContext(null);
    });
  };

  const removeDataset = (id) => {
    setDatasets((list) => {
      const next = list.filter((d) => d.id !== id);
      saveUploads(next);
      return next;
    });
    setActiveId(BUILT_IN[0].id);
  };

  const switchTo = (id) => {
    setActiveId(id);
    setChartContext(null);
    window.scrollTo({ top: document.getElementById("dataset")?.offsetTop - 70 || 0, behavior: "smooth" });
  };

  const charts = [...(active.charts || []), ...(custom[active.id] || [])];
  const kpis = active.rows ? (active.kpis ? active.kpis(active.rows) : autoKpis(active.rows, active.profile)) : [];

  // Short overview of the whole dataset for the AI
  const datasetContext = useMemo(() => {
    if (!active.rows) return { name: active.name };
    return {
      name: active.name, description: active.description, rows: active.rows.length,
      columns: active.profile.map((c) => `${c.name} (${c.type})`),
      highlights: kpis.map((k) => `${k.value} ${k.label}`),
      charts: charts.map((s) => `${s.title}: ${takeaway(s, compute(active.rows, s, active.profile))}`),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, custom]);

  const ask = (ctx, question) => {
    setChartContext(ctx);
    setChatOpen(true);
    setRequest({ id: Date.now(), question, context: ctx });
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Cosmic Data · AI Data Visualizer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.stars2} aria-hidden="true" />
      <SpaceCat className={styles.cat} />

      {/* Hero */}
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>AI Data Visualizer</p>
          <h1 className={styles.title}>Cosmic Data</h1>
          <p className={styles.subtitle}>Drop in any dataset. Get clear, interactive visuals.</p>
          <p className={styles.byline}>Built by <strong>Gustavo Garcia-Vargas</strong></p>
        </div>
        <Astronaut className={styles.astronaut} />
      </header>

      {/* Navbar: one tab per dataset */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.brand}>✦ Cosmic Data</span>
          <div className={styles.tabs} role="tablist">
            {datasets.map((d) => (
              <button key={d.id} role="tab" aria-selected={d.id === active.id} className={d.id === active.id ? styles.tabOn : styles.tab} onClick={() => switchTo(d.id)}>
                {d.emoji} {d.name}
              </button>
            ))}
          </div>
          <label className={styles.addData}>
            + Add data
            <input type="file" accept=".csv,text/csv" onChange={handleUpload} hidden />
          </label>
        </div>
      </nav>

      <main className={styles.main} id="dataset">
        <section className={styles.dsHead}>
          <div>
            <h2 className={styles.dsTitle}>{active.emoji} {active.name}</h2>
            <p className={styles.dsDesc}>{active.description}</p>
            <p className={styles.dsSource}>Source: {active.source}</p>
          </div>
          {active.uploaded && (
            <button className={styles.ghost} onClick={() => removeDataset(active.id)}>Remove dataset</button>
          )}
        </section>

        {!active.rows ? (
          <p className={styles.loading}>Loading data…</p>
        ) : (
          <>
            <section className={styles.kpis}>
              {kpis.map((k) => (
                <div key={k.label} className={styles.kpi}>
                  <span className={styles.kpiValue}>{k.value}</span>
                  <span className={styles.kpiLabel}>{k.label}</span>
                </div>
              ))}
            </section>

            <section className={styles.grid}>
              {charts.map((spec) => (
                <ChartCard
                  key={`${active.id}-${spec.id}`}
                  spec={spec}
                  rows={active.rows}
                  profile={active.profile}
                  onAsk={ask}
                  onRemove={spec.custom ? () => setCustom((c) => ({ ...c, [active.id]: c[active.id].filter((s) => s.id !== spec.id) })) : undefined}
                />
              ))}
            </section>

            <Builder
              key={active.id}
              profile={active.profile}
              onAdd={(spec) => setCustom((c) => ({ ...c, [active.id]: [...(c[active.id] || []), spec] }))}
            />

            <details className={styles.peek}>
              <summary>Peek at the raw data</summary>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr>{active.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {active.rows.slice(0, 8).map((r, i) => (
                      <tr key={i}>{active.columns.map((c) => <td key={c}>{String(r[c] ?? "")}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}

        <footer className={styles.footer}>
          <span>Datasets: OSMI (Kaggle) · NASA Exoplanet Archive · Gapminder</span>
          <span>© {new Date().getFullYear()} Gustavo Garcia-Vargas ✦</span>
        </footer>
      </main>

      <ChatBot
        open={chatOpen}
        setOpen={setChatOpen}
        chartContext={chartContext}
        clearChart={() => setChartContext(null)}
        datasetContext={datasetContext}
        request={request}
      />
    </div>
  );
}

// "Build your own chart" for the current dataset
const KINDS = [
  { id: "group", label: "Compare groups", hint: "One number per category (bar, line, donut)" },
  { id: "dist", label: "Spread of a number", hint: "Histogram, box plot or violin" },
  { id: "cross", label: "Two categories together", hint: "100% stacked, grouped bars or heatmap" },
  { id: "scatter", label: "Two numbers together", hint: "Scatter or bubble" },
  { id: "corr", label: "Correlation map", hint: "How every number relates to every other" },
];

function Builder({ profile, onAdd }) {
  const groupable = profile.filter((c) => c.type !== "text" || c.unique <= 40);
  const cats = profile.filter((c) => c.type === "category" || c.type === "year");
  const numbers = profile.filter((c) => c.type === "number" || c.type === "year");
  const measures = measureOptions(profile);
  const kinds = KINDS.filter((k) =>
    k.id === "group" ? groupable.length : k.id === "dist" ? numbers.length : k.id === "cross" ? cats.length >= 2 : numbers.length >= 2
  );
  const [kind, setKind] = useState(kinds[0]?.id || "group");
  const [group, setGroup] = useState(groupable[0]?.name || "");
  const [mIdx, setMIdx] = useState(0);
  const [num, setNum] = useState(numbers[0]?.name || "");
  const [by, setBy] = useState("");
  const [row, setRow] = useState(cats[0]?.name || "");
  const [col, setCol] = useState(cats[1]?.name || cats[0]?.name || "");
  const [x, setX] = useState(numbers[0]?.name || "");
  const [y, setY] = useState(numbers[1]?.name || numbers[0]?.name || "");
  const [size, setSize] = useState("");

  const select = (label, value, set, options, allowNone) => (
    <label>{label}
      <select value={value} onChange={(e) => set(e.target.value)}>
        {allowNone && <option value="">{allowNone}</option>}
        {options.map((c) => <option key={c.name}>{c.name}</option>)}
      </select>
    </label>
  );

  const add = () => {
    const id = `c${Date.now()}`;
    const base = { id, custom: true, kind };
    if (kind === "group") onAdd({ ...base, title: `${measureLabel(measures[mIdx])} by ${group}`, group, measure: measures[mIdx] });
    if (kind === "dist") onAdd({ ...base, title: by ? `${num} by ${by}` : `How ${num} is spread`, col: num, by: by || undefined });
    if (kind === "cross") onAdd({ ...base, title: `${row} vs ${col}`, row, col });
    if (kind === "scatter") onAdd({ ...base, title: `${x} vs ${y}`, x, y, size: size || undefined });
    if (kind === "corr") onAdd({ ...base, title: "How the numbers relate" });
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.panelTitle}>🔭 Build your own chart</h3>
          <p className={styles.hintSmall}>{KINDS.find((k) => k.id === kind)?.hint}. The app recommends the best type.</p>
        </div>
        <Planet className={styles.planet} />
      </div>
      <div className={styles.controls}>
        <label>Chart about
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        {kind === "group" && (
          <>
            {select("Group by", group, setGroup, groupable)}
            <label>Measure
              <select value={mIdx} onChange={(e) => setMIdx(Number(e.target.value))}>
                {measures.map((m, i) => <option key={i} value={i}>{measureLabel(m)}</option>)}
              </select>
            </label>
          </>
        )}
        {kind === "dist" && (<>{select("Number", num, setNum, numbers)}{select("Split by", by, setBy, cats.filter((c) => c.name !== num), "No split")}</>)}
        {kind === "cross" && (<>{select("Rows", row, setRow, cats)}{select("Split each row by", col, setCol, cats.filter((c) => c.name !== row))}</>)}
        {kind === "scatter" && (<>{select("Across (X)", x, setX, numbers)}{select("Up (Y)", y, setY, numbers)}{select("Bubble size", size, setSize, numbers, "None")}</>)}
        <button className={styles.primary} onClick={add}>Add chart</button>
      </div>
    </section>
  );
}
