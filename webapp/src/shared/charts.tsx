// Calm chart primitives for the navy/white/green system.
// Subordinate to sentences: a headline/verdict always sits above these.
// WeekBars (km/day + dashed "üblich" baseline) · PlaceBars (place + frequency bar).

import { HIP } from "./theme";

const c = HIP.c;

// Format a distance value (km) for the y-axis tick labels with German comma.
function axisLabel(kmVal: number): string {
  if (kmVal >= 1) {
    const s = Number.isInteger(kmVal)
      ? String(kmVal)
      : kmVal.toFixed(1).replace(".", ",");
    return `${s} km`;
  }
  return `${Math.round(kmVal * 1000)} m`;
}

// Half-steps whose label AND double both read clean ("250 m", "1,5 km", "3 km").
const NICE_HALF_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

// Snap the axis top to 2× a nice step so the half and max ticks are clean values.
function niceAxisMax(rawMax: number): number {
  const step = NICE_HALF_STEPS.find((s) => 2 * s >= rawMax);
  return step !== undefined ? 2 * step : 2 * Math.ceil(rawMax / 2);
}

// ── Vertical day bars with a dashed baseline (senior week distance) ──
export function WeekBars({
  data,
  days,
  baseline,
  baselineLabel,
  big = false,
}: {
  data: number[];
  days: string[];
  baseline: number;
  baselineLabel?: string;
  big?: boolean;
}) {
  const col = c.blue600;
  const maxVal = niceAxisMax(Math.max(...data, baseline, 0.001) * 1.05);
  const H = big ? 176 : 138;
  const padB = big ? 32 : 26;
  const area = H - padB;
  const barW = big ? 30 : 24;

  // Y-axis: 0, half, max tick positions (bottom-up, same coord system as bars)
  const axisW = big ? 44 : 38;
  const tickFontSize = big ? 13 : 11;
  const ticks: { label: string; bottomPx: number }[] = [
    { label: "0", bottomPx: padB },
    { label: axisLabel(maxVal / 2), bottomPx: padB + area * 0.5 },
    { label: axisLabel(maxVal), bottomPx: padB + area },
  ];

  return (
    <div>
      <div
        style={{
          width: "100%",
          height: H,
          position: "relative",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {/* Y-axis column */}
        <div
          style={{
            width: axisW,
            flexShrink: 0,
            height: "100%",
            position: "relative",
          }}
        >
          {ticks.map((t) => (
            <div
              key={t.label}
              style={{
                position: "absolute",
                bottom: t.bottomPx,
                right: 6,
                transform: "translateY(50%)",
                fontSize: tickFontSize,
                color: c.textMuted,
                fontWeight: 400,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Bars area — flex row, same relative positioning as before */}
        <div
          style={{
            flex: 1,
            height: "100%",
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingBottom: padB,
          }}
        >
          {/* Dashed baseline — spans bars area only */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: padB + (baseline / maxVal) * area,
              borderTop: `1.5px dashed ${c.textMuted}`,
              opacity: 0.5,
              pointerEvents: "none",
            }}
          />

          {data.map((v, i) => {
            const isToday = i === data.length - 1;
            const h = Math.max(4, (v / maxVal) * area);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: big ? 10 : 8,
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    width: barW,
                    height: h,
                    borderRadius: 8,
                    background: col,
                    opacity: v === 0 ? 0.16 : isToday ? 1 : 0.42,
                  }}
                />
                <div
                  style={{
                    fontSize: big ? 15 : 12.5,
                    color: isToday ? c.textDark : c.textMuted,
                    fontWeight: isToday ? 700 : 500,
                  }}
                >
                  {days[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {baselineLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: big ? 14 : 12, paddingLeft: axisW }}>
          <span style={{ width: 22, borderTop: `1.5px dashed ${c.textMuted}`, opacity: 0.7, flexShrink: 0 }} />
          <span style={{ fontSize: big ? 13.5 : 12.5, color: c.textMuted, fontWeight: 500 }}>{baselineLabel}</span>
        </div>
      )}
    </div>
  );
}

// Warm, count-free frequency word from a place's share of the most-visited spot.
// Senior view: a kind "how often" instead of a cold, inflated tally (e.g. "96×").
function frequencyWord(share: number): string {
  if (share >= 0.66) return "fast immer";
  if (share >= 0.33) return "oft";
  return "ab und zu";
}

// ── Place list with a frequency bar per row ──
export function PlaceBars({
  places,
  big = false,
  frequency = false,
}: {
  places: { label: string; count: number }[];
  big?: boolean;
  frequency?: boolean;
}) {
  const col = c.blue600;
  const max = Math.max(...places.map((p) => p.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: big ? 18 : 14 }}>
      {places.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: big ? 104 : 92,
              flexShrink: 0,
              fontSize: big ? 18 : 16,
              fontWeight: 600,
              color: c.textDark,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.label}
          </div>
          <div style={{ flex: 1, height: big ? 12 : 10, background: c.chip, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${(p.count / max) * 100}%`, height: "100%", background: col, opacity: 0.85, borderRadius: 999 }} />
          </div>
          <div
            style={{
              width: big ? (frequency ? 92 : 50) : frequency ? 78 : 42,
              flexShrink: 0,
              textAlign: "right",
              fontSize: big ? 16 : 14,
              fontWeight: 600,
              color: c.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {frequency ? frequencyWord(p.count / max) : `${p.count}×`}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 3-bucket time-of-day share bars (outdoor rhythm) ──
export function RhythmBars({ buckets }: { buckets: { label: string; share: number }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {buckets.map((b, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 100, flexShrink: 0, fontSize: 15, fontWeight: 600, color: c.textDark }}>{b.label}</div>
          <div style={{ flex: 1, height: 10, background: c.chip, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${Math.round(b.share * 100)}%`, height: "100%", background: c.blue600, opacity: 0.85, borderRadius: 999 }} />
          </div>
          <div style={{ width: 46, textAlign: "right", fontSize: 14, fontWeight: 600, color: c.textMuted, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(b.share * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Signed delta row vs prior month (neutral, never alarm) ──
export function DeltaRow({ label, pct, direction }: { label: string; pct: number; direction: "up" | "down" | "flat" }) {
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
  const tint = direction === "flat" ? c.textMuted : c.blue600;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 46, borderBottom: `1px solid ${c.line}` }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: c.textDark }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, color: tint, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ fontSize: 11 }}>{arrow}</span>
        {direction === "flat" ? "etwa gleich" : `${Math.abs(Math.round(pct))}%`}
      </span>
    </div>
  );
}

// ── Time-outdoors hero stat (warm daily reassurance, never a health number) ──
function fmtMinutes(totalMin: number): string {
  const m = Math.round(totalMin);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h} Std ${mm} Min`;
  if (h) return `${h} Std`;
  return `${mm} Min`;
}

export function TimeOutdoorsStat({ avgMin, direction }: { avgMin: number; direction: "up" | "down" | "flat" }) {
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
  const tint = direction === "flat" ? c.textMuted : c.blue600;
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 30, fontWeight: 700, color: c.textDark, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        {fmtMinutes(avgMin)}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: tint }}>
        <span style={{ fontSize: 11 }}>{arrow}</span>
        {direction === "flat" ? "etwa gleich" : "Vormonat"}
      </span>
    </div>
  );
}

// ── Weekly walking-speed line (tempo observation, never a verdict) ──
function kmhLabel(v: number): string {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
  return `${s} km/h`;
}

export function SpeedTrendLine({ points }: { points: { week_start: string; kmh: number }[] }) {
  if (points.length < 2) return null;
  const W = 300, H = 132, padL = 56, padR = 8, padT = 10, padB = 24;
  const maxV = niceAxisMax(Math.max(...points.map((p) => p.kmh), 0.001) * 1.1);
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);
  const poly = points.map((p, i) => `${x(i)},${y(p.kmh)}`).join(" ");
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
  };
  const ticks = [0, maxV / 2, maxV];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={c.line} strokeWidth={1} />
          <text x={padL - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill={c.textMuted}>
            {kmhLabel(v)}
          </text>
        </g>
      ))}
      <polyline points={poly} fill="none" stroke={c.blue600} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <text x={padL} y={H - 6} fontSize={10.5} fill={c.textMuted}>
        {fmtDate(points[0]!.week_start)}
      </text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10.5} fill={c.textMuted}>
        {fmtDate(points[points.length - 1]!.week_start)}
      </text>
    </svg>
  );
}

// ── Mid-walk pause hero stat (everyday observation, mirrors TimeOutdoorsStat) ──
export function PauseStat({ avg, direction }: { avg: number; direction: "up" | "down" | "flat" }) {
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
  const tint = direction === "flat" ? c.textMuted : c.blue600;
  const n = Number.isInteger(avg) ? String(avg) : avg.toFixed(1).replace(".", ",");
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 30, fontWeight: 700, color: c.textDark, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        Ø {n} {avg === 1 ? "Pause" : "Pausen"}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: tint }}>
        <span style={{ fontSize: 11 }}>{arrow}</span>
        {direction === "flat" ? "etwa gleich" : "Vormonat"}
      </span>
    </div>
  );
}

// ── Generic "nice" axis max for non-km units (meters, counts) ──
function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const s of steps) if (s * pow >= raw) return s * pow;
  return 10 * pow;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

// ── Calm daily trend: smooth area + line over a soft "üblich" baseline ──
// Replaces the dense per-day recharts bars. Sentence/verdict sits above it.
export function TrendArea({
  points,
  baseline,
  fmt,
  color = c.blue600,
  baselineLabel = "üblich",
}: {
  points: { date: string; value: number }[];
  baseline: number;
  fmt: (v: number) => string;
  color?: string;
  baselineLabel?: string;
}) {
  if (points.length < 2) return null;
  const W = 324, H = 122, padL = 6, padR = 8, padT = 16, padB = 20;
  const vals = points.map((p) => p.value);
  const dataMax = Math.max(...vals, baseline);
  const dataMin = Math.min(...vals, baseline);
  // A near-constant series (e.g. steady outings) would pin its flat line to the
  // top; give it extra headroom so it settles mid-card. Varying series keep a
  // tight scale so meaningful steps (e.g. a lower radius) stay legible.
  const lowVariance = dataMax > 0 && dataMax - dataMin < dataMax * 0.06;
  const maxV = niceMax(dataMax * (lowVariance ? 1.6 : 1.08));
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);
  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`);
  const line = linePts.join(" ");
  const area = `${x(0)},${y(0)} ${line} ${x(points.length - 1)},${y(0)}`;
  const gid = `ta-${color.replace("#", "")}`;
  const baseY = y(baseline);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* soft "üblich" baseline */}
      <line x1={padL} x2={W - padR} y1={baseY} y2={baseY} stroke={c.textMuted} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.45} />
      <text x={W - padR} y={baseY - 5} textAnchor="end" fontSize={10.5} fill={c.textMuted}>
        {baselineLabel}
      </text>

      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* scale + range hints */}
      <text x={padL} y={11} fontSize={10.5} fill={c.textMuted}>{fmt(maxV)}</text>
      <text x={padL} y={H - 5} fontSize={10.5} fill={c.textMuted}>{shortDate(points[0]!.date)}</text>
      <text x={W - padR} y={H - 5} textAnchor="end" fontSize={10.5} fill={c.textMuted}>{shortDate(points[points.length - 1]!.date)}</text>
    </svg>
  );
}

