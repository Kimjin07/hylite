#!/usr/bin/env python3
"""Run whole-book renderer checks against vocab-tool-v2.html."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path


FUNCTIONS = ("escapeHtml", "getSourceClass", "collectSearchableParts", "buildVocabCard")


def extract_function(source: str, name: str) -> str:
    match = re.search(r"function " + re.escape(name) + r"\([^)]*\)\s*\{", source)
    if not match:
        raise RuntimeError(f"function not found: {name}")
    index = match.end() - 1
    depth = 0
    while index < len(source):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[match.start() : index + 1]
        index += 1
    raise RuntimeError(f"unterminated function: {name}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, type=Path)
    parser.add_argument("--data", required=True, type=Path)
    args = parser.parse_args()

    html = args.html.read_text(encoding="utf-8-sig")
    script_blocks = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, re.DOTALL | re.IGNORECASE)
    source = "\n".join(script_blocks)
    functions = "\n".join(extract_function(source, name) for name in FUNCTIONS)

    data_path = json.dumps(str(args.data.resolve()))
    javascript = f'''const fs = require("fs");
{functions}
const entries = JSON.parse(fs.readFileSync({data_path}, "utf8"));
let failures = [];
for (const entry of entries) {{
  try {{
    const html = buildVocabCard(entry);
    if (!html || html.length < 200) failures.push(entry.word + ": short/empty card");
    if (html.includes("暂无例句")) failures.push(entry.word + ": renders no-example placeholder");
    if (Array.isArray(entry.classPractice) && entry.classPractice.length && !html.includes("课堂练习")) {{
      failures.push(entry.word + ": practice not rendered");
    }}
  }} catch (error) {{
    failures.push(entry.word + ": " + error.message);
  }}
}}
const fallback = {{
  word: "fallback-check", textbook: "test", unit: "test", pronunciation: "", partOfSpeech: "n.",
  translation: "test", source: "Reading", original_sentence: "The fallback sentence is visible.",
  readingExamples: [], posExamples: [], wordForms: {{}}, uncommonMeanings: [], idioms: [],
  collocations: [], synonyms: [], advancedExpressions: [], sentenceUpgrade: [], classPractice: []
}};
if (!buildVocabCard(fallback).includes("The fallback sentence is visible.")) {{
  failures.push("renderer: original_sentence fallback failed");
}}
const synonymProbe = {{ word: "probe", translation: "", partOfSpeech: "", synonyms: [{{synonym: "investigate"}}] }};
if (!collectSearchableParts(synonymProbe).includes("investigate")) {{
  failures.push("search: synonym field not indexed");
}}
if (failures.length) {{
  console.error(failures.join("\\n"));
  process.exit(1);
}}
console.log(`PASS ${{entries.length}} cards; fallback; synonym search`);
'''

    with tempfile.TemporaryDirectory(prefix="vocab3500-ui-smoke-") as temp_dir:
        temp_path = Path(temp_dir) / "smoke.js"
        temp_path.write_text(javascript, encoding="utf-8")
        result = subprocess.run(["node", str(temp_path)], capture_output=True, text=True, encoding="utf-8")
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip())
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
