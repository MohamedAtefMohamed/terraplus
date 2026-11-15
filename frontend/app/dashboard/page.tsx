import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Intelligence dashboard",
  description: "Operational telemetry: NISAR catalogue volume from ASF, monitored areas, cached Sentinel-1 comparisons, and service health.",
};

export default function DashboardPage() {
  return <DashboardView />;
}