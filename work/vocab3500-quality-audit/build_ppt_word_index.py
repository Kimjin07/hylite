#!/usr/bin/env python3
"""Build a per-word index of matching slide and speaker-note contexts."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


HEADER_RE = re.compile(r"^########## FILE: (.+?) \(\d+ slides\) ##########$")
SECTION_RE = re.compile(r"^--- (slide|notes) (\d+) ---$")


def load_words(data_dir: Path, file_glob: str) -> list[str]:
    words: list[str] = []
    for path in sorted(data_dir.glob(file_glob)):
        with path.open("r", encoding="utf-8-sig") as handle:
            entries = json.load(handle)
        words.extend(str(entry["word"]) for entry in entries)
    return words


def parse_ppt_dump(path: Path) -> list[dict[str, str | int]]:
    sections: list[dict[str, str | int]] = []
    current_file = ""
    current_kind = ""
    current_number = 0
    buffer: list[str] = []

    def flush() -> None:
        if current_kind and buffer:
            sections.append(
                {
                    "file": current_file,
                    "kind": current_kind,
                    "number": current_number,
                    "text": " ".join(part.strip() for part in buffer if part.strip()),
                }
            )

    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        file_match = HEADER_RE.match(raw_line)
        section_match = SECTION_RE.match(raw_line)
        if file_match:
            flush()
            buffer = []
            current_file = file_match.group(1)
            current_kind = ""
            current_number = 0
        elif section_match:
            flush()
            buffer = []
            current_kind = section_match.group(1)
            current_number = int(section_match.group(2))
        elif current_kind:
            buffer.append(raw_line)
    flush()
    return sections


def word_pattern(word: str) -> re.Pattern[str]:
    normalized = word.replace("’", "'").strip()
    pieces = re.split(r"(one's|sb|sth)", normalized, flags=re.IGNORECASE)
    pattern = ""
    for piece in pieces:
        lower = piece.lower()
        if lower == "one's":
            pattern += r"(?:one's|my|your|his|her|its|our|their)"
        elif lower == "sb":
            pattern += r"(?:sb|somebody|someone|him|her|them|me|us|you)"
        elif lower == "sth":
            pattern += r"(?:sth|something|[a-z][a-z'-]*)"
        else:
            pattern += re.escape(piece).replace(r"\ ", r"\s+")
    return re.compile(rf"(?<![A-Za-z]){pattern}(?![A-Za-z])", re.IGNORECASE)


def snippet(text: str, match: re.Match[str], radius: int = 260) -> str:
    start = max(0, match.start() - radius)
    end = min(len(text), match.end() + radius)
    prefix = "..." if start else ""
    suffix = "..." if end < len(text) else ""
    return prefix + text[start:end].strip() + suffix


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True, type=Path)
    parser.add_argument("--glob", default="*_data.json", help="Data filename glob within --data-dir")
    parser.add_argument("--ppt-text", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    sections = parse_ppt_dump(args.ppt_text)
    index: dict[str, list[dict[str, str | int]]] = {}
    for word in load_words(args.data_dir, args.glob):
        pattern = word_pattern(word)
        matches: list[dict[str, str | int]] = []
        for section in sections:
            match = pattern.search(str(section["text"]).replace("’", "'"))
            if match:
                matches.append(
                    {
                        "file": section["file"],
                        "kind": section["kind"],
                        "number": section["number"],
                        "context": snippet(str(section["text"]), match),
                    }
                )
        index[word] = matches

    args.output.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    matched = sum(bool(matches) for matches in index.values())
    note_matched = sum(any(match["kind"] == "notes" for match in matches) for matches in index.values())
    print(f"{args.data_dir.name}: {len(index)} words; {matched} match slides/notes; {note_matched} match speaker notes")


if __name__ == "__main__":
    main()
