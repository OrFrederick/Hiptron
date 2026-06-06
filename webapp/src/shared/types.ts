export interface Place {
  place_id: string;
  label: string;
  centroid_lat: number;
  centroid_lon: number;
}

export interface WalkSummary {
  walk_id: string;
  start_ts: string;
  end_ts: string;
  distance_m: number;
  place_labels: string[];
}

export interface SchematicMap {
  home_lat: number;
  home_lon: number;
  places: Place[];
  walk_polyline: [number, number][];
}

export interface OlderAdultHome {
  greeting: string;
  date: string;
  yesterday_walk: WalkSummary | null;
  schematic_map: SchematicMap | null;
  streak_days: number;
  family_note: string | null;
  trend_card: string | null;
}

export interface WeeklyTrendPoint {
  date: string;
  value: number;
}
export interface WeeklyTrend {
  headline: string;
  points: WeeklyTrendPoint[];
  baseline_mean: number;
}
export interface WorthNoticing {
  headline: string;
  detail: string;
  feature: string;
}
export interface RelativeHome {
  status: "green" | "amber";
  last_update: string;
  summary: string;
  weekly_trend: WeeklyTrend;
  worth_noticing: WorthNoticing | null;
}

export type ChartKind = "line" | "bar" | "places" | "list";
export interface InsightBlock {
  question: string;
  verdict: string;
  chart_kind: ChartKind;
  series: Record<string, unknown>[];
  hidden: boolean;
  feature?: string | null;
}
export interface InsightsDetail {
  user_id: string;
  blocks: InsightBlock[];
}
