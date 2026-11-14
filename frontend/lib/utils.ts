import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (value === null || value === undefined) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
    ...opts,
  }).format(date);
}

export function formatDateShort(value: string | Date | null | undefined): string {
  return formatDate(value, { month: "short", day: "2-digit" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, digits)}%`;
}

export function signed(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const formatted = formatNumber(Math.abs(value), digits);
  return `${value >= 0 ? "+" : "−"}${formatted}`;
}

export function confidenceTone(label: string): "emerald" | "amber" | "danger" {
  if (label === "High") return "emerald";
  if (label === "Moderate") return "amber";
  return "danger";
}