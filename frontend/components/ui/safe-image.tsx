"use client";

import { useState } from "react";

/**
 * Renders a remote image and swaps to a fallback when it fails.
 * NISAR browse URLs are signed and can expire or point at a missing preview,
 * so a hard 404 must never leave a broken-image icon in the interface.
 */
export function SafeImage({
  src,
  alt,
  className,
  fallback = null,
  loading = "lazy",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
