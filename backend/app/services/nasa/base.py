"""Shared discovery types for NASA data adapters."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class DiscoveryResult:
    provider: str
    ok: bool
    items: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
    warning: str | None = None
    endpoint: str | None = None
    queried_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    query: dict[str, Any] = field(default_factory=dict)


class NisarUnavailable(RuntimeError):
    """Raised when remote NASA metadata discovery cannot be completed."""
