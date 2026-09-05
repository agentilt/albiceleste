from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

_SAFE = re.compile(r"[^A-Za-z0-9._:-]+")


class RawStore:
    """Writes every raw payload to disk under an S3-style key.

    Layout: <root>/<source>/<entity>/dt=<YYYY-MM-DD>/<source_record_id>.json
    Swapping this for an S3/MinIO client later is a one-class change.
    """

    def __init__(self, root: Path, enabled: bool = True) -> None:
        self.root = root
        self.enabled = enabled

    def key(self, source: str, entity: str, source_record_id: str, when: datetime | None = None) -> Path:
        when = when or datetime.now(UTC)
        safe_id = _SAFE.sub("_", source_record_id)[:200]
        return self.root / source / entity / f"dt={when:%Y-%m-%d}" / f"{safe_id}.json"

    def write(self, source: str, entity: str, source_record_id: str, payload: Any) -> Path | None:
        if not self.enabled:
            return None
        path = self.key(source, entity, source_record_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, default=str), encoding="utf-8")
        return path
