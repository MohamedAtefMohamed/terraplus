import type { Metadata } from "next";
import { LiveTimeline } from "@/components/timeline/live-timeline";

export const metadata: Metadata = {
  title: "Acquisition timeline",
  description:
    "Sentinel-1 passes and NISAR catalogue records for a monitoring area over the last 180 days.",
};

export default function TimelinePage() {
  return <LiveTimeline />;
}