// ── Quick-scan trend chip (mirrors the Patterns stat pills) ──
export type Trend = { dir: "up" | "down" | "flat"; pct?: number };

// Derive the chip from the block's verdict sentence so the two never disagree.
export function trendFromVerdict(verdict: string): Trend | null {
  if (/stabil|etwa gleich|unverändert/i.test(verdict)) return { dir: "flat" };
  const m = verdict.match(/(\d+)\s*%/);
  const down = /niedriger|weniger|kürzer|seltener|geringer/i.test(verdict);
  const up = /höher|mehr|länger|öfter|größer/i.test(verdict);
  if (m && (down || up)) return { dir: down ? "down" : "up", pct: Number(m[1]) };
  return null;
}

export function TrendPill({ trend }: { trend: Trend }) {
  const arrow = trend.dir === "up" ? "▲" : trend.dir === "down" ? "▼" : "→";
  const tint = trend.dir === "flat" ? c.textMuted : c.blue600;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: tint, whiteSpace: "nowrap", flexShrink: 0 }}>
      <span style={{ fontSize: 11 }}>{arrow}</span>
      {trend.dir === "flat" ? "etwa gleich" : `${trend.pct}%`}
    </span>
  );
}

// ── Calm routine-consistency bar (reassurance, not a clinical dial) ──
export function RoutineBar({ score, band }: { score: number; band: "stabil" | "wechselnd" }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: c.textDark }}>Rhythmus</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: band === "stabil" ? c.green700 : c.textMuted }}>{band}</span>
      </div>
      <div style={{ height: 12, background: c.chip, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(6, Math.min(100, score))}%`, height: "100%", background: c.green600, opacity: 0.85, borderRadius: 999 }} />
      </div>
    </div>
  );
}
