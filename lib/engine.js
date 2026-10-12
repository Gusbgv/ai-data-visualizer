// General-purpose engine: turns any table of rows into chart-ready summaries.
// Works for the built-in datasets and for any CSV a user uploads.
//
// Chart "kinds" (what the chart is about) and the chart "types" that can draw them:
//   group   : one measure per category  -> bar, sideways bar, line, donut
//   dist    : spread of one number      -> histogram, box plot, violin
//   cross   : two categories together   -> 100% stacked, grouped bars, heatmap
//   scatter : two numbers together      -> scatter, bubble (3rd number = size)
//   corr    : every number vs every number -> correlation heatmap

const YES = new Set(["yes", "true", "y"]);
export const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isYes = (v) => v === true || (typeof v === "string" && YES.has(v.trim().toLowerCase()));
const blank = (v) => v === null || v === undefined || v === "";
const keyOf = (v) => (blank(v) ? "(blank)" : String(v));
const relabel = (k, map) => (map && map[k] !== undefined ? map[k] : k);

// ---------- Formatting ----------
export function fmt(v) {
  if (!isNum(v)) return String(v ?? "");
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${(v / 1e3).toFixed(1)}k`;
  if (Number.isInteger(v)) return a < 10000 ? String(v) : v.toLocaleString();
  if (a < 1) return String(Math.round(v * 100) / 100);
  return (Math.round(v * 10) / 10).toLocaleString();
}
const round = (v) => (Math.abs(v) >= 1000 ? Math.round(v) : Math.round(v * 10) / 10);

// ---------- Column profiling ----------
export function profileColumns(rows, columns) {
  const sample = rows.slice(0, 2000);
  return columns.map((name) => {
    const vals = sample.map((r) => r[name]).filter((v) => !blank(v));
    const nums = vals.filter(isNum);
    const unique = new Set(vals.map(String)).size;
    const numeric = vals.length > 0 && nums.length / vals.length > 0.9;
    const isYear =
      numeric && nums.every((n) => Number.isInteger(n) && n >= 1800 && n <= 2100) &&
      (/year|yr|date|season/i.test(name) || unique <= 80);
    let type = "text";
    if (isYear) type = "year";
    else if (numeric) type = "number";
    else if (unique <= 25) type = "category";
    return { name, type, unique, hasYes: vals.some(isYes) };
  });
}

// ---------- Measures ----------
export function measureLabel(m) {
  if (!m || m.type === "count") return "Count";
  if (m.type === "pctYes") return `% Yes (${m.col})`;
  if (m.type === "avg") return `Average ${m.col}`;
  if (m.type === "median") return `Median ${m.col}`;
  if (m.type === "sum") return `Total ${m.col}`;
  return m.col;
}

export function measureOptions(profile) {
  const opts = [{ type: "count" }];
  profile.forEach((c) => {
    if (c.hasYes) opts.push({ type: "pctYes", col: c.name });
    if (c.type === "number") opts.push({ type: "avg", col: c.name }, { type: "median", col: c.name }, { type: "sum", col: c.name });
  });
  return opts;
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function measureValue(rs, m) {
  if (m.type === "count") return rs.length;
  if (m.type === "pctYes") {
    const valid = rs.filter((r) => !blank(r[m.col]));
    return valid.length ? (valid.filter((r) => isYes(r[m.col])).length / valid.length) * 100 : 0;
  }
  const nums = rs.map((r) => r[m.col]).filter(isNum);
  if (!nums.length) return 0;
  if (m.type === "sum") return nums.reduce((a, b) => a + b, 0);
  if (m.type === "median") return quantile([...nums].sort((a, b) => a - b), 0.5);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export const isPartOfWhole = (m) => !m || m.type === "count" || m.type === "sum";

function applyFilter(rows, filter) {
  if (!filter) return rows;
  return rows.filter((r) => String(r[filter.col]) === String(filter.eq));
}

// Put category keys in a sensible order: explicit order > number order > biggest first
function sortKeys(keys, { order, sizeOf, profileCol }) {
  if (order) {
    const pos = (k) => (order.indexOf(k) === -1 ? order.length : order.indexOf(k));
    return [...keys].sort((a, b) => pos(a) - pos(b));
  }
  const numericLike = profileCol?.type === "year" || profileCol?.type === "number" ||
    (keys.length > 1 && keys.every((k) => !Number.isNaN(parseFloat(k))));
  if (numericLike) return [...keys].sort((a, b) => parseFloat(a) - parseFloat(b));
  return [...keys].sort((a, b) => sizeOf(b) - sizeOf(a));
}

function groupRows(rows, col) {
  const m = new Map();
  rows.forEach((r) => {
    const k = keyOf(r[col]);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return m;
}

// ---------- group: one measure per category ----------
export function computeGroup(rows, spec, profile) {
  const data = applyFilter(rows, spec.filter);
  const col = profile.find((c) => c.name === spec.group);
  let getKey = (r) => keyOf(r[spec.group]);
  let ordered = !!spec.order || col?.type === "year" || col?.type === "number";
  let trend = col?.type === "year" || col?.type === "number"; // a real sequence (time / numbers)
  let binOrder = null;

  // Numeric columns with many values get grouped into 8 equal ranges
  if (col?.type === "number" && col.unique > 20) {
    const nums = data.map((r) => r[spec.group]).filter(isNum);
    const min = Math.min(...nums), max = Math.max(...nums);
    const step = (max - min) / 8 || 1;
    binOrder = Array.from({ length: 8 }, (_, i) => `${fmt(min + i * step)}–${fmt(min + (i + 1) * step)}`);
    getKey = (r) => (isNum(r[spec.group]) ? binOrder[Math.min(7, Math.floor((r[spec.group] - min) / step))] : "(blank)");
  }

  const groups = new Map();
  data.forEach((r) => {
    const k = getKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  });
  const valueOf = (k) => measureValue(groups.get(k), spec.measure);
  let keys = sortKeys([...groups.keys()], { order: spec.order || binOrder, sizeOf: valueOf, profileCol: col });
  if (!spec.order && keys.length > 1 && keys.every((k) => !Number.isNaN(parseFloat(k)))) ordered = trend = true;

  let entries = keys.map((k) => ({ label: k, rs: groups.get(k), value: valueOf(k) }));
  const topN = spec.topN || 8;
  if (!ordered && entries.length > topN) {
    // Keep the most common groups (by rows), so rare groups don't crowd out the big ones
    const bySize = [...entries].sort((a, b) => b.rs.length - a.rs.length);
    const keepSet = new Set(bySize.slice(0, topN - 1).map((e) => e.label));
    const keep = entries.filter((e) => keepSet.has(e.label));
    const restRows = entries.filter((e) => !keepSet.has(e.label)).flatMap((e) => e.rs);
    keep.push({ label: "Other", rs: restRows, value: measureValue(restRows, spec.measure) });
    entries = keep;
  }
  if (ordered && entries.length > 40) entries = entries.slice(-40);

  const total = entries.reduce((a, e) => a + e.value, 0);
  const points = entries.map((e) => ({ label: relabel(e.label, spec.labels), value: round(e.value), n: e.rs.length }));
  const overall = isPartOfWhole(spec.measure) ? null : round(measureValue(data, spec.measure));
  return { kind: "group", points, overall, total, ordered, trend, unit: spec.measure.type === "pctYes" ? "%" : "", n: data.length };
}

// ---------- dist: how one number is spread out ----------
function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / (s.length || 1);
  return { n: s.length, min: s[0], q1: quantile(s, 0.25), median: quantile(s, 0.5), q3: quantile(s, 0.75), max: s[s.length - 1], mean };
}

export function computeDist(rows, spec, profile) {
  const data = applyFilter(rows, spec.filter).filter((r) => isNum(r[spec.col]));
  const all = data.map((r) => r[spec.col]);
  const overall = stats(all);

  // Histogram bins
  const min = overall.min, max = overall.max;
  const nb = Math.max(6, Math.min(20, Math.round(Math.sqrt(all.length))));
  const ints = all.every(Number.isInteger);
  let step = (max - min) / nb || 1;
  if (ints) step = Math.max(1, Math.ceil(step));
  const count = Math.max(1, Math.ceil((max - min + (ints ? 1 : 0)) / step));
  const bins = Array.from({ length: count }, (_, i) => {
    const from = min + i * step, to = from + step;
    return { from, to, label: ints && step === 1 ? fmt(from) : `${fmt(from)}–${fmt(ints ? to - 1 : to)}`, value: 0 };
  });
  all.forEach((v) => { bins[Math.min(count - 1, Math.floor((v - min) / step))].value += 1; });

  // Box / violin groups
  let groups;
  if (spec.by) {
    const m = groupRows(data, spec.by);
    const byCol = profile.find((c) => c.name === spec.by);
    const keys = sortKeys([...m.keys()], { order: spec.order, sizeOf: (k) => m.get(k).length, profileCol: byCol })
      .filter((k) => k !== "(blank)");
    const kept = byCol?.type === "year" || spec.order ? keys : keys.slice(0, spec.topN || 6);
    groups = kept.map((k) => {
      const values = m.get(k).map((r) => r[spec.col]);
      return { label: relabel(k, spec.labels), values, stats: stats(values) };
    });
  } else {
    groups = [{ label: spec.col, values: all, stats: overall }];
  }
  return { kind: "dist", bins, groups, overall, n: all.length, unit: "" };
}

// ---------- cross: two categories together ----------
export function computeCross(rows, spec, profile) {
  const data = applyFilter(rows, spec.filter);
  const measure = spec.measure || { type: "count" };
  const byRow = groupRows(data, spec.row);
  const byCol = groupRows(data, spec.col);
  const rowKeys = sortKeys([...byRow.keys()].filter((k) => k !== "(blank)"), {
    order: spec.rowOrder, sizeOf: (k) => byRow.get(k).length, profileCol: profile.find((c) => c.name === spec.row),
  }).slice(0, spec.maxRows || 12);
  const colKeys = sortKeys([...byCol.keys()].filter((k) => k !== "(blank)"), {
    order: spec.colOrder, sizeOf: (k) => byCol.get(k).length, profileCol: profile.find((c) => c.name === spec.col),
  }).slice(0, spec.maxCols || 12);

  const normalized = measure.type === "count" && spec.normalize !== false;
  const matrix = rowKeys.map((rk) => {
    const rRows = byRow.get(rk);
    const rowTotal = rRows.filter((r) => colKeys.includes(keyOf(r[spec.col]))).length;
    return colKeys.map((ck) => {
      const cell = rRows.filter((r) => keyOf(r[spec.col]) === ck);
      if (!cell.length) return { v: null, n: 0 };
      const raw = measureValue(cell, measure);
      return { v: round(normalized ? (raw / rowTotal) * 100 : raw), n: cell.length };
    });
  });
  return {
    kind: "cross",
    rows: rowKeys.map((k) => ({ key: k, label: relabel(k, spec.rowLabels), n: byRow.get(k).length })),
    cols: colKeys.map((k) => ({ key: k, label: relabel(k, spec.colLabels) })),
    matrix, normalized, unit: normalized ? "%" : "", measure, n: data.length,
  };
}

// ---------- scatter / bubble ----------
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

export function computeScatter(rows, spec) {
  const data = applyFilter(rows, spec.filter);
  const pts = data
    .filter((r) => isNum(r[spec.x]) && isNum(r[spec.y]) && (!spec.xLog || r[spec.x] > 0) && (!spec.yLog || r[spec.y] > 0))
    .slice(0, 2000)
    .map((r) => ({
      x: r[spec.x], y: r[spec.y], s: spec.size && isNum(r[spec.size]) ? r[spec.size] : null,
      label: spec.label ? r[spec.label] : "", group: spec.highlightBy ? keyOf(r[spec.highlightBy]) : "",
    }));
  const tx = (v) => (spec.xLog ? Math.log10(v) : v);
  const ty = (v) => (spec.yLog ? Math.log10(v) : v);
  const r = pearson(pts.map((p) => tx(p.x)), pts.map((p) => ty(p.y)));
  const groups = spec.highlightBy ? [...new Set(pts.map((p) => p.group))].sort() : [];
  const maxS = Math.max(0, ...pts.map((p) => p.s || 0));
  return { kind: "scatter", points: pts, r: Math.round(r * 100) / 100, groups, maxS, n: pts.length };
}

// ---------- corr: every number vs every number ----------
export function computeCorr(rows, spec, profile) {
  const cols = (spec.cols || profile.filter((c) => c.type === "number" || c.type === "year").map((c) => c.name)).slice(0, 8);
  const matrix = cols.map((a) => cols.map((b) => {
    const both = rows.filter((r) => isNum(r[a]) && isNum(r[b]));
    return { v: a === b ? 1 : Math.round(pearson(both.map((r) => r[a]), both.map((r) => r[b])) * 100) / 100, n: both.length };
  }));
  return { kind: "corr", cols, matrix, n: rows.length, unit: "" };
}

export function compute(rows, spec, profile) {
  if (spec.kind === "scatter") return computeScatter(rows, spec);
  if (spec.kind === "dist") return computeDist(rows, spec, profile);
  if (spec.kind === "cross") return computeCross(rows, spec, profile);
  if (spec.kind === "corr") return computeCorr(rows, spec, profile);
  return computeGroup(rows, spec, profile);
}

// ---------- Which chart types fit, and which one we recommend ----------
export function allowedTypes(spec) {
  switch (spec.kind) {
    case "scatter": return spec.size ? ["bubble", "scatter"] : ["scatter"];
    case "dist": return spec.by ? ["box", "violin"] : ["histogram", "box", "violin"];
    case "cross": return (spec.measure || { type: "count" }).type === "count" ? ["stacked", "grouped", "heatmap"] : ["heatmap", "grouped"];
    case "corr": return ["heatmap"];
    default: return isPartOfWhole(spec.measure) ? ["bar", "hbar", "line", "donut"] : ["bar", "hbar", "line"];
  }
}

export function recommend(spec, result) {
  if (spec.kind === "scatter") return spec.size
    ? { type: "bubble", why: "position shows two numbers, size shows a third" }
    : { type: "scatter", why: "shows how two numbers move together" };
  if (spec.kind === "corr") return { type: "heatmap", why: "color shows how strongly each pair of numbers moves together" };
  if (spec.kind === "dist") return spec.by
    ? { type: "box", why: "compares the middle and spread of each group" }
    : { type: "histogram", why: "shows where most values fall" };
  if (spec.kind === "cross") {
    if (result.normalized && result.cols.length <= 4) return { type: "stacked", why: "shows the split inside each group" };
    return { type: "heatmap", why: "a grid makes many combinations easy to scan" };
  }
  const pts = result.points;
  const avgLen = pts.reduce((a, p) => a + String(p.label).length, 0) / (pts.length || 1);
  const maxLen = Math.max(0, ...pts.map((p) => String(p.label).length));
  if (result.trend && pts.length >= 8) return { type: "line", why: "the values follow an order, so a line shows the trend" };
  if (isPartOfWhole(spec.measure) && !result.ordered && pts.length <= 5) return { type: "donut", why: "few groups that add up to a whole" };
  if (pts.length > 7 || avgLen > 12 || maxLen > 18) return { type: "hbar", why: "long or many labels read best sideways" };
  return { type: "bar", why: "quick side-by-side comparison" };
}

// ---------- One-line takeaway, always computed from the data ----------
export function takeaway(spec, result) {
  if (result.kind === "scatter" || result.kind === "corr") {
    let r = result.r, pair = "";
    if (result.kind === "corr") {
      let best = { v: 0 };
      result.matrix.forEach((row, i) => row.forEach((c, j) => { if (j > i && Math.abs(c.v) > Math.abs(best.v)) best = { v: c.v, i, j }; }));
      if (best.i === undefined) return "Not enough numeric columns";
      r = best.v;
      pair = ` between ${result.cols[best.i]} and ${result.cols[best.j]}`;
    }
    const a = Math.abs(r);
    const strength = a >= 0.7 ? "Strong" : a >= 0.4 ? "Moderate" : a >= 0.2 ? "Weak" : "No clear";
    const dir = a < 0.2 ? "" : r > 0 ? " positive" : " negative";
    return `${result.kind === "corr" ? "Strongest: " : ""}${strength}${dir} link${pair} (r = ${r})`;
  }
  if (result.kind === "dist") {
    if (spec.by) {
      const top = result.groups.reduce((m, g) => (g.stats.median > m.stats.median ? g : m), result.groups[0]);
      return top ? `Highest median: ${top.label} (${fmt(round(top.stats.median))})` : "No data";
    }
    const peak = result.bins.reduce((m, b) => (b.value > m.value ? b : m), result.bins[0]);
    return `Most common: ${peak.label} · median ${fmt(round(result.overall.median))}`;
  }
  if (result.kind === "cross") {
    let best = { v: -Infinity };
    if (result.normalized) {
      const focus = spec.focus ?? (result.cols.find((c) => c.key === "Yes")?.key || result.cols[0]?.key);
      const j = result.cols.findIndex((c) => c.key === focus);
      result.rows.forEach((r, i) => { const v = result.matrix[i][j]?.v; if (v != null && v > best.v) best = { v, i, j }; });
      if (best.i === undefined) return "No data";
      return `Highest "${result.cols[best.j].label}": ${result.rows[best.i].label} (${best.v}%)`;
    }
    result.matrix.forEach((row, i) => row.forEach((c, j) => { if (c.v != null && c.v > best.v) best = { v: c.v, i, j }; }));
    if (best.i === undefined) return "No data";
    return `Highest: ${result.rows[best.i].label} × ${result.cols[best.j].label} (${fmt(best.v)})`;
  }
  const pts = result.points;
  if (!pts.length) return "No data to show";
  const u = result.unit;
  if (isPartOfWhole(spec.measure)) {
    const top = pts.reduce((m, p) => (p.value > m.value ? p : m), pts[0]);
    const share = result.total ? Math.round((top.value / result.total) * 100) : 0;
    return result.trend && pts.length >= 8 ? `Peak: ${top.label} (${fmt(top.value)})` : `Largest: ${top.label} · ${share}% of the total`;
  }
  if (result.trend && pts.length >= 3) {
    const a = pts[0], b = pts[pts.length - 1];
    return `${b.value >= a.value ? "Rose" : "Fell"} from ${fmt(a.value)}${u} (${a.label}) to ${fmt(b.value)}${u} (${b.label})`;
  }
  const top = pts.reduce((m, p) => (p.value > m.value ? p : m), pts[0]);
  return `Highest: ${top.label} · ${fmt(top.value)}${u}`;
}

// ---------- Auto dashboard for any uploaded CSV (up to 6 charts) ----------
export function autoSpecs(profile, rows) {
  const out = [];
  const add = (s) => { if (out.length < 6 && !out.some((o) => o.title === s.title)) out.push(s); };
  const years = profile.filter((c) => c.type === "year");
  const nums = profile.filter((c) => c.type === "number");
  const labelCol = profile.find((c) => (c.type === "category" || c.type === "text") && c.unique === rows.length && rows.length <= 60);
  const cats = profile.filter((c) => c.type === "category" && c.unique >= 2 && rows.length / c.unique >= 2);
  const text = labelCol || profile.find((c) => c.type === "text");
  const enough = rows.length >= 20;

  if (labelCol) nums.slice(0, 2).forEach((n) =>
    add({ kind: "group", title: `${n.name} by ${labelCol.name}`, group: labelCol.name, measure: { type: "avg", col: n.name }, valueLabel: n.name, order: rows.map((r) => String(r[labelCol.name])) }));
  if (years[0]) add(nums[0]
    ? { kind: "group", title: `${nums[0].name} over ${years[0].name}`, group: years[0].name, measure: { type: "avg", col: nums[0].name } }
    : { kind: "group", title: `Rows by ${years[0].name}`, group: years[0].name, measure: { type: "count" } });
  if (cats[0]) add({ kind: "group", title: `Breakdown by ${cats[0].name}`, group: cats[0].name, measure: { type: "count" } });
  if (nums[0] && enough) add({ kind: "dist", title: `How ${nums[0].name} is spread`, col: nums[0].name });
  if (nums[0] && cats[0] && enough) add({ kind: "dist", title: `${nums[0].name} by ${cats[0].name}`, col: nums[0].name, by: cats[0].name });
  if (cats[0] && cats[1]) add({ kind: "cross", title: `${cats[0].name} vs ${cats[1].name}`, row: cats[0].name, col: cats[1].name });
  if (nums.length >= 2) add({ kind: "scatter", title: `${nums[0].name} vs ${nums[1].name}`, x: nums[0].name, y: nums[1].name, label: text?.name, highlightBy: cats[0]?.name, size: nums[2]?.name });
  if (nums.length + years.length >= 3) add({ kind: "corr", title: "How the numbers relate" });
  if (cats[1]) add({ kind: "group", title: `Breakdown by ${cats[1].name}`, group: cats[1].name, measure: { type: "count" } });
  if (!out.length && nums[0]) add({ kind: "dist", title: `How ${nums[0].name} is spread`, col: nums[0].name });

  return out.map((s, i) => ({ id: `auto${i}`, ...s }));
}

export function autoKpis(rows, profile) {
  const k = [
    { value: rows.length.toLocaleString(), label: "rows" },
    { value: String(profile.length), label: "columns" },
  ];
  const num = profile.find((c) => c.type === "number");
  if (num) k.push({ value: fmt(round(measureValue(rows, { type: "avg", col: num.name }))), label: `average ${num.name}` });
  return k;
}
