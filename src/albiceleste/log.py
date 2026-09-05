from __future__ import annotations

import logging

from rich.console import Console
from rich.logging import RichHandler

console = Console(stderr=True)


def setup_logging(level: str = "INFO") -> logging.Logger:
    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True, show_path=False)],
        force=True,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    return logging.getLogger("albiceleste")


log = logging.getLogger("albiceleste")
