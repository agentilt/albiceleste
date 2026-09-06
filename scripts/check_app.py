"""Run every Streamlit page headlessly and report exceptions. Needs the database up and models built."""
from __future__ import annotations

import sys
from pathlib import Path

from streamlit.testing.v1 import AppTest

APP = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP))
pages = [APP / "Home.py", *sorted((APP / "pages").glob("*.py"))]
failed = 0
for pg in pages:
    at = AppTest.from_file(str(pg), default_timeout=120)
    at.run()
    errs = [e.value for e in at.exception]
    status = "ok" if not errs else "FAIL"
    failed += bool(errs)
    print(f"{status:4} {pg.relative_to(APP)}  ({len(at.dataframe)} tables, {len(at.markdown)} markdown blocks)")
    for e in errs:
        print("     ", str(e)[:400])
sys.exit(1 if failed else 0)
