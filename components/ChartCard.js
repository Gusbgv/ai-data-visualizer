import { useMemo, useState } from "react";
import { Bar, Line, Doughnut, Scatter, Chart } from "react-chartjs-2";
import styles from "../styles/app.module.css";
import {
  setupCharts, INK, MUTED, GRID, BAR, HIGHLIGHT, DIM, CATEGORICAL, OTHER, tooltipStyle, seqColor, divColor,
} from "../lib/chartSetup";
import { compute, recommend, allowedTypes, takeaway, measureLabel, fmt, isPartOfWhole } from "../lib/engine";

setupCharts();

const TYPE_LABEL = {
  bar: "Bar", hbar: "Sideways", line: "Line", donut: "Donut", scatter: "Scatter", bubble: "Bubble",
  histogram: "Histogram", box: "Box plot", violin: "Violin", stacked: "100% stacked", grouped: "Grouped", heatmap: "Heatmap",
};
const catColor = (i) => (i < CATEGORICAL.length ? CATEGORICAL[i] : OTHER);
const base = { responsive: true, maintainAspectRatio: false };
const axisTitle = (text) => ({ display: !!text, text, color: MUTED });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function ChartCard({ spec, rows, profile, onAsk, onRemove }) {
  const [choice, setChoice] = useState("rec");
  const [sel, setSel] = useState(null); // { i, j } of the clicked element
  const [focusGroup, setFocusGroup] = useState("");

  const result = useMemo(() => compute(rows, spec, profile), [rows, spec, profile]);
  const rec = recommend(spec, result);
  const types = allowedTypes(spec);
  const type = choice === "rec" ? rec.type : choice;
  const tip = takeaway(spec, result);
  const u = result.unit || "";
  const mLabel = spec.kind === "group" ? spec.valueLabel || measureLabel(spec.measure) : "";

  const changeType = (t) => { setChoice(t); setSel(null); };
  const pick = (els) => {
    if (!els.length) return setSel(null);
    const e = els[0];
    if (type === "heatmap") {
      const n = (result.kind === "corr" ? result.cols : result.cols).length;
      return setSel({ i: Math.floor(e.index / n), j: e.index % n });
    }
    setSel({ i: e.index, j: e.datasetIndex });
  };
  const onClick = (_e, els) => pick(els);

  // ================= Chart drawing =================
  let chart = null;
  let legend = null;

  if (result.kind === "group") {
    const pts = result.points;
    const values = pts.map((p) => p.value);
    const hi = sel?.i ?? values.indexOf(Math.max(...values));
    const labels = pts.map((p) => p.label);
    const tooltip = {
      ...tooltipStyle,
      callbacks: {
        label: (c) => `${mLabel}: ${fmt(c.raw)}${u}`,
        footer: (items) => {
          const p = pts[items[0].dataIndex];
          const lines = [`${p.n.toLocaleString()} rows`];
          if (isPartOfWhole(spec.measure) && result.total) lines.push(`${pct(p.value, result.total)}% of total`);
          if (result.overall != null) {
            const d = Math.round((p.value - result.overall) * 10) / 10;
            lines.push(`${d >= 0 ? "+" : ""}${fmt(d)}${u} vs overall`);
          }
          return lines;
        },
      },
    };
    const pctMax = u === "%" ? 100 : undefined;
    if (type === "donut") {
      chart = (
        <Doughnut
          data={{ labels, datasets: [{ data: values, backgroundColor: pts.map((_, i) => catColor(i)), borderColor: "#141738", borderWidth: 2, hoverOffset: 8, offset: pts.map((_, i) => (i === sel?.i ? 12 : 0)) }] }}
          options={{ ...base, cutout: "58%", onClick, plugins: { legend: { position: "right", labels: { color: INK, boxWidth: 12, padding: 12 } }, tooltip: { ...tooltip, callbacks: { ...tooltip.callbacks, label: (c) => `${c.label}: ${fmt(c.raw)}` } } } }}
        />
      );
    } else if (type === "line") {
      chart = (
        <Line
          data={{
            labels,
            datasets: [{
              data: values, borderColor: BAR, borderWidth: 2, tension: 0.3, fill: true,
              backgroundColor: (ctx) => {
                const { chartArea, ctx: c } = ctx.chart;
                if (!chartArea) return "rgba(144,133,233,0.15)";
                const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, "rgba(144,133,233,0.35)");
                g.addColorStop(1, "rgba(57,135,229,0.02)");
                return g;
              },
              pointBackgroundColor: pts.map((_, i) => (i === hi ? HIGHLIGHT : BAR)),
              pointRadius: pts.map((_, i) => (i === hi ? 6 : pts.length > 20 ? 2 : 4)),
              pointHoverRadius: 7, pointHitRadius: 12,
            }],
          }}
          options={{
            ...base, onClick, layout: { padding: { right: result.overall != null ? 52 : 0 } },
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { display: false }, tooltip, avgLine: { value: result.overall, label: `${fmt(result.overall)}${u}` } },
            scales: {
              x: { grid: { display: false }, ticks: { color: INK, maxTicksLimit: 10 }, title: axisTitle(spec.groupLabel || spec.group) },
              y: { beginAtZero: u === "%", max: pctMax, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 6, callback: (v) => `${fmt(v)}${u}` }, title: axisTitle(mLabel) },
            },
          }}
        />
      );
    } else {
      const horizontal = type === "hbar";
      const valueAxis = { beginAtZero: true, max: pctMax, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 6, callback: (v) => `${fmt(v)}${u}` }, title: axisTitle(mLabel), grace: horizontal ? "12%" : "8%" };
      const catAxis = { grid: { display: false }, ticks: { color: INK, autoSkip: !horizontal }, title: axisTitle(spec.groupLabel || spec.group) };
      chart = (
        <Bar
          data={{ labels, datasets: [{ data: values, backgroundColor: pts.map((_, i) => (i === hi ? HIGHLIGHT : BAR)), borderRadius: 4, maxBarThickness: horizontal ? 26 : 60 }] }}
          options={{
            ...base, onClick, indexAxis: horizontal ? "y" : "x",
            layout: { padding: { top: 22, right: !horizontal && result.overall != null ? 52 : 8 } },
            plugins: { legend: { display: false }, tooltip, avgLine: { value: result.overall, label: `${fmt(result.overall)}${u}` }, barLabels: { show: pts.length <= 15, format: (v) => `${fmt(v)}${u}` } },
            scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
          }}
        />
      );
    }
  }

  if (result.kind === "dist") {
    if (type === "histogram") {
      const bins = result.bins;
      const peak = bins.reduce((m, b, i) => (b.value > bins[m].value ? i : m), 0);
      chart = (
        <Bar
          data={{ labels: bins.map((b) => b.label), datasets: [{ data: bins.map((b) => b.value), backgroundColor: bins.map((_, i) => (i === (sel?.i ?? peak) ? HIGHLIGHT : BAR)), borderRadius: 2, barPercentage: 1, categoryPercentage: 0.94 }] }}
          options={{
            ...base, onClick,
            plugins: {
              legend: { display: false },
              tooltip: { ...tooltipStyle, callbacks: { title: (it) => `${spec.col}: ${it[0].label}`, label: (c) => `${c.raw.toLocaleString()} rows (${pct(c.raw, result.n)}%)` } },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: INK, maxRotation: 45, autoSkip: true, maxTicksLimit: 10 }, title: axisTitle(spec.col) },
              y: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 6 }, title: axisTitle("Count") },
            },
          }}
        />
      );
    } else {
      const g = result.groups;
      const span = (result.overall.max - result.overall.min) || 1;
      const yMin = Math.floor(result.overall.min - span * 0.05);
      const yMax = Math.ceil(result.overall.max + span * 0.05);
      chart = (
        <Chart
          type={type === "violin" ? "violin" : "boxplot"}
          data={{
            labels: g.map((x) => x.label),
            datasets: [{
              label: spec.col, data: g.map((x) => x.values),
              backgroundColor: g.map((_, i) => (i === sel?.i ? "rgba(63,208,230,0.45)" : "rgba(144,133,233,0.35)")),
              borderColor: g.map((_, i) => (i === sel?.i ? HIGHLIGHT : BAR)), borderWidth: 1.5,
              medianColor: HIGHLIGHT, outlierBackgroundColor: "rgba(242,123,189,0.55)", outlierBorderColor: "transparent",
              outlierRadius: 2, itemRadius: 0, meanRadius: 0, coef: 1.5,
            }],
          }}
          options={{
            ...base, onClick,
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipStyle,
                callbacks: {
                  label: (c) => {
                    const s = g[c.dataIndex].stats;
                    return [`Median: ${fmt(s.median)}`, `Middle half: ${fmt(s.q1)} – ${fmt(s.q3)}`, `Range: ${fmt(s.min)} – ${fmt(s.max)}`, `${s.n.toLocaleString()} rows`];
                  },
                },
              },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: INK, autoSkip: false, maxRotation: 30 }, title: axisTitle(spec.by || "") },
              y: { beginAtZero: false, min: yMin, max: yMax, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 6, callback: (v) => fmt(v) }, title: axisTitle(spec.col) },
            },
          }}
        />
      );
    }
  }

  if (result.kind === "cross") {
    const { rows: rws, cols, matrix } = result;
    const fmtV = (v) => (v == null ? "–" : `${fmt(v)}${u}`);
    if (type === "heatmap") {
      const vals = matrix.flat().map((c) => c.v).filter((v) => v != null);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const t = (v) => (hi === lo ? 1 : (v - lo) / (hi - lo));
      const data = [];
      rws.forEach((r, i) => cols.forEach((c, j) => data.push({ x: c.label, y: r.label, v: matrix[i][j].v, n: matrix[i][j].n })));
      chart = (
        <Chart
          type="matrix"
          data={{
            datasets: [{
              data,
              backgroundColor: (ctx) => { const d = ctx.raw; return d?.v == null ? "rgba(255,255,255,0.03)" : seqColor(t(d.v)); },
              borderColor: (ctx) => (sel && ctx.dataIndex === sel.i * cols.length + sel.j ? HIGHLIGHT : "#141738"),
              borderWidth: 2,
              width: ({ chart: ch }) => ((ch.chartArea || {}).width || 0) / cols.length - 2,
              height: ({ chart: ch }) => ((ch.chartArea || {}).height || 0) / rws.length - 2,
            }],
          }}
          options={{
            ...base, onClick,
            plugins: {
              legend: { display: false },
              tooltip: { ...tooltipStyle, callbacks: { title: (it) => `${it[0].raw.y} · ${it[0].raw.x}`, label: (c) => `${result.normalized ? "Share of row" : measureLabel(result.measure)}: ${fmtV(c.raw.v)}`, footer: (it) => `${it[0].raw.n.toLocaleString()} rows` } },
              cellLabels: { show: true, format: (v) => `${fmt(v)}${u}`, textColor: (d) => (t(d.v) > 0.65 ? "#0b0d2e" : INK) },
            },
            scales: {
              x: { type: "category", labels: cols.map((c) => c.label), offset: true, grid: { display: false }, ticks: { color: INK, autoSkip: false, maxRotation: 45 }, title: axisTitle(spec.colTitle || spec.col) },
              y: { type: "category", labels: rws.map((r) => r.label), offset: true, reverse: false, grid: { display: false }, ticks: { color: INK, autoSkip: false }, title: axisTitle(spec.rowTitle || spec.row) },
            },
          }}
        />
      );
      legend = (
        <div className={styles.scaleLegend}>
          <span>{fmt(lo)}{u}</span>
          <span className={styles.scaleBar} style={{ background: `linear-gradient(90deg, ${seqColor(0)}, ${seqColor(1)})` }} />
          <span>{fmt(hi)}{u}</span>
        </div>
      );
    } else {
      const stacked = type === "stacked";
      chart = (
        <Bar
          data={{
            labels: rws.map((r) => r.label),
            datasets: cols.map((c, j) => ({
              label: c.label, data: matrix.map((row) => row[j].v ?? 0),
              backgroundColor: catColor(j), borderColor: "#141738", borderWidth: stacked ? { right: 2 } : 0,
              borderRadius: stacked ? 0 : 4, maxBarThickness: stacked ? 34 : 40,
            })),
          }}
          options={{
            ...base, onClick, indexAxis: stacked ? "y" : "x",
            plugins: {
              legend: { position: "top", align: "start", labels: { color: INK, boxWidth: 12, padding: 12 } },
              tooltip: { ...tooltipStyle, displayColors: true, callbacks: { label: (c) => `${c.dataset.label}: ${fmtV(c.raw)}`, footer: (it) => `${matrix[it[0].dataIndex][it[0].datasetIndex].n.toLocaleString()} rows` } },
              segLabels: { show: stacked && result.normalized },
            },
            scales: stacked
              ? {
                  x: { stacked: true, max: result.normalized ? 100 : undefined, grid: { color: GRID }, ticks: { callback: (v) => `${v}${u}` }, title: axisTitle(result.normalized ? "Share of each group" : "") },
                  y: { stacked: true, grid: { display: false }, ticks: { color: INK } },
                }
              : {
                  x: { grid: { display: false }, ticks: { color: INK }, title: axisTitle(spec.rowTitle || spec.row) },
                  y: { beginAtZero: true, max: result.normalized ? 100 : undefined, grid: { color: GRID }, border: { display: false }, ticks: { maxTicksLimit: 6, callback: (v) => `${fmt(v)}${u}` }, title: axisTitle(result.normalized ? "% of group" : measureLabel(result.measure)) },
                },
          }}
        />
      );
    }
  }

  if (result.kind === "corr") {
    const { cols, matrix } = result;
    const data = [];
    cols.forEach((a, i) => cols.forEach((b, j) => data.push({ x: b, y: a, v: matrix[i][j].v, n: matrix[i][j].n })));
    chart = (
      <Chart
        type="matrix"
        data={{
          datasets: [{
            data,
            backgroundColor: (ctx) => (ctx.raw ? divColor(ctx.raw.v) : "transparent"),
            borderColor: (ctx) => (sel && ctx.dataIndex === sel.i * cols.length + sel.j ? HIGHLIGHT : "#141738"),
            borderWidth: 2,
            width: ({ chart: ch }) => ((ch.chartArea || {}).width || 0) / cols.length - 2,
            height: ({ chart: ch }) => ((ch.chartArea || {}).height || 0) / cols.length - 2,
          }],
        }}
        options={{
          ...base, onClick,
          plugins: {
            legend: { display: false },
            tooltip: { ...tooltipStyle, callbacks: { title: (it) => `${it[0].raw.y} × ${it[0].raw.x}`, label: (c) => `r = ${c.raw.v}` } },
            cellLabels: { show: true, format: (v) => (Math.round(v * 100) / 100).toFixed(2), textColor: () => INK },
          },
          scales: {
            x: { type: "category", labels: cols, offset: true, grid: { display: false }, ticks: { color: INK, autoSkip: false, maxRotation: 40, callback(v) { const s = this.getLabelForValue(v); return s.length > 14 ? `${s.slice(0, 13)}…` : s; } } },
            y: { type: "category", labels: cols, offset: true, reverse: false, grid: { display: false }, ticks: { color: INK, autoSkip: false, callback(v) { const s = this.getLabelForValue(v); return s.length > 16 ? `${s.slice(0, 15)}…` : s; } } },
          },
        }}
      />
    );
    legend = (
      <div className={styles.scaleLegend}>
        <span>−1 opposite</span>
        <span className={styles.scaleBar} style={{ background: `linear-gradient(90deg, ${divColor(-1)}, ${divColor(0)}, ${divColor(1)})` }} />
        <span>+1 together</span>
      </div>
    );
  }

  if (result.kind === "scatter") {
    const bubble = type === "bubble" && result.maxS > 0;
    const radius = (p) => (bubble && p.s ? 3 + 22 * Math.sqrt(p.s / result.maxS) : 4);
    const color = (p, i) => {
      if (sel?.i === i) return HIGHLIGHT;
      if (!focusGroup) return bubble ? "rgba(144,133,233,0.55)" : BAR;
      return p.group === focusGroup ? (bubble ? "rgba(63,208,230,0.7)" : HIGHLIGHT) : DIM;
    };
    chart = (
      <Scatter
        data={{ datasets: [{ data: result.points, backgroundColor: result.points.map(color), borderColor: bubble ? "rgba(232,234,255,0.35)" : "transparent", borderWidth: bubble ? 1 : 0, pointRadius: result.points.map(radius), pointHoverRadius: result.points.map((p) => radius(p) + 3) }] }}
        options={{
          ...base, onClick,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltipStyle,
              callbacks: {
                title: (items) => { const p = items[0].raw; return [p.label, p.group].filter(Boolean).join(" · ") || "Point"; },
                label: (c) => [`${spec.x}: ${fmt(c.raw.x)}`, `${spec.y}: ${fmt(c.raw.y)}`, ...(spec.size && c.raw.s != null ? [`${spec.size}: ${fmt(c.raw.s)}`] : [])],
              },
            },
          },
          scales: {
            x: { type: spec.xLog ? "logarithmic" : "linear", grid: { color: GRID }, title: axisTitle(spec.x), ticks: { maxTicksLimit: 6, callback: (v) => fmt(v) } },
            y: { type: spec.yLog ? "logarithmic" : "linear", grid: { color: GRID }, title: axisTitle(spec.y), ticks: { maxTicksLimit: 6, callback: (v) => fmt(v) } },
          },
        }}
      />
    );
    if (bubble) legend = <p className={styles.note}>Bubble size = {spec.size}</p>;
  }

  // ================= Click details =================
  let detail = null;
  let detailLabel = "";
  if (sel) {
    if (result.kind === "group" && result.points[sel.i]) {
      const p = result.points[sel.i];
      detailLabel = p.label;
      detail = [
        <span key="v"><strong>{fmt(p.value)}{u}</strong> <span className={styles.muted}>{mLabel}</span></span>,
        <span key="n">{p.n.toLocaleString()} rows</span>,
        result.overall != null && <span key="o">{p.value >= result.overall ? "▲" : "▼"} {fmt(Math.abs(Math.round((p.value - result.overall) * 10) / 10))}{u} vs overall</span>,
        isPartOfWhole(spec.measure) && result.total > 0 && <span key="s">{pct(p.value, result.total)}% of total</span>,
      ];
    } else if (result.kind === "dist" && type === "histogram" && result.bins[sel.i]) {
      const b = result.bins[sel.i];
      detailLabel = `${spec.col}: ${b.label}`;
      detail = [<span key="c"><strong>{b.value.toLocaleString()}</strong> rows</span>, <span key="p">{pct(b.value, result.n)}% of all</span>];
    } else if (result.kind === "dist" && result.groups[sel.i]) {
      const g = result.groups[sel.i];
      detailLabel = g.label;
      detail = [
        <span key="m">Median <strong>{fmt(g.stats.median)}</strong></span>,
        <span key="q">Middle half {fmt(g.stats.q1)} – {fmt(g.stats.q3)}</span>,
        <span key="n">{g.stats.n.toLocaleString()} rows</span>,
      ];
    } else if (result.kind === "cross" && result.rows[sel.i]) {
      const r = result.rows[sel.i];
      if (type === "heatmap" && result.cols[sel.j]) {
        const c = result.matrix[sel.i][sel.j];
        detailLabel = `${r.label} · ${result.cols[sel.j].label}`;
        detail = [<span key="v"><strong>{c.v == null ? "–" : `${fmt(c.v)}${u}`}</strong></span>, <span key="n">{c.n.toLocaleString()} rows</span>];
      } else {
        detailLabel = r.label;
        detail = result.cols.map((c, j) => (
          <span key={c.key}><i className={styles.swatch} style={{ background: catColor(j) }} />{c.label}: <strong>{result.matrix[sel.i][j].v == null ? "–" : `${fmt(result.matrix[sel.i][j].v)}${u}`}</strong></span>
        ));
      }
    } else if (result.kind === "corr" && result.cols[sel.i]) {
      const v = result.matrix[sel.i][sel.j].v;
      detailLabel = `${result.cols[sel.i]} × ${result.cols[sel.j]}`;
      detail = [<span key="r">r = <strong>{v}</strong></span>, <span key="w">{Math.abs(v) >= 0.7 ? "strong" : Math.abs(v) >= 0.4 ? "moderate" : Math.abs(v) >= 0.2 ? "weak" : "little to no"} {v >= 0 ? "positive" : "negative"} link</span>];
    } else if (result.kind === "scatter" && result.points[sel.i]) {
      const p = result.points[sel.i];
      detailLabel = p.label || "Selected point";
      detail = [
        p.group && <span key="g">{p.group}</span>,
        <span key="x">{spec.x}: <strong>{fmt(p.x)}</strong></span>,
        <span key="y">{spec.y}: <strong>{fmt(p.y)}</strong></span>,
        spec.size && p.s != null && <span key="s">{spec.size}: <strong>{fmt(p.s)}</strong></span>,
      ];
    }
  }

  // ================= What the AI gets =================
  const context = () => {
    const common = { chart: spec.title, chartType: TYPE_LABEL[type], takeaway: tip, note: spec.note, filter: spec.filter, clicked: detailLabel || undefined };
    switch (result.kind) {
      case "scatter":
        return { ...common, x: spec.x, y: spec.y, size: spec.size, correlation: result.r, points: result.n, highlighted: focusGroup || undefined,
          sample: result.points.slice(0, 40).map((p) => ({ x: p.x, y: p.y, s: p.s ?? undefined, label: p.label || undefined, group: p.group || undefined })) };
      case "dist":
        return { ...common, column: spec.col, by: spec.by, overall: { median: result.overall.median, q1: result.overall.q1, q3: result.overall.q3, n: result.n },
          groups: spec.by ? result.groups.map((g) => ({ label: g.label, median: g.stats.median, q1: g.stats.q1, q3: g.stats.q3, n: g.stats.n })) : undefined,
          histogram: spec.by ? undefined : result.bins.map((b) => ({ range: b.label, count: b.value })) };
      case "cross":
        return { ...common, rows: spec.row, columns: spec.col, values: result.normalized ? "% within each row" : measureLabel(result.measure),
          table: result.rows.map((r, i) => ({ [spec.row]: r.label, ...Object.fromEntries(result.cols.map((c, j) => [c.label, result.matrix[i][j].v])) })) };
      case "corr":
        return { ...common, columns: result.cols, matrix: result.matrix.map((row) => row.map((c) => c.v)) };
      default:
        return { ...common, groupedBy: spec.groupLabel || spec.group, measure: mLabel, unit: u, overall: result.overall, data: result.points.slice(0, 30) };
    }
  };

  const tall = result.kind === "corr" || (result.kind === "cross" && type === "heatmap" && result.rows.length > 5);

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3 className={styles.cardTitle}>{spec.title}</h3>
          <p className={styles.takeaway}>{tip}</p>
        </div>
        <div className={styles.cardActions}>
          <button className={styles.summarize} onClick={() => onAsk(context(), "Summarize this chart")} title="Ask the AI to summarize">✨ Summarize</button>
          {onRemove && <button className={styles.iconBtn} onClick={onRemove} title="Remove chart">✕</button>}
        </div>
      </div>

      <div className={styles.switcher} role="group" aria-label="Chart type">
        <button className={choice === "rec" ? styles.segOn : styles.seg} onClick={() => changeType("rec")} title={`Recommended because it ${rec.why}`}>
          ✦ Recommended · {TYPE_LABEL[rec.type]}
        </button>
        {types.length > 1 && types.map((t) => (
          <button key={t} className={choice === t ? styles.segOn : styles.seg} onClick={() => changeType(t)}>{TYPE_LABEL[t]}</button>
        ))}
        {result.kind === "scatter" && result.groups.length > 1 && (
          <select className={styles.focusSelect} value={focusGroup} onChange={(e) => setFocusGroup(e.target.value)} aria-label="Highlight a group">
            <option value="">Highlight: all</option>
            {result.groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
      </div>
      {choice === "rec" && <p className={styles.why}>Recommended: {rec.why}</p>}

      <div className={tall ? styles.chartBoxTall : styles.chartBox}>{chart}</div>
      {legend}
      {spec.note && <p className={styles.note}>{spec.note}</p>}

      {detail ? (
        <div className={styles.detail}>
          <span className={styles.detailLabel}>{detailLabel}</span>
          {detail}
          <button className={styles.linkBtn} onClick={() => onAsk(context(), `What stands out about "${detailLabel}"?`)}>Ask AI about this</button>
        </div>
      ) : (
        <p className={styles.hintSmall}>Hover for details · click any {type === "heatmap" ? "cell" : type === "line" ? "point" : type === "donut" ? "slice" : result.kind === "scatter" ? "dot" : "bar or box"} to explore it</p>
      )}
    </article>
  );
}
