export type DataMode = "demo" | "sample" | "live";

export interface SampleStatus {
  available: boolean;
  observation_count: number;
  note: string;
  source: Record<string, unknown> | null;
}

export interface LiveStatus {
  enabled: boolean;
  earthdata_credentials_configured: boolean;
  download_supported: boolean;
  note: string;
}

export interface DataStatus {
  requested_mode: DataMode | "auto";
  effective_mode: DataMode;
  analysis_mode: "demo" | "sample";
  label: string;
  is_synthetic: boolean;
  fallback_reason: string | null;
  sample: SampleStatus;
  live: LiveStatus;
}

export interface MissionFacts {
  name: string;
  agencies: string[];
  status: string;
  bands: string;
  repeat_cycle_days: number;
  primary_applications: string[];
  url: string;
  note: string;
}

export interface ProductFamily {
  id: string;
  name: string;
  level: string;
  use: string;
  supported_in_mvp: boolean;
  note: string;
}

export interface NisarStatus {
  enabled: boolean;
  asf_endpoint: string;
  stac_endpoint: string;
  earthdata_credentials_configured: boolean;
  download_supported: boolean;
  processing_supported: boolean;
  note: string;
  mission: MissionFacts;
  product_families: ProductFamily[];
  analysis_support: {
    implemented: string[];
    not_implemented: string[];
    guard: string;
  };
}

export interface LlmStatus {
  enabled: boolean;
  provider: string;
  model: string | null;
  key_present?: boolean;
  note: string;
}

export interface ConfigStatus {
  app: string;
  version: string;
  environment: string;
  data: DataStatus;
  nisar: NisarStatus;
  llm: LlmStatus;
  defaults: {
    change_threshold_db: number;
    water_threshold_db: number;
  };
}

export interface ObservationBrief {
  id: number;
  external_id: string;
  acquired_at: string;
  mission: string;
  polarization: string;
  data_mode: string;
  is_synthetic: boolean;
  preview_url: string | null;
}

export interface Observation extends ObservationBrief {
  location_id: number;
  location_slug: string | null;
  location_name: string | null;
  platform: string;
  instrument: string;
  product_type: string;
  acquisition_mode: string;
  resolution_m: number;
  crs: string;
  bbox: [number, number, number, number];
  source_name: string;
  source_url: string | null;
  provenance: Record<string, unknown>;
  scene_metadata: Record<string, unknown>;
  preview_available: boolean;
  access_note: string | null;
}

export interface AnalysisStats {
  valid_pixels?: number;
  total_pixels?: number;
  valid_coverage?: number;
  aoi_area_km2?: number;
  pixel_area_km2?: number;
  changed_pixels?: number;
  changed_fraction?: number;
  change_area_km2?: number;
  increase_pixels?: number;
  decrease_pixels?: number;
  increase_area_km2?: number;
  decrease_area_km2?: number;
  water_before_pixels?: number;
  water_after_pixels?: number;
  water_before_fraction?: number;
  water_after_fraction?: number;
  water_before_km2?: number;
  water_after_km2?: number;
  water_gain_pixels?: number;
  water_loss_pixels?: number;
  water_gain_km2?: number;
  water_loss_km2?: number;
  persistent_water_km2?: number;
  net_water_change_km2?: number;
  mean_before_db?: number;
  mean_after_db?: number;
  mean_change_db?: number;
  median_change_db?: number;
  threshold_db?: number;
  water_threshold_db?: number;
  center_lat?: number;
  center_lon?: number;
  [key: string]: number | undefined;
}

export interface QualityReport {
  score: number;
  label: string;
  score_meaning: string;
  difference_noise_db: number | null;
  threshold_db: number;
  alignment: {
    aligned: boolean;
    same_shape: boolean;
    same_crs: boolean;
    transform_delta: number;
    notes: string[];
  };
  flags: string[];
}

export interface AnalysisSummary {
  id: number;
  location_id: number;
  location_slug: string;
  location_name: string;
  country: string;
  before_observation_id: number;
  after_observation_id: number;
  before_date: string;
  after_date: string;
  method: string;
  change_threshold_db: number;
  water_threshold_db: number;
  data_mode: string;
  is_synthetic: boolean;
  change_area_km2: number;
  water_gain_km2: number;
  water_loss_km2: number;
  net_water_change_km2: number;
  changed_fraction: number;
  confidence_score: number;
  confidence_label: string;
  summary: string;
  bounds: [number, number, number, number];
  created_at: string;
  before_preview_url: string | null;
  after_preview_url: string | null;
  water_overlay_url: string | null;
  change_overlay_url: string | null;
}

export interface Analysis extends AnalysisSummary {
  status: string;
  stats: AnalysisStats;
  quality: QualityReport;
  limitations: string[];
  interpretation: string;
  geojson_url: string;
  before: ObservationBrief;
  after: ObservationBrief;
}

export interface Location {
  id: number;
  slug: string;
  name: string;
  country: string;
  region: string;
  focus: string;
  scenario: string;
  description: string;
  monitoring_note: string;
  center_lat: number;
  center_lon: number;
  bbox: [number, number, number, number];
  is_demo: boolean;
  observation_count: number;
  latest_analysis: AnalysisSummary | null;
}

