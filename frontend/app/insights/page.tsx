import type { Metadata } from "next";
import { LiveInsights } from "@/components/insights/live-insights";

export const metadata: Metadata = {
  title: "Interpretation",
  description:
    "A deterministic reading of a live Sentinel-1 comparison, with measurements, plausible drivers, and limits.",
};

export default function InsightsPage() {
  return <LiveInsights />;
}
