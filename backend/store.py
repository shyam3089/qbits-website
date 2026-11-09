import json
import os
import tempfile
from pathlib import Path
from threading import RLock

from .schemas import Page, SiteConfig

CONTENT = Path(__file__).parent / "content"


class ContentStore:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.lock = RLock()

    def site(self) -> SiteConfig:
        with self.lock:
            path = self.data_dir / "site.json"
            return SiteConfig.model_validate_json((path if path.exists() else CONTENT / "site.json").read_text(encoding="utf-8"))

    def save(self, config: SiteConfig) -> SiteConfig:
        with self.lock:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            descriptor, name = tempfile.mkstemp(dir=self.data_dir, suffix=".tmp")
            try:
                with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                    handle.write(config.model_dump_json(indent=2))
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(name, self.data_dir / "site.json")
            finally:
                Path(name).unlink(missing_ok=True)
        return config

    def page(self, slug: str) -> Page | None:
        # Never use a request path to select a filesystem path.
        if slug not in {"features", "docs", "examples", "roadmap"}:
            return None
        return Page.model_validate_json((CONTENT / "pages" / f"{slug}.json").read_text(encoding="utf-8"))