export interface Dashboard {
  generated_at: string;
  data_status: DataStatus & { data_source_count: number };
  stats: {
    locations: number;
    observations: number;
    analyses: number;
    demo_area_monitored_km2: number;
    area_in_latest_analyses_km2?: number;
    latest_change_area_km2: number;
    latest_water_gain_km2: number;
    latest_water_loss_km2: number;
    average_confidence: number;
  };
  locations: Location[];
  recent_analyses: AnalysisSummary[];
  recent_observations: Observation[];
  environmental_indicators: Array<{
    location_slug: string;
    location_name: string;
    label: string;
    value: number;
    unit: string;
    period: string;
    confidence: string;
    direction: "gain" | "loss";
    data_mode: string;
    is_synthetic: boolean;
  }>;
  nisar: {
    mission: MissionFacts;
    discovery: {
      enabled: boolean;
      earthdata_credentials_configured: boolean;
      download_supported: boolean;
      processing_supported: boolean;
      note: string;
    };
  };
  notes: string[];
}

export interface Explanation {
  mode: "deterministic" | "llm";
  engine: string;
  headline: string;
  summary: string;
  observations: string[];
  interpretation: string;
  environmental_relevance: string;
  technical_indicators: Array<{
    label: string;
    value: number | null;
    unit: string;
    meaning: string;
  }>;
  confidence: {
    label: string;
    score: number;
    rationale: string;
    important: string;
  };
  method: {
    name: string;
    change_threshold_db: number;
    water_threshold_db: number;
    steps: string[];
  };
  analysis_period: {
    before: string;
    after: string;
    before_observation_id: number;
    after_observation_id: number;
  };
  source_data: Array<{
    role: string;
    observation_id: number;
    external_id: string;
    mission: string;
    instrument: string;
    product_type: string;
    acquired_at: string;
    data_mode: string;
    is_synthetic: boolean;
    source_name: string;
    source_url: string | null;
  }>;
  uncertainty: string[];
  limitations: string[];
  sources: Array<{ name: string; url: string | null; note: string }>;
  disclaimer: string;
  note?: string | null;
}

export interface TimelineObservation {
  id: number;
  external_id: string;
  acquired_at: string;
  date: string;
  mission: string;
  polarization: string;
  product_type: string;
  data_mode: string;
  is_synthetic: boolean;
  preview_url: string | null;
  days_since_previous: number | null;
  metrics: {
    mean_db: number;
    median_db: number;
    water_fraction: number;
    valid_coverage: number;
  } | null;
  status: string;
  error: string | null;
}

export interface TimelineComparison {
  before_id: number;
  after_id: number;
  before_date: string;
  after_date: string;
  status: string;
  change_area_km2?: number;
  water_gain_km2?: number;
  water_loss_km2?: number;
  net_water_change_km2?: number;
  water_before_fraction?: number;
  water_after_fraction?: number;
  mean_change_db?: number;
  confidence?: string;
  error?: string;
}

export interface Timeline {
  location: Location;
  observations: TimelineObservation[];
  comparisons: TimelineComparison[];
  trend_summary: string;
  data_mode: string;
  is_synthetic: boolean;
  generated_at: string;
}

export interface LayerDefinition {
  key: string;
  name: string;
  kind: string;
  color: string;
  description: string;
  available: boolean;
  data_mode: string;
  legend: Array<{ label: string; color: string }>;
}

export interface LayersResponse {
  mode: string;
  disclaimer: string;
  layers: LayerDefinition[];
}

export interface DataSource {
  key: string;
  name: string;
  provider: string;
  description: string;
  url: string;
  attribution: string;
  license_note: string;
  modes: string[];
  is_available: boolean;
  status_note: string;
}

export interface DataSourcesResponse {
  data: DataStatus;
  sources: DataSource[];
}

export interface LiveItem {
  id: string;
  provider: string;
  mission: string;
  platform: string;
  instrument: string | null;
  product_type: string | null;
  processing_level: string | null;
  polarization: string | string[] | null;
  acquisition_mode: string | null;
  flight_direction: string | null;
  path: number | string | null;
  frame: number | string | null;
  acquired_at: string | null;
  stop_at: string | null;
  bbox: number[] | null;
  center_lat: number | null;
  center_lon: number | null;
  size_bytes: number | null;
  download_url: string | null;
  browse_url: string | null;
  geometry: Record<string, unknown> | null;
  data_mode: string;
  is_synthetic: boolean;
  raster_available: boolean;
  access_note: string;
  source: string;
  source_url: string | null;
  collection?: string | null;
}

export interface LiveSearchResponse {
  provider: string;
  ok: boolean;
  items: LiveItem[];
  error: string | null;
  warning: string | null;
  endpoint: string | null;
  queried_at: string;
  query: Record<string, unknown>;
  disclaimer: string;
}
export interface AnalysisStatisticRow {
  key: string;
  label: string;
  value: number | null;
  unit: string | null;
  category: string;
  description: string | null;
}

export interface AnalysisStatistics {
  analysis_id: number;
  stats: AnalysisStats;
  quality: QualityReport;
  confidence: { score: number; label: string };
  rows: AnalysisStatisticRow[];
}
