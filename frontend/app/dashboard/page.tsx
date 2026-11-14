import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Intelligence dashboard",
  description: "Live NISAR catalogue counts, monitored areas, and cached Sentinel-1 change summaries.",
};

export default function DashboardPage() {
  return <DashboardView />;
}