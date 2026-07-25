import importlib.util
import json
from pathlib import Path


AUDIT_DIR = Path(r"C:\Users\27894\Desktop\HY\work\vocab3500-quality-audit")
PPT_TEXT = AUDIT_DIR / "ppt-text-current" / "选择性必修二_ppt_all.txt"
DATA = Path(r"C:\Users\27894\Desktop\HY\deploy\vocab3500\xb2_u3_data.json")
OUTPUT = Path(r"C:\Users\27894\Desktop\HY\work\vocab3500-deep-rework\xb2\xb2_u3_ppt_word_index.json")


def load_index_module():
    path = AUDIT_DIR / "build_ppt_word_index.py"
    spec = importlib.util.spec_from_file_location("ppt_index", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main():
    helper = load_index_module()
    sections = [
        section
        for section in helper.parse_ppt_dump(PPT_TEXT)
        if "/U3/" in str(section["file"])
    ]
    words = [entry["word"] for entry in json.loads(DATA.read_text(encoding="utf-8-sig"))]
    index = {}
    for word in words:
        pattern = helper.word_pattern(word)
        matches = []
        for section in sections:
            match = pattern.search(str(section["text"]).replace("’", "'"))
            if match:
                matches.append({
                    "file": section["file"],
                    "kind": section["kind"],
                    "number": section["number"],
                    "context": helper.snippet(str(section["text"]), match, radius=420),
                })
        index[word] = matches
    OUTPUT.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    matched = sum(bool(matches) for matches in index.values())
    notes = sum(any(match["kind"] == "notes" for match in matches) for matches in index.values())
    print(json.dumps({
        "sections": len(sections),
        "words": len(words),
        "matched_words": matched,
        "note_matched_words": notes,
        "output": str(OUTPUT),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
