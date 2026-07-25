#!/usr/bin/env python3
"""Extract all inline JavaScript blocks and run Node's syntax checker."""

from __future__ import annotations

import argparse
import re
import subprocess
import tempfile
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("html", type=Path)
    args = parser.parse_args()

    html = args.html.read_text(encoding="utf-8-sig")
    blocks = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, re.DOTALL | re.IGNORECASE)
    source = "\n;\n".join(blocks)
    with tempfile.TemporaryDirectory(prefix="vocab3500-syntax-") as temp_dir:
        script = Path(temp_dir) / "all-inline-scripts.js"
        script.write_text(source, encoding="utf-8")
        result = subprocess.run(
            ["node", "--check", str(script)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip())
    if result.returncode == 0:
        print(f"PASS {args.html}: {len(blocks)} inline script block(s)")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
