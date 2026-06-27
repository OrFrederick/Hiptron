import { Ic } from "../../../shared/Icon";
import { InsightCard } from "../../../shared/kit";
import { HIP } from "../../../shared/theme";
import type { InsightBlock as InsightBlockData } from "../../../shared/types";

const c = HIP.c;

const FEATURE_DE: Record<string, string> = {
  total_distance_m: "Gehstrecke",
  activity_radius_m: "Aktionsradius",
  n_outings: "Ausgänge",
  place_count: "Ortsvielfalt",
};
const DIRECTION_DE: Record<string, string> = {
  down: "etwas weniger",
  up: "etwas mehr",
};

export function ChangepointsBlock({ block }: { block: InsightBlockData }) {
  const items = block.series;
  return (
    <InsightCard label="Veränderungen" headline={block.verdict}>
      {items.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "4px 2px" }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: c.green50,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Ic name="check" size={18} color={c.green600} sw={2.4} />
          </span>
          <div style={{ fontSize: 15.5, color: c.textMuted, lineHeight: 1.5 }}>
            Nichts hat sich genug verändert, um es zu erwähnen.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((row, i) => {
            const feature = FEATURE_DE[String(row.feature)] ?? String(row.feature);
            const dir = DIRECTION_DE[String(row.direction)] ?? String(row.direction);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 13,
                  padding: "12px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${c.line}`,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.blue600, opacity: 0.85, marginTop: 6, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: c.textDark, lineHeight: 1.4 }}>
                    {feature}: {dir} als sonst
                  </div>
                  <div style={{ fontSize: 13.5, color: c.textMuted, marginTop: 2 }}>{String(row.detected_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </InsightCard>
  );
}
