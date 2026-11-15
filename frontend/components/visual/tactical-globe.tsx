"use client";

import { useEffect, useRef } from "react";

export type GlobeMarker = {
  lon: number;
  lat: number;
  label?: string;
  tone?: "cyan" | "amber";
};

/**
 * Sensor modes mirror the post-process stages used by the WorldView tactical
 * intelligence viewer (CRT scanlines, NVG green phosphor, FLIR thermal ramp).
 * They are implemented on a 2D canvas here so the hero stays dependency-free
 * and needs no Cesium Ion or Google tiles key.
 */
export type SensorMode = "eo" | "crt" | "nvg" | "flir";

export const SENSOR_MODES: Array<{ key: SensorMode; label: string; hint: string }> = [
  { key: "eo", label: "EO", hint: "Electro-optical composite" },
  { key: "crt", label: "CRT", hint: "Scanlines and vignette" },
  { key: "nvg", label: "NVG", hint: "Green phosphor" },
  { key: "flir", label: "FLIR", hint: "Thermal ramp" },
];

type LandData = { type: "MultiPolygon"; coordinates: number[][][][] };

type Palette = {
  ocean: [string, string, string];
  land: string;
  landStroke: string;
  graticule: string;
  limb: string;
  markerCyan: string;
  markerAmber: string;
  dust: string;
};

const PALETTES: Record<SensorMode, Palette> = {
  eo: {
    ocean: ["#151517", "#0e0e10", "#08080a"],
    land: "rgba(58, 58, 62, 0.96)",
    landStroke: "rgba(255, 255, 255, 0.42)",
    graticule: "rgba(255, 255, 255, 0.1)",
    limb: "rgba(255, 255, 255, 0.34)",
    markerCyan: "244, 244, 244",
    markerAmber: "217, 164, 91",
    dust: "rgba(255, 255, 255, 0.05)",
  },
  crt: {
    ocean: ["#0f1210", "#0a0d0b", "#060807"],
    land: "rgba(120, 140, 128, 0.75)",
    landStroke: "rgba(214, 255, 226, 0.6)",
    graticule: "rgba(160, 255, 200, 0.12)",
    limb: "rgba(190, 255, 214, 0.45)",
    markerCyan: "240, 255, 245",
    markerAmber: "255, 214, 140",
    dust: "rgba(255, 255, 255, 0.06)",
  },
  nvg: {
    ocean: ["#0a1a0c", "#061206", "#030803"],
    land: "rgba(60, 190, 96, 0.62)",
    landStroke: "rgba(150, 255, 170, 0.75)",
    graticule: "rgba(120, 255, 150, 0.14)",
    limb: "rgba(150, 255, 170, 0.55)",
    markerCyan: "190, 255, 200",
    markerAmber: "230, 255, 190",
    dust: "rgba(140, 255, 160, 0.08)",
  },
  flir: {
    ocean: ["#1a0a1e", "#120714", "#080309"],
    land: "rgba(214, 96, 40, 0.85)",
    landStroke: "rgba(255, 214, 140, 0.8)",
    graticule: "rgba(255, 170, 110, 0.12)",
    limb: "rgba(255, 190, 120, 0.5)",
    markerCyan: "255, 236, 200",
    markerAmber: "255, 180, 90",
    dust: "rgba(255, 190, 120, 0.07)",
  },
};

function deg(value: number) {
  return (value * Math.PI) / 180;
}

