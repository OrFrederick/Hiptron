-- raw GPS stream
CREATE TABLE IF NOT EXISTS gps_fixes (
    user_id      VARCHAR  NOT NULL,
    ts           TIMESTAMP NOT NULL,
    lat          DOUBLE   NOT NULL,
    lon          DOUBLE   NOT NULL,
    accuracy_m   DOUBLE,
    PRIMARY KEY (user_id, ts)
);

-- segmented walks
CREATE TABLE IF NOT EXISTS walks (
    walk_id        VARCHAR PRIMARY KEY,
    user_id        VARCHAR NOT NULL,
    start_ts       TIMESTAMP NOT NULL,
    end_ts         TIMESTAMP NOT NULL,
    src_fix_count  INTEGER NOT NULL
);

-- per-walk features
CREATE TABLE IF NOT EXISTS walk_features (
    walk_id                 VARCHAR PRIMARY KEY,
    distance_m              DOUBLE,
    duration_s              DOUBLE,
    mean_speed              DOUBLE,
    peak_speed              DOUBLE,
    pause_count             INTEGER,
    dwell_s                 DOUBLE,
    speed_third_delta_pct   DOUBLE,
    route_hash              VARCHAR
);

-- place clusters
CREATE TABLE IF NOT EXISTS places (
    place_id       VARCHAR PRIMARY KEY,
    user_id        VARCHAR NOT NULL,
    centroid_lat   DOUBLE NOT NULL,
    centroid_lon   DOUBLE NOT NULL,
    label          VARCHAR,
    first_seen     TIMESTAMP,
    last_seen      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS walk_place_visits (
    walk_id     VARCHAR NOT NULL,
    place_id    VARCHAR NOT NULL,
    arrive_ts   TIMESTAMP NOT NULL,
    depart_ts   TIMESTAMP NOT NULL,
    PRIMARY KEY (walk_id, place_id, arrive_ts)
);

-- daily aggregates
CREATE TABLE IF NOT EXISTS daily_features (
    user_id            VARCHAR NOT NULL,
    date               DATE NOT NULL,
    total_distance_m   DOUBLE,
    n_outings          INTEGER,
    time_outdoors_min  DOUBLE,
    activity_radius_m  DOUBLE,
    fatigue_index      DOUBLE,
    place_count        INTEGER,
    PRIMARY KEY (user_id, date)
);

-- rolling baselines
CREATE TABLE IF NOT EXISTS baselines (
    user_id      VARCHAR NOT NULL,
    feature      VARCHAR NOT NULL,
    window_end   DATE NOT NULL,
    mean         DOUBLE,
    std          DOUBLE,
    n            INTEGER,
    PRIMARY KEY (user_id, feature, window_end)
);

-- detected change-points
CREATE TABLE IF NOT EXISTS changepoints (
    user_id         VARCHAR NOT NULL,
    feature         VARCHAR NOT NULL,
    detected_at     DATE NOT NULL,
    direction       VARCHAR NOT NULL,
    score           DOUBLE,
    baseline_mean   DOUBLE,
    current_value   DOUBLE,
    PRIMARY KEY (user_id, feature, detected_at)
);

-- generated insight cards
CREATE TABLE IF NOT EXISTS insights (
    insight_id    VARCHAR PRIMARY KEY,
    user_id       VARCHAR NOT NULL,
    audience      VARCHAR NOT NULL,
    kind          VARCHAR NOT NULL,
    severity      VARCHAR NOT NULL,
    template_id   VARCHAR NOT NULL,
    payload_json  JSON NOT NULL,
    created_ts    TIMESTAMP NOT NULL,
    dismissed_ts  TIMESTAMP
);

-- pipeline watermarks
CREATE TABLE IF NOT EXISTS pipeline_state (
    stage             VARCHAR PRIMARY KEY,
    last_processed_ts TIMESTAMP
);
