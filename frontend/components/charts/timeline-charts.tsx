"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/utils";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line-strong bg-[#0b1422] px-3 py-2 shadow-xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-[10px]">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted">{entry.name}</span>
            <span className="ml-auto font-mono text-foreground">
              {formatNumber(entry.value, 2)}
              {entry.unit || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WaterTrendChart({
  data,
}: {
  data: Array<{ date: string; fullDate: string; water: number | null; meanDb: number | null }>;
}) {
  return (
    <div className="h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#17263b" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#8ba0b9", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            axisLine={{ stroke: "#1a2a40" }}
            tickLine={false}
            dy={6}
          />
          <YAxis
            yAxisId="water"
            tick={{ fill: "#8ba0b9", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            axisLine={false}
            tickLine={false}
            unit="%"
            domain={[0, "auto"]}
          />
          <YAxis
            yAxisId="db"
            orientation="right"
            tick={{ fill: "#5b7089", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            axisLine={false}
            tickLine={false}
            unit=" dB"
            domain={["auto", "auto"]}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#27405e", strokeDasharray: "3 3" }} />
          <Area
            yAxisId="water"
            type="monotone"
            dataKey="water"
            name="Water indicator"
            unit="%"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#waterFill)"
            dot={{ r: 3, fill: "#050a12", stroke: "#38bdf8", strokeWidth: 1.5 }}
            activeDot={{ r: 4, fill: "#38bdf8" }}
          />
          <Line
            yAxisId="db"
            type="monotone"
            dataKey="meanDb"
            name="Mean backscatter"
            unit=" dB"
            stroke="#2dd4bf"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ r: 2, fill: "#2dd4bf" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChangeBarChart({
  data,
}: {
  data: Array<{ range: string; gain: number; loss: number; changed: number; confidence: string }>;
}) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="#17263b" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: "#8ba0b9", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            axisLine={{ stroke: "#1a2a40" }}
            tickLine={false}
            interval={0}
            dy={6}
          />
          <YAxis
            tick={{ fill: "#8ba0b9", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
            axisLine={false}
            tickLine={false}
            unit=" km²"
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />
          <Bar
            dataKey="gain"
            name="Water gain"
            unit=" km²"
            stackId="water"
            fill="#22d3ee"
            fillOpacity={0.75}
            radius={[2, 2, 0, 0]}
            maxBarSize={38}
          />
          <Bar
            dataKey="loss"
            name="Water loss"
            unit=" km²"
            stackId="water"
            fill="#fb923c"
            fillOpacity={0.75}
            radius={[2, 2, 0, 0]}
            maxBarSize={38}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}