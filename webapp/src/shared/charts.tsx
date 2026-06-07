// Calm chart primitives for the navy/white/green system.
// Subordinate to sentences: a headline/verdict always sits above these.
// WeekBars (km/day + dashed "üblich" baseline) · PlaceBars (place + frequency bar).

import { HIP } from "./theme";

const c = HIP.c;

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
  const maxVal = Math.max(...data, baseline, 0.001) * 1.18;
  const H = big ? 176 : 138;
  const padB = big ? 32 : 26;
  const area = H - padB;
  const barW = big ? 30 : 24;
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
          justifyContent: "space-between",
          paddingBottom: padB,
        }}
      >
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
      {baselineLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: big ? 14 : 12 }}>
          <span style={{ width: 22, borderTop: `1.5px dashed ${c.textMuted}`, opacity: 0.7, flexShrink: 0 }} />
          <span style={{ fontSize: big ? 13.5 : 12.5, color: c.textMuted, fontWeight: 500 }}>{baselineLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Place list with a frequency bar per row ──
export function PlaceBars({
  places,
  big = false,
}: {
  places: { label: string; count: number }[];
  big?: boolean;
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
              width: big ? 50 : 42,
              flexShrink: 0,
              textAlign: "right",
              fontSize: big ? 16 : 14,
              fontWeight: 600,
              color: c.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {p.count}×
          </div>
        </div>
      ))}
    </div>
  );
}
