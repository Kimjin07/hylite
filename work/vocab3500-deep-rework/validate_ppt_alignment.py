#!/usr/bin/env python3
"""Check that matched PPT material is visibly absorbed into enriched entries."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("data", type=Path)
    parser.add_argument("index", type=Path)
    args = parser.parse_args()

    entries = load(args.data)
    index = load(args.index)
    issues: list[str] = []
    matched = 0
    note_matched = 0

    for entry in entries:
        word = str(entry.get("word", "<missing>"))
        hits = index.get(word, [])
        if not hits:
            continue
        matched += 1
        classroom = json.dumps(
            {
                key: entry.get(key)
                for key in ("collocations", "advancedExpressions", "classPractice")
            },
            ensure_ascii=False,
        )
        if "课件" not in classroom:
            issues.append(f"{word}: PPT match has no visible courseware attribution")

        has_note = any(hit.get("kind") == "notes" for hit in hits if isinstance(hit, dict))
        if has_note:
            note_matched += 1
            advanced = json.dumps(entry.get("advancedExpressions", []), ensure_ascii=False)
            if "讲者备注" not in advanced:
                issues.append(f"{word}: speaker-note match has no speaker-note teaching card")

        has_exercise = any(
            "语境应用" in str(hit.get("context", ""))
            for hit in hits
            if isinstance(hit, dict)
        )
        if has_exercise:
            practices = json.dumps(entry.get("classPractice", []), ensure_ascii=False)
            if "课件" not in practices:
                issues.append(f"{word}: PPT exercise context not attributed in classPractice")

    print(
        f"{args.data.name}: {len(entries)} entries, {matched} PPT-matched, "
        f"{note_matched} speaker-note-matched, {len(issues)} alignment issues"
    )
    if issues:
        print("\nISSUES:")
        print("\n".join(issues))
        return 1
    print("\nPASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
