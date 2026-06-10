export interface Place {
  place_id: string;
  label: string;
  centroid_lat: number;
  centroid_lon: number;
  visits?: number;
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
  week_distances: WeeklyTrend | null;
  highlight: Highlight | null;
  status: "green" | "amber";
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
  schematic_map: SchematicMap | null;
  recent_outings: WalkSummary[];
  home_label: string;
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

export interface Highlight {
  kind: "longest_walk" | "furthest" | "new_place";
  text: string;
  detail: string | null;
}
export interface RhythmBucket {
  label: string;
  share: number;
}
export interface Rhythm {
  buckets: RhythmBucket[];
  sentence: string;
}
export interface MonthlyDelta {
  feature: string;
  label: string;
  this_value: number;
  prior_value: number;
  pct_delta: number;
  direction: "up" | "down" | "flat";
}
export interface RoutineScore {
  score: number;
  band: "stabil" | "wechselnd";
  sentence: string;
}
export interface TimeOutdoors {
  avg_min_per_day: number;
  prior_avg_min: number;
  pct_delta: number;
  direction: "up" | "down" | "flat";
  sentence: string;
}
export interface PatternsScreen {
  user_id: string;
  highlights: Highlight[];
  rhythm: Rhythm | null;
  monthly_deltas: MonthlyDelta[];
  routine: RoutineScore | null;
  time_outdoors: TimeOutdoors | null;
}
