import type {
  Analysis,
  AnalysisStatistics,
  AnalysisSummary,
  ConfigStatus,
  Dashboard,
  DataSourcesResponse,
  Explanation,
  LayersResponse,
  LiveSearchResponse,
  Location,
  Observation,
  Timeline,
} from "@/types/api";

const PUBLIC_API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_API}${normalized}`;
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return apiUrl(path);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Cannot reach the TerraPulse API. Confirm the backend is running on the configured URL.",
      0,
    );
  }
  if (!response.ok) {
    let detail = `Request failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (Array.isArray(body?.detail)) {
        detail = body.detail.map((item: { msg?: string }) => item.msg || "Invalid input").join("; ");
      }
    } catch {
      // keep fallback message
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export interface ComparePayload {
  before_observation_id: number;
  after_observation_id: number;
  method?: "water_change" | "backscatter_diff";
  change_threshold_db?: number;
  water_threshold_db?: number;
}

export const api = {
  config: () => request<ConfigStatus>("/api/config/status"),
  dashboard: () => request<Dashboard>("/api/dashboard/summary"),
  locations: () => request<Location[]>("/api/locations"),
  location: (slug: string) => request<Location>(`/api/locations/${slug}`),
  observations: (params?: { location?: string; start?: string; end?: string; limit?: number }) =>
    request<Observation[]>(`/api/observations${queryString(params || {})}`),
  observation: (id: number) => request<Observation>(`/api/observations/${id}`),
  liveSearch: (params: {
    location?: string;
    bbox?: string;
    start?: string;
    end?: string;
    limit?: number;
  }) => request<LiveSearchResponse>(`/api/observations/search${queryString(params)}`),
  analyses: (params?: { location?: string; limit?: number }) =>
    request<AnalysisSummary[]>(`/api/analysis${queryString(params || {})}`),
  analysis: (id: number) => request<Analysis>(`/api/analysis/${id}`),
  explanation: (id: number) => request<Explanation>(`/api/analysis/${id}/explanation`),
  statistics: (id: number) => request<AnalysisStatistics>(`/api/analysis/${id}/statistics`),
  compare: (payload: ComparePayload) =>
    request<Analysis>("/api/analysis/compare", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  timeline: (location: string) => request<Timeline>(`/api/timeline${queryString({ location })}`),
  layers: () => request<LayersResponse>("/api/layers"),
  dataSources: () => request<DataSourcesResponse>("/api/data-sources"),
  geojson: (id: number) => request<GeoJSON.FeatureCollection>(`/api/analysis/${id}/geojson`),
};

export const queryKeys = {
  config: ["config"] as const,
  dashboard: ["dashboard"] as const,
  locations: ["locations"] as const,
  location: (slug: string) => ["location", slug] as const,
  observations: (params?: Record<string, unknown>) => ["observations", params] as const,
  analyses: (params?: Record<string, unknown>) => ["analyses", params] as const,
  analysis: (id: number) => ["analysis", id] as const,
  explanation: (id: number) => ["explanation", id] as const,
  timeline: (slug: string) => ["timeline", slug] as const,
  layers: ["layers"] as const,
  dataSources: ["data-sources"] as const,
};