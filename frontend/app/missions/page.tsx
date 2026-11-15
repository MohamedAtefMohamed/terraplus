import type { Metadata } from "next";
import {
  ArrowUpRight,
  Database,
  Layers3,
  Radar,
  Satellite,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Data & Missions",
  description:
    "The satellite missions and data services behind TerraPulse: NISAR catalogue records from ASF, Sentinel-1 GRD change analysis, and NASA GIBS imagery.",
};

const MISSIONS = [
  {
    key: "nisar",
    name: "NASA-ISRO NISAR",
    operator: "NASA · ISRO",
    type: "L-band and S-band SAR",
    role: "Catalogue records, browse imagery, and granule footprints",
    status: "Catalogue live",
    statusTone: "emerald" as const,
    icon: Satellite,
    href: "https://science.nasa.gov/mission/nisar/",
    note: "Products published so far are RSLC, GSLC, and GCOV. L-band pixel processing is not public yet, so TerraPulse reads the catalogue and browse quick-looks only.",
  },
  {
    key: "s1",
    name: "Copernicus Sentinel-1",
    operator: "ESA · distributed via ASF and AWS",
    type: "C-band SAR, GRD",
    role: "Pixel-level change measurement in the live lab",
    status: "Analysis live",
    statusTone: "emerald" as const,
    icon: Radar,
    href: "https://registry.opendata.aws/sentinel-1/",
    note: "Two GRD scenes on the same relative orbit, read through cloud-optimized GeoTIFF windows, compared in relative decibels after a 3×3 speckle screen.",
  },
];

const SERVICES = [
  {
    name: "ASF DAAC search API",
    provides: "NISAR granule metadata, footprints, browse imagery",
    credentials: "None",
    url: "https://search.asf.alaska.edu/",
    icon: Database,
  },
  {
    name: "Element 84 Earth Search",
    provides: "Sentinel-1 GRD STAC index",
    credentials: "None",
    url: "https://earth-search.aws.element84.com/v1",
    icon: Layers3,
  },
  {
    name: "AWS Open Data · sentinel-s1-l1c",
    provides: "Cloud-optimized Sentinel-1 scenes, read in place",
    credentials: "None",
    url: "https://registry.opendata.aws/sentinel-1/",
    icon: Layers3,
  },
  {
    name: "NASA GIBS",
    provides: "Daily MODIS Terra corrected reflectance basemap",
    credentials: "None",
    url: "https://gibs.earthdata.nasa.gov/",
    icon: Satellite,
  },
];

export default function MissionsPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Data & missions"
        title="Missions and data services"
        description="TerraPulse consumes four public services. No credentials are required for any of them, and every request is read-only."
      />

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {MISSIONS.map((mission) => {
          const Icon = mission.icon;
          return (
            <article key={mission.key} className="panel bracket p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface-high">
                    <Icon className="size-4 text-accent" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{mission.name}</h2>
                    <p className="mt-0.5 text-[11px] text-muted">{mission.operator}</p>
                  </div>
                </div>
                <Badge variant={mission.statusTone}>{mission.status}</Badge>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="panel-flat p-3">
                  <dt className="tech-label">Instrument</dt>
                  <dd className="mt-1 text-[11px] text-muted-strong">{mission.type}</dd>
                </div>
                <div className="panel-flat p-3">
                  <dt className="tech-label">Used for</dt>
                  <dd className="mt-1 text-[11px] text-muted-strong">{mission.role}</dd>
                </div>
              </dl>

              <p className="mt-3 text-[11px] leading-relaxed text-muted">{mission.note}</p>

              <a
                href={mission.href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
              >
                Official mission information <ArrowUpRight className="size-3" />
              </a>
            </article>
          );
        })}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-foreground">Data services</h2>
        <div className="panel mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line bg-surface/60 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  <th className="px-4 py-2.5 font-normal">Service</th>
                  <th className="px-4 py-2.5 font-normal">Provides</th>
                  <th className="px-4 py-2.5 font-normal">Credentials</th>
                  <th className="px-4 py-2.5 font-normal">Status</th>
                  <th className="px-4 py-2.5 font-normal">Link</th>
                </tr>
              </thead>
              <tbody>
                {SERVICES.map((service) => {
                  const Icon = service.icon;
                  return (
                    <tr key={service.name} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <Icon className="size-3.5 text-accent" />
                          {service.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-strong">{service.provides}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                          {service.credentials}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="emerald">live</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
                        >
                          Open <ArrowUpRight className="size-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel mt-10 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" />
          <div className="space-y-1.5">
            <h2 className="text-xs font-semibold text-foreground">Attribution rules</h2>
            <p className="text-[11px] leading-relaxed text-muted">
              Sentinel-1 pixels are never presented as NISAR data. Catalogue records keep their
              granule identifiers and product levels. Change results state the sensor, scene
              identifiers, processing parameters, and that the numbers are screening signals
              rather than a flood or hazard determination.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}