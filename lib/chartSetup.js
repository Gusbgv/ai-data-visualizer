import {
  Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement,
  LineElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { BoxPlotController, BoxAndWiskers, ViolinController, Violin } from "@sgratzl/chartjs-chart-boxplot";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";

export const INK = "#e8eaff";
export const MUTED = "#9aa3d6";
export const GRID = "rgba(154,163,214,0.12)";
export const BAR = "#9085e9";       // violet
export const HIGHLIGHT = "#3fd0e6"; // cyan accent
export const DIM = "rgba(144,133,233,0.28)";
// Categorical order validated for the dark surface: blue, orange, aqua, yellow, magenta, violet
export const CATEGORICAL = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9"];
export const OTHER = "#5b6290";

// Dashed "overall" reference line (horizontal for bars/lines, vertical for sideways bars)
const avgLine = {
  id: "avgLine",
  afterDatasetsDraw(chart, _a, opts) {
    if (opts?.value == null) return;
    const { ctx, chartArea: a } = chart;
    const horizontal = chart.options.indexAxis === "y";
    const scale = horizontal ? chart.scales.x : chart.scales.y;
    if (!scale) return;
    const p = scale.getPixelForValue(opts.value);
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(232,234,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (horizontal) { ctx.moveTo(p, a.top); ctx.lineTo(p, a.bottom); }
    else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = MUTED;
    ctx.font = "12px Inter, sans-serif";
    if (horizontal) {
      ctx.textAlign = "center";
      ctx.fillText(`overall ${opts.label}`, p, a.top - 8);
    } else {
      ctx.textAlign = "left";
      ctx.fillText("overall", a.right + 6, p - 2);
      ctx.fillText(opts.label, a.right + 6, p + 12);
    }
    ctx.restore();
  },
};

// Value labels at the end of each bar
const barLabels = {
  id: "barLabels",
  afterDatasetsDraw(chart, _a, opts) {
    if (!opts?.show || chart.config.type !== "bar") return;
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === "y";
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.fillStyle = INK;
    ctx.font = "600 12px Inter, sans-serif";
    ctx.textAlign = horizontal ? "left" : "center";
    ctx.textBaseline = horizontal ? "middle" : "alphabetic";
    meta.data.forEach((bar, i) => {
      const text = opts.format(chart.data.datasets[0].data[i]);
      if (horizontal) ctx.fillText(text, bar.x + 6, bar.y);
      else ctx.fillText(text, bar.x, bar.y - 7);
    });
    ctx.restore();
  },
};

// Numbers inside heatmap cells (skipped when cells are too small to read)
const cellLabels = {
  id: "cellLabels",
  afterDatasetsDraw(chart, _a, opts) {
    if (!opts?.show || chart.config.type !== "matrix") return;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    meta.data.forEach((el, i) => {
      const raw = chart.data.datasets[0].data[i];
      if (raw.v == null) return;
      const { width, height } = el.getProps(["width", "height"], true);
      if (width < 34 || height < 18) return;
      const c = el.getCenterPoint(true);
      ctx.fillStyle = opts.textColor(raw);
      ctx.fillText(opts.format(raw.v), c.x, c.y);
    });
    ctx.restore();
  },
};

// Percent labels inside stacked bar segments (only where there is room)
const segLabels = {
  id: "segLabels",
  afterDatasetsDraw(chart, _a, opts) {
    if (!opts?.show) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((bar, i) => {
        const v = ds.data[i];
        if (v == null || v < 8) return;
        const { x, y, base } = bar.getProps(["x", "y", "base"], true);
        const cx = chart.options.indexAxis === "y" ? (x + base) / 2 : x;
        const cy = chart.options.indexAxis === "y" ? y : (y + base) / 2;
        ctx.fillText(`${Math.round(v)}%`, cx, cy);
      });
    });
    ctx.restore();
  },
};

// Sequential (one hue, dim -> bright) for heatmaps of size/share
export function seqColor(t) {
  const a = 0.1 + 0.9 * Math.max(0, Math.min(1, t));
  return `rgba(144,133,233,${a.toFixed(3)})`;
}
// Diverging (blue = positive, orange = negative, neutral gray in the middle) for correlations
export function divColor(r) {
  const a = 0.12 + 0.88 * Math.min(1, Math.abs(r));
  if (Math.abs(r) < 0.05) return "rgba(120,124,160,0.25)";
  return r > 0 ? `rgba(57,135,229,${a.toFixed(3)})` : `rgba(217,89,38,${a.toFixed(3)})`;
}

let done = false;
export function setupCharts() {
  if (done) return;
  ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, PointElement,
    LineElement, ArcElement, Tooltip, Legend, Filler, avgLine, barLabels, cellLabels, segLabels,
    BoxPlotController, BoxAndWiskers, ViolinController, Violin, MatrixController, MatrixElement);
  ChartJS.defaults.color = MUTED;
  ChartJS.defaults.font.family = "Inter, sans-serif";
  done = true;
}

export const tooltipStyle = {
  backgroundColor: "rgba(12,14,40,0.96)",
  borderColor: "rgba(144,133,233,0.5)",
  borderWidth: 1,
  titleColor: INK,
  bodyColor: INK,
  footerColor: MUTED,
  footerFont: { weight: "normal", size: 11 },
  padding: 10,
  displayColors: false,
};
