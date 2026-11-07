"""Path helpers with traversal protection."""

from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings


class UnsafePathError(RuntimeError):
    pass


def to_data_relative(path: str | Path) -> str:
    settings = get_settings()
    resolved = Path(path).resolve()
    try:
        return resolved.relative_to(settings.data_dir.resolve()).as_posix()
    except ValueError as exc:
        raise UnsafePathError("Path is outside the configured data directory") from exc


def resolve_data_path(relative: str) -> Path:
    settings = get_settings()
    candidate = (settings.data_dir / relative).resolve()
    root = settings.data_dir.resolve()
    if candidate != root and root not in candidate.parents:
        raise UnsafePathError("Refusing to access a path outside the data directory")
    return candidate


def to_media_url(relative: str | None) -> str | None:
    if not relative:
        return None
    normalized = relative.replace("\\", "/")
    if normalized.startswith("media/"):
        return "/media/" + normalized[len("media/") :]
    return "/media/" + normalized.lstrip("/")
