import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Intelligence dashboard",
  description: "Live demonstration overview of monitored areas, observations, change analyses and environmental indicators.",
};

export default function DashboardPage() {
  return <DashboardView />;
}