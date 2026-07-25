#!/usr/bin/env python3
"""Validate vocab3500 enrichment quality and immutable source fields."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from collections import Counter
from pathlib import Path


IMMUTABLE = (
    "word",
    "textbook",
    "unit",
    "pronunciation",
    "partOfSpeech",
    "translation",
    "source",
    "section",
    "sub_section",
    "original_sentence",
    "readingExamples",
)
WORD_FORM_KEYS = ("noun", "verb", "adjective", "adverb", "other")
ARRAY_MINIMUMS = {
    "posExamples": 3,
    "collocations": 8,
    "synonyms": 2,
    "advancedExpressions": 3,
    "sentenceUpgrade": 2,
    "classPractice": 2,
}


def load_entries(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("root must be a JSON array")
    return data


def normalized_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    value = re.sub(r"（[^）]*）|\([^)]*\)", "", value)
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def example_texts(entry: dict) -> dict[str, list[str]]:
    values: dict[str, list[str]] = {
        "original_sentence": [entry.get("original_sentence", "")],
        "readingExamples": entry.get("readingExamples", []),
        "posExamples": [item.get("sentence", "") for item in entry.get("posExamples", []) if isinstance(item, dict)],
        "collocations": [item.get("example", "") for item in entry.get("collocations", []) if isinstance(item, dict)],
        "synonyms": [item.get("example", "") for item in entry.get("synonyms", []) if isinstance(item, dict)],
        "advancedExpressions": [item.get("example", "") for item in entry.get("advancedExpressions", []) if isinstance(item, dict)],
    }
    return {key: [normalized_text(value) for value in items if normalized_text(value)] for key, items in values.items()}


def token_jaccard(left: str, right: str) -> float:
    left_tokens = set(normalized_text(left).split())
    right_tokens = set(normalized_text(right).split())
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def validate_entry(entry: dict) -> list[str]:
    word = entry.get("word") or "<missing word>"
    issues: list[str] = []

    definition = entry.get("definitionEn")
    if not isinstance(definition, str) or not definition.strip():
        issues.append(f"{word}: empty definitionEn")

    for field, minimum in ARRAY_MINIMUMS.items():
        value = entry.get(field)
        if not isinstance(value, list):
            issues.append(f"{word}: {field} must be an array (got {type(value).__name__})")
        elif len(value) < minimum:
            issues.append(f"{word}: {field} has {len(value)}, needs >= {minimum}")

    forms = entry.get("wordForms")
    if not isinstance(forms, dict):
        issues.append(f"{word}: wordForms must be an object")
    else:
        missing = [key for key in WORD_FORM_KEYS if key not in forms]
        if missing:
            issues.append(f"{word}: wordForms missing keys {', '.join(missing)}")

    for item in entry.get("posExamples", []) if isinstance(entry.get("posExamples"), list) else []:
        if not isinstance(item, dict) or not str(item.get("partOfSpeech", "")).strip() or not str(item.get("sentence", "")).strip():
            issues.append(f"{word}: malformed posExamples item")
            break

    for item in entry.get("synonyms", []) if isinstance(entry.get("synonyms"), list) else []:
        if not isinstance(item, dict) or not str(item.get("synonym", "")).strip() or not str(item.get("usage", "")).strip():
            issues.append(f"{word}: synonym item lacks synonym/usage")
            break

    for item in entry.get("sentenceUpgrade", []) if isinstance(entry.get("sentenceUpgrade"), list) else []:
        if not isinstance(item, dict):
            issues.append(f"{word}: malformed sentenceUpgrade item")
            break
        original = normalized_text(item.get("original", ""))
        upgraded = normalized_text(item.get("upgraded", ""))
        if not original or not upgraded or not str(item.get("techniques", "")).strip():
            issues.append(f"{word}: sentenceUpgrade lacks original/upgraded/techniques")
            break
        original_tokens = set(original.split())
        upgraded_tokens = set(upgraded.split())
        token_overlap = len(original_tokens & upgraded_tokens) / max(1, min(len(original_tokens), len(upgraded_tokens)))
        sequence_ratio = difflib.SequenceMatcher(None, original, upgraded).ratio()
        if token_overlap < 0.2 and sequence_ratio < 0.3:
            issues.append(f"{word}: sentenceUpgrade may change the underlying scenario")
            break

    for item in entry.get("classPractice", []) if isinstance(entry.get("classPractice"), list) else []:
        if not isinstance(item, dict):
            issues.append(f"{word}: malformed classPractice item")
            break
        question = str(item.get("question", ""))
        if not question or not str(item.get("answer", "")).strip():
            issues.append(f"{word}: classPractice lacks question/answer")
            break
        if any(len(run) != 4 for run in re.findall(r"_{2,}", question)):
            issues.append(f"{word}: classPractice blank must use exactly ____")
            break

    examples = example_texts(entry)
    pos_counter = Counter(examples["posExamples"])
    if any(count > 1 for count in pos_counter.values()):
        issues.append(f"{word}: duplicate sentences inside posExamples")
    anchors = set(examples["original_sentence"] + examples["readingExamples"] + examples["collocations"])
    overlaps = sorted(set(examples["posExamples"]) & anchors)
    if overlaps:
        issues.append(f"{word}: posExamples repeats original/reading/collocation example")

    collocations = entry.get("collocations", []) if isinstance(entry.get("collocations"), list) else []
    for left_index, left in enumerate(collocations):
        if not isinstance(left, dict):
            continue
        for right_index in range(left_index + 1, len(collocations)):
            right = collocations[right_index]
            if not isinstance(right, dict):
                continue
            phrase_similarity = token_jaccard(str(left.get("phrase", "")), str(right.get("phrase", "")))
            example_similarity = token_jaccard(str(left.get("example", "")), str(right.get("example", "")))
            if phrase_similarity >= 0.75 and example_similarity >= 0.5:
                issues.append(
                    f"{word}: near-duplicate collocations at indexes {left_index + 1}/{right_index + 1}"
                )
                break
        else:
            continue
        break

    return issues


def compare_immutable(current: list[dict], baseline: list[dict], label: str) -> list[str]:
    issues: list[str] = []
    current_words = [entry.get("word") for entry in current]
    baseline_words = [entry.get("word") for entry in baseline]
    if current_words != baseline_words:
        issues.append(f"{label}: word order/list differs from baseline")
        return issues
    for now, before in zip(current, baseline):
        word = now.get("word", "<missing word>")
        for field in IMMUTABLE:
            if now.get(field) != before.get(field):
                issues.append(f"{label}/{word}: immutable field changed: {field}")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path, help="JSON files or directories")
    parser.add_argument("--baseline-dir", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    files: list[Path] = []
    for path in args.paths:
        files.extend(sorted(path.glob("*_data.json")) if path.is_dir() else [path])

    all_issues: list[str] = []
    summaries: list[str] = []
    for path in files:
        try:
            entries = load_entries(path)
        except Exception as exc:
            all_issues.append(f"{path}: invalid JSON: {exc}")
            continue
        issues = [issue for entry in entries for issue in validate_entry(entry)]
        if args.baseline_dir:
            baseline_path = args.baseline_dir / path.name
            if baseline_path.exists():
                try:
                    issues.extend(compare_immutable(entries, load_entries(baseline_path), path.name))
                except Exception as exc:
                    issues.append(f"{path.name}: cannot compare baseline: {exc}")
            else:
                issues.append(f"{path.name}: baseline file not found")
        all_issues.extend(f"{path.name}/{issue}" for issue in issues)
        summaries.append(f"{path.name}: {len(entries)} entries, {len(issues)} issues")

    output = "\n".join(summaries + (["", "ISSUES:"] + all_issues if all_issues else ["", "PASS"])) + "\n"
    if args.report:
        args.report.write_text(output, encoding="utf-8")
    sys.stdout.write(output)
    return 1 if all_issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