/** Thermal ramp used by the FLIR mode (approximates an ironbow palette). */
function thermalRamp(t: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0, [10, 6, 14]],
    [0.35, [110, 30, 90]],
    [0.58, [210, 60, 60]],
    [0.78, [242, 160, 60]],
    [0.92, [250, 220, 130]],
    [1, [255, 252, 240]],
  ];
  for (let index = 1; index < stops.length; index += 1) {
    const [t1, c1] = stops[index];
    const [t0, c0] = stops[index - 1];
    if (t <= t1) {
      const k = (t - t0) / Math.max(0.0001, t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

export function TacticalGlobe({
  markers = [],
  className,
  spin = true,
  mode = "eo",
  showHud = true,
}: {
  markers?: GlobeMarker[];
  className?: string;
  spin?: boolean;
  mode?: SensorMode;
  showHud?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef(markers);
  const modeRef = useRef(mode);
  const hudRef = useRef(showHud);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    hudRef.current = showHud;
  }, [showHud]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let land: LandData | null = null;
    let frame = 0;
    let raf = 0;
    let disposed = false;
    let visible = true;
    let lastDraw = 0;
    let lon0 = -40;
    let width = 0;
    let height = 0;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rotating = spin && !reduced;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const project = (lon: number, lat: number, lat0: number, radius: number) => {
      const lam = deg(lon - lon0);
      const phi = deg(lat);
      const phi0 = deg(lat0);
      const cosc =
        Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam);
      if (cosc <= 0) return null;
      const x = radius * Math.cos(phi) * Math.sin(lam);
      const y =
        radius *
        (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam));
      return { x, y, cosc };
    };

    /** Sensor post-process: pixel pass for NVG/FLIR, overlays for CRT. */
    const postProcess = (sensor: SensorMode) => {
      if (sensor === "nvg" || sensor === "flir") {
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        for (let i = 0; i < data.length; i += 4) {
          const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          if (sensor === "nvg") {
            const boosted = Math.min(1, lum * 1.5);
            data[i] = Math.round(boosted * 120 + 6);
            data[i + 1] = Math.round(boosted * 255);
            data[i + 2] = Math.round(boosted * 150 + 8);
          } else {
            const [r, g, b] = thermalRamp(lum);
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
        }
        context.putImageData(image, 0, 0);
      }

      if (sensor === "crt" || sensor === "nvg") {
        // scanlines
        context.fillStyle = "rgba(0, 0, 0, 0.16)";
        for (let y = 0; y < height; y += 3) {
          context.fillRect(0, y, width, 1);
        }
        // vignette
        const vignette = context.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.32,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.72,
        );
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, sensor === "nvg" ? "rgba(0,12,0,0.72)" : "rgba(0,0,0,0.68)");
        context.fillStyle = vignette;
        context.fillRect(0, 0, width, height);
      }

      if (sensor === "crt") {
        // horizontal chroma smear reads as RGB shift at this scale
        context.globalCompositeOperation = "screen";
        context.globalAlpha = 0.16;
        context.drawImage(canvas, -1.4, 0, width, height);
        context.drawImage(canvas, 1.4, 0, width, height);
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }

      if (sensor !== "eo" && !reduced) {
        // sensor grain
        const count = sensor === "nvg" ? 900 : 620;
        for (let i = 0; i < count; i += 1) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          context.fillStyle =
            sensor === "nvg"
              ? `rgba(180, 255, 190, ${Math.random() * 0.05})`
              : `rgba(255, 255, 255, ${Math.random() * 0.04})`;
          context.fillRect(x, y, 1, 1);
        }
      }
    };

    const drawHud = (sensor: SensorMode, markerCount: number) => {
      const centreX = width / 2;
      const centreY = height / 2;
      const limb = Math.min(width, height) * 0.4;

      // reticle
      context.strokeStyle = "rgba(255, 255, 255, 0.32)";
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(centreX - 26, centreY);
      context.lineTo(centreX - 8, centreY);
      context.moveTo(centreX + 8, centreY);
      context.lineTo(centreX + 26, centreY);
      context.moveTo(centreX, centreY - 26);
      context.lineTo(centreX, centreY - 8);
      context.moveTo(centreX, centreY + 8);
      context.lineTo(centreX, centreY + 26);
      context.stroke();
      context.strokeRect(centreX - 3.5, centreY - 3.5, 7, 7);

      // radial ticks around the limb
      context.strokeStyle = "rgba(255, 255, 255, 0.18)";
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = deg(angle);
        const outer = limb * 1.07;
        const inner = outer - (angle % 45 === 0 ? 9 : 4);
        context.beginPath();
        context.moveTo(centreX + Math.cos(rad) * inner, centreY + Math.sin(rad) * inner);
        context.lineTo(centreX + Math.cos(rad) * outer, centreY + Math.sin(rad) * outer);
        context.stroke();
      }

      // reading block
      context.fillStyle = "rgba(255, 255, 255, 0.55)";
      context.font = "500 9px ui-monospace, SFMono-Regular, Menlo, monospace";
      const lines = [
        `SENSOR ${sensor.toUpperCase()}`,
        `LON ${lon0.toFixed(1)}°  TILT 16.0°`,
        `PROJ ORTHOGRAPHIC`,
        `TRACK ${markerCount} ACQ`,
      ];
      lines.forEach((line, index) => {
        context.fillText(line, 14, height - 14 - (lines.length - 1 - index) * 12);
      });
    };

    const draw = () => {
      const sensor = modeRef.current;
      const palette = PALETTES[sensor];
      const radius = Math.min(width, height) * 0.4;
      const cx = width / 2;
      const cy = height / 2;
      const lat0 = 16;

      context.clearRect(0, 0, width, height);

      // atmosphere
      const glow = context.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.4);
      glow.addColorStop(0, palette.dust);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
      context.fill();

      // sphere
      const ocean = context.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.36,
        radius * 0.1,
        cx,
        cy,
        radius,
      );
      ocean.addColorStop(0, palette.ocean[0]);
      ocean.addColorStop(0.55, palette.ocean[1]);
      ocean.addColorStop(1, palette.ocean[2]);
      context.fillStyle = ocean;
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.fill();

      context.save();
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.clip();
      context.translate(cx, cy);

      context.strokeStyle = palette.graticule;
      context.lineWidth = 0.6;
      for (let lon = -180; lon < 180; lon += 30) {
        context.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const point = project(lon, lat, lat0, radius);
          if (!point) {
            started = false;
            continue;
          }
          if (!started) {
            context.moveTo(point.x, point.y);
            started = true;
          } else {
            context.lineTo(point.x, point.y);
          }
        }
        context.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        context.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 3) {
          const point = project(lon, lat, lat0, radius);
          if (!point) {
            started = false;
            continue;
          }
          if (!started) {
            context.moveTo(point.x, point.y);
            started = true;
          } else {
            context.lineTo(point.x, point.y);
          }
        }
        context.stroke();
      }

      if (land) {
        for (const polygon of land.coordinates) {
          const ring = polygon[0];
          if (!ring?.length) continue;
          context.beginPath();
          let started = false;
          for (const [lon, lat] of ring) {
            const point = project(lon, lat, lat0, radius);
            if (!point) {
              started = false;
              continue;
            }
            if (!started) {
              context.moveTo(point.x, point.y);
              started = true;
            } else {
              context.lineTo(point.x, point.y);
            }
          }
          if (!started) continue;
          context.closePath();
          context.fillStyle = palette.land;
          context.fill();
          context.strokeStyle = palette.landStroke;
          context.lineWidth = 0.7;
          context.stroke();
        }
      }

      // terminator
      const sunLon = lon0 + 150;
      const terminator = context.createLinearGradient(
        project(sunLon, 0, lat0, radius)?.x ?? -radius,
        0,
        project(sunLon - 180, 0, lat0, radius)?.x ?? radius,
        0,
      );
      terminator.addColorStop(0, "rgba(0, 0, 0, 0)");
      terminator.addColorStop(0.62, "rgba(0, 0, 0, 0.46)");
      terminator.addColorStop(1, "rgba(0, 0, 0, 0.7)");
      context.fillStyle = terminator;
      context.fillRect(-radius, -radius, radius * 2, radius * 2);

      // radar sweep
      if (!reduced && sensor !== "flir") {
        const sweepAngle = ((frame % 420) / 420) * Math.PI * 2;
        const sweep = context.createLinearGradient(
          0,
          0,
          Math.cos(sweepAngle) * radius,
          Math.sin(sweepAngle) * radius,
        );
        sweep.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        sweep.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.fillStyle = sweep;
        context.beginPath();
        context.moveTo(0, 0);
        context.arc(0, 0, radius, sweepAngle - 0.34, sweepAngle);
        context.closePath();
        context.fill();
      }

      // acquisition markers (real catalogue coordinates)
      for (const marker of markersRef.current) {
        const point = project(marker.lon, marker.lat, lat0, radius);
        if (!point) continue;
        const tone = marker.tone === "amber" ? palette.markerAmber : palette.markerCyan;
        const pulse = reduced ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin((frame + marker.lon) / 46));
        context.beginPath();
        context.arc(point.x, point.y, 2, 0, Math.PI * 2);
        context.fillStyle = `rgba(${tone}, 1)`;
        context.fill();
        context.beginPath();
        context.arc(point.x, point.y, 2 + 5.5 * pulse, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${tone}, ${0.4 * (1 - pulse) + 0.1})`;
        context.lineWidth = 1;
        context.stroke();
      }

      context.restore();

      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.strokeStyle = palette.limb;
      context.lineWidth = 1;
      context.stroke();

      // orbital tracks + satellites
      const orbits = [
        { rx: radius * 1.3, ry: radius * 0.42, rot: -0.34, speed: 0.0055, alpha: 0.22 },
        { rx: radius * 1.16, ry: radius * 0.68, rot: 0.62, speed: -0.0042, alpha: 0.16 },
      ];
      for (const orbit of orbits) {
        context.save();
        context.translate(cx, cy);
        context.rotate(orbit.rot);
        context.beginPath();
        context.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255, 255, 255, ${orbit.alpha})`;
        context.setLineDash([3, 6]);
        context.lineWidth = 0.9;
        context.stroke();
        context.setLineDash([]);
        const angle = reduced ? 0.8 : (frame * orbit.speed) % (Math.PI * 2);
        const sx = Math.cos(angle) * orbit.rx;
        const sy = Math.sin(angle) * orbit.ry;
        context.beginPath();
        context.arc(sx, sy, 2.6, 0, Math.PI * 2);
        context.fillStyle = "rgba(255, 255, 255, 0.92)";
        context.fill();
        context.restore();
      }

      postProcess(sensor);
      if (hudRef.current) drawHud(sensor, markersRef.current.length);
    };

    const loop = (time: number) => {
      if (disposed) return;
      raf = window.requestAnimationFrame(loop);
      if (!visible) return;
      // Pixel-level sensor passes (NVG/FLIR) are heavier; step down on small screens.
      const pixelPass = modeRef.current === "nvg" || modeRef.current === "flir";
      const interval = pixelPass && width < 720 ? 60 : 26;
      if (time - lastDraw < interval) return;
      lastDraw = time;
      frame += 1;
      if (rotating) lon0 -= 0.055;
      draw();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (!disposed) {
        cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(loop);
      }
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(canvas);
    resize();

    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    fetch("/geo/land.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        land = data as LandData | null;
        draw();
      })
      .catch(() => draw());

    raf = window.requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [spin]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label="Tactical world view: rotating Earth with live NISAR acquisition markers"
    />
  );
}