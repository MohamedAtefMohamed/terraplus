"""Vercel serverless entrypoint for the TerraPulse FastAPI app."""

from __future__ import annotations

import os
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def log(obj) -> None:  # type: ignore[ann-source]
    sys.stderr.write(str(obj) + "\n")
    sys.stderr.flush()


try:
    log("TASK ls: " + ", ".join(sorted(os.listdir("/var/task"))[:50]))
    vendored = Path(__file__).resolve().parent.parent / "venvlibs"
    log(f"VENVLIBS: exists={vendored.exists()}")
    if vendored.exists():
        log("VENVLIBS files: " + ", ".join(p.name for p in vendored.iterdir()))
    import ctypes

    ctypes.CDLL(str(vendored / "libexpat.so.1.6.0"), mode=ctypes.RTLD_GLOBAL)
    log("CDLL ok")
except Exception:
    log("VENDLOAD-ERR " + traceback.format_exc()[-1500:])

from app.main import app  # noqa: E402,F401
