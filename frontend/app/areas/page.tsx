import type { Metadata } from "next";
import { AreasBrowser } from "@/components/areas/areas-browser";

export const metadata: Metadata = {
  title: "Monitoring areas",
  description:
    "Every study site on TerraPulse: real bounding boxes across deltas, ice sheets, sea ice, burn scars, croplands, subsiding cities, and an active volcano.",
};

export default function AreasPage() {
  return <AreasBrowser />;
}
