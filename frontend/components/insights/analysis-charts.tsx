"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisStatistics } from "@/types/api";
import { formatNumber, percent } from "@/lib/utils";

const AXIS = { stroke: "#8295aa", fontSize: 10, fontFamily: "var(--font-mono)" };

function TooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line-strong bg-[#0c1219] px-2.5 py-1.5 font-mono text-[10px] text-foreground shadow-lg">
      {children}
    </div>
  );
}

export function AnalysisCharts({ statistics }: { statistics: AnalysisStatistics }) {
  const stats = statistics.stats || {};
  const quality = statistics.quality || {};
  const coverage = Number(stats.valid_coverage ?? quality.valid_coverage ?? 0);
  const confidence = Number(
    quality.confidence_score ?? statistics.confidence?.score ?? 0,
  );

  const water = [
    { name: "Earliest", value: Number(stats.water_before_fraction ?? 0) * 100 },
    { name: "Latest", value: Number(stats.water_after_fraction ?? 0) * 100 },
  ];

  const areas = [
    { name: "Water gain", value: Number(stats.water_gain_km2 ?? 0), color: "#7aa7ff" },
    { name: "Water loss", value: Number(stats.water_loss_km2 ?? 0), color: "#d9a45b" },
    { name: "Changed", value: Number(stats.change_area_km2 ?? 0), color: "#9b93ff" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="panel p-4">
        <p className="tech-label">Observation coverage</p>
        <div className="mt-2 h-[168px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={[{ name: "coverage", value: coverage * 100, fill: "#f4f4f4" }]}
              innerRadius="68%"
              outerRadius="100%"
              startAngle={210}
              endAngle={-30}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#17171a" }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="-mt-8 text-center">
          <p className="metric-value text-2xl font-semibold text-foreground">
            {percent(coverage * 100, 1)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            valid overlap · confidence {Number(confidence).toFixed(2)}
          </p>
        </div>
      </section>

      <section className="panel p-4">
        <p className="tech-label">Low-backscatter water indicator</p>
        <div className="mt-2 h-[168px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={water} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#17171a" vertical={false} />
              <XAxis dataKey="name" tick={AXIS} axisLine={{ stroke: "#26262b" }} tickLine={false} />
              <YAxis
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={[0, "dataMax + 5"]}
              />
              <Tooltip
                cursor={{ fill: "rgba(25,200,232,0.06)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipShell>
                      {label}: {Number(payload[0].value).toFixed(2)}%
                    </TooltipShell>
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="#5fd0c0" maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted">
          Share of valid pixels below the Otsu water threshold.
        </p>
      </section>

      <section className="panel p-4">
        <p className="tech-label">Change composition · km²</p>
        <div className="mt-2 h-[168px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areas} margin={{ top: 12, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="#17171a" horizontal={false} />
              <XAxis
                dataKey="name"
                tick={{ ...AXIS, fontSize: 9 }}
                axisLine={{ stroke: "#26262b" }}
                tickLine={false}
              />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(25,200,232,0.06)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipShell>
                      {label}: {Number(payload[0].value).toFixed(2)} km²
                    </TooltipShell>
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={44}>
                {areas.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <dl className="mt-1 grid grid-cols-3 gap-2 border-t border-line pt-2 text-[10px]">
          <div>
            <dt className="text-muted">Area</dt>
            <dd className="mt-0.5 font-mono text-foreground">
              {formatNumber(stats.aoi_area_km2 ?? 0, 0)} km²
            </dd>
          </div>
          <div>
            <dt className="text-muted">Valid</dt>
            <dd className="mt-0.5 font-mono text-foreground">
              {formatNumber(stats.valid_area_km2 ?? 0, 0)} km²
            </dd>
          </div>
          <div>
            <dt className="text-muted">Net water</dt>
            <dd className="mt-0.5 font-mono text-foreground">
              {formatNumber(stats.net_water_change_km2 ?? 0, 2)} km²
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}