from __future__ import annotations

import argparse
import posixpath
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).with_name("lp-source-zip")
OUTPUT = Path(__file__).with_name("ppt-text")
TEXT_TAG = "{http://schemas.openxmlformats.org/drawingml/2006/main}t"
REL_TAG = "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"
NOTES_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"


def numeric_key(name: str) -> tuple[int, str]:
    match = re.search(r"(\d+)", Path(name).stem)
    return (int(match.group(1)) if match else 0, name)


def xml_text(archive: zipfile.ZipFile, name: str) -> str:
    root = ElementTree.fromstring(archive.read(name))
    return " ".join(
        node.text.strip()
        for node in root.iter(TEXT_TAG)
        if node.text and node.text.strip()
    )


def slide_note_name(archive: zipfile.ZipFile, slide_name: str) -> str | None:
    rel_name = f"ppt/slides/_rels/{Path(slide_name).name}.rels"
    if rel_name not in archive.namelist():
        return None
    root = ElementTree.fromstring(archive.read(rel_name))
    for node in root.iter(REL_TAG):
        if node.get("Type") == NOTES_REL_TYPE and node.get("Target"):
            target = posixpath.normpath(posixpath.join("ppt/slides", node.get("Target", "")))
            return target if target in archive.namelist() else None
    return None


def extract_ppt(path: Path) -> tuple[str, int, int]:
    blocks: list[str] = []
    slide_count = 0
    note_count = 0
    with zipfile.ZipFile(path) as archive:
        slide_names = sorted(
            (
                name
                for name in archive.namelist()
                if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)
            ),
            key=numeric_key,
        )
        for index, slide_name in enumerate(slide_names, start=1):
            text = xml_text(archive, slide_name)
            blocks.append(f"--- slide {index} ---\n{text}")
            slide_count += 1
            note_name = slide_note_name(archive, slide_name)
            if note_name:
                note = xml_text(archive, note_name)
                if note:
                    blocks.append(f"--- notes {index} ---\n{note}")
                    note_count += 1
    return "\n".join(blocks), slide_count, note_count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()

    root = args.root
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    books: dict[str, list[str]] = {}
    directories: dict[Path, list[str]] = {}
    totals = {"ppts": 0, "slides": 0, "notes": 0, "chars": 0}

    for path in sorted(root.rglob("*.pptx")):
        relative = path.relative_to(root)
        text, slides, notes = extract_ppt(path)
        header = f"########## FILE: {relative.as_posix()} ({slides} slides) ##########"
        document = f"{header}\n{text}\n"
        output_path = output / relative.with_suffix(".txt")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(document, encoding="utf-8")

        book = relative.parts[0]
        books.setdefault(book, []).append(document)
        directories.setdefault(relative.parent, []).append(document)
        totals["ppts"] += 1
        totals["slides"] += slides
        totals["notes"] += notes
        totals["chars"] += len(document)

    for book, documents in books.items():
        target = output / f"{book}_ppt_all.txt"
        target.write_text("\n".join(documents), encoding="utf-8")

    for directory, documents in directories.items():
        target = output / directory / "_ppt_all.txt"
        target.write_text("\n".join(documents), encoding="utf-8")

    print(
        f"books={len(books)} ppts={totals['ppts']} slides={totals['slides']} "
        f"notes={totals['notes']} chars={totals['chars']}"
    )
    for book in sorted(books):
        print(f"{book}: ppts={len(books[book])}")


if __name__ == "__main__":
    main()
