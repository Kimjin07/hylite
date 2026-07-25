#!/usr/bin/env python3
"""Validate vocab3500 entries against the pre-XB2 exemplar depth."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


CLASSROOM_TYPE = re.compile(r"语法|短语|同义|构词|句子结构|辨析|等值|改写|课文|翻译|发音|一词多义")
WRITING_TYPE = re.compile(r"读后续写|应用文|议论文|说明文|记叙文|写作")
SYNTAX_TERM = re.compile(r"作|定语|表语|宾补|主语|宾语|及物|不及物|前置|后置|句首|句中|后接|搭配|结构")
CJK = re.compile(r"[\u3400-\u9fff]")
WORD_FORM_KEYS = ("noun", "verb", "adjective", "adverb", "other")
GENERIC_PADDING = (
    "During the final stage of the carefully organized event",
    "As the group reviewed the same situation before making its decision",
    "while independent observers recorded the wider outcome for later review",
    "giving readers enough context to judge the action fairly and independently",
    "This happened during the same emergency, while rescue workers searched the building",
    "kept explicit in the final review",
    "the same observation",
    "the same judgement",
    "the same turning point",
    "the same condition subsequently",
    "the next example shows another use",
    "in a related situation",
    "in a different context",
)


def load(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def words(text: object) -> int:
    return len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", str(text)))


def normalized(text: object) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(text).lower()).strip()


def jaccard(left: object, right: object) -> float:
    a = set(normalized(left).split())
    b = set(normalized(right).split())
    return len(a & b) / len(a | b) if a and b else 0.0


def repeated_corpus_padding(entries: list[dict], width: int = 14, threshold: int = 4) -> list[str]:
    """Find long English spans reused across many independently written entries."""
    owners: dict[tuple[str, ...], set[str]] = {}
    for entry in entries:
        word = str(entry.get("word", "<missing>"))
        texts: list[str] = []
        texts.extend(
            str(item.get("sentence", ""))
            for item in entry.get("posExamples", [])
            if isinstance(item, dict)
        )
        for item in entry.get("sentenceUpgrade", []):
            if isinstance(item, dict):
                texts.extend(str(item.get(key, "")) for key in ("original", "upgraded"))
        seen: set[tuple[str, ...]] = set()
        for value in texts:
            tokens = re.findall(r"[a-z]+(?:'[a-z]+)?", value.lower())
            seen.update(tuple(tokens[index:index + width]) for index in range(len(tokens) - width + 1))
        for ngram in seen:
            owners.setdefault(ngram, set()).add(word)

    repeated = [(ngram, words_) for ngram, words_ in owners.items() if len(words_) >= threshold]
    repeated.sort(key=lambda item: (-len(item[1]), item[0]))
    return [
        f"cross-entry template reused by {len(words_)} words: {' '.join(ngram)}"
        for ngram, words_ in repeated[:10]
    ]


def validate_entry(entry: dict) -> list[str]:
    word = entry.get("word", "<missing>")
    issues: list[str] = []
    collocations = entry.get("collocations", []) if isinstance(entry.get("collocations"), list) else []
    synonyms = entry.get("synonyms", []) if isinstance(entry.get("synonyms"), list) else []
    advanced = entry.get("advancedExpressions", []) if isinstance(entry.get("advancedExpressions"), list) else []
    practices = entry.get("classPractice", []) if isinstance(entry.get("classPractice"), list) else []
    pos_examples = entry.get("posExamples", []) if isinstance(entry.get("posExamples"), list) else []
    upgrades = entry.get("sentenceUpgrade", []) if isinstance(entry.get("sentenceUpgrade"), list) else []

    serialized = json.dumps(entry, ensure_ascii=False)
    padding_hits = [phrase for phrase in GENERIC_PADDING if phrase in serialized]
    if padding_hits:
        issues.append(f"generic padding/template language detected: {padding_hits[0]}")

    if len(collocations) < 10:
        issues.append(f"collocations {len(collocations)} < 10")
    if len(collocations) > 12:
        issues.append(f"collocations {len(collocations)} > 12; curate instead of accumulating")
    informative_examples = sum(
        1 for item in collocations
        if isinstance(item, dict) and (CJK.search(str(item.get("example", ""))) or "（" in str(item.get("example", "")))
    )
    if collocations and informative_examples / len(collocations) < 0.8:
        issues.append(f"collocation examples with Chinese/register {informative_examples}/{len(collocations)} < 80%")
    for left_index, left in enumerate(collocations):
        if not isinstance(left, dict):
            continue
        for right_index in range(left_index + 1, len(collocations)):
            right = collocations[right_index]
            if not isinstance(right, dict):
                continue
            if jaccard(left.get("phrase"), right.get("phrase")) >= 0.8 and jaccard(left.get("example"), right.get("example")) >= 0.55:
                issues.append(f"near-duplicate collocations {left_index + 1}/{right_index + 1}")
                break
        else:
            continue
        break

    if len(synonyms) < 3:
        issues.append(f"synonyms/confusables {len(synonyms)} < 3")
    syntax_usages = sum(
        1 for item in synonyms
        if isinstance(item, dict) and SYNTAX_TERM.search(str(item.get("usage", "")))
    )
    if len(synonyms) >= 3 and syntax_usages < 2:
        issues.append(f"synonym usages with syntax/collocation detail {syntax_usages} < 2")

    if len(advanced) < 5:
        issues.append(f"advancedExpressions {len(advanced)} < 5")
    types = {str(item.get("type", "")).strip() for item in advanced if isinstance(item, dict)}
    if len(types) < 5:
        issues.append(f"distinct advanced card types {len(types)} < 5")
    for left_index, left in enumerate(advanced):
        if not isinstance(left, dict):
            continue
        for right_index in range(left_index + 1, len(advanced)):
            right = advanced[right_index]
            if not isinstance(right, dict):
                continue
            if jaccard(left.get("expression"), right.get("expression")) >= 0.62:
                issues.append(f"near-duplicate advanced cards {left_index + 1}/{right_index + 1}")
                break
        else:
            continue
        break
    classroom_cards = sum(1 for item in advanced if isinstance(item, dict) and CLASSROOM_TYPE.search(str(item.get("type", ""))))
    writing_cards = sum(1 for item in advanced if isinstance(item, dict) and WRITING_TYPE.search(str(item.get("type", ""))))
    if classroom_cards < 2:
        issues.append(f"classroom-layer advanced cards {classroom_cards} < 2")
    if writing_cards < 1:
        issues.append("no writing-layer advanced card")

    if len(practices) < 4:
        issues.append(f"classPractice {len(practices)} < 4")
    practice_types = {str(item.get("type", "")).replace("（课件）", "") for item in practices if isinstance(item, dict)}
    if len(practice_types) < 3:
        issues.append(f"practice type diversity {len(practice_types)} < 3")

    long_pos = sum(1 for item in pos_examples if isinstance(item, dict) and words(item.get("sentence")) >= 16)
    if long_pos < 3:
        issues.append(f"independent long POS examples {long_pos} < 3")
    anchors = [entry.get("original_sentence", "")]
    anchors.extend(item.get("example", "") for item in collocations if isinstance(item, dict))
    for index, item in enumerate(pos_examples):
        if not isinstance(item, dict):
            continue
        if any(jaccard(item.get("sentence"), anchor) >= 0.65 for anchor in anchors if anchor):
            issues.append(f"POS example {index + 1} too close to original/collocation")
            break

    long_upgrades = sum(1 for item in upgrades if isinstance(item, dict) and words(item.get("upgraded")) >= 22)
    if long_upgrades < 2:
        issues.append(f"long sentence upgrades {long_upgrades} < 2")
    for index, item in enumerate(upgrades):
        if not isinstance(item, dict):
            continue
        if words(item.get("original")) < 4 or not str(item.get("techniques", "")).strip():
            issues.append(f"upgrade {index + 1} lacks a real base sentence/technique")
            break

    forms = entry.get("wordForms")
    if not isinstance(forms, dict) or any(key not in forms for key in WORD_FORM_KEYS):
        issues.append("wordForms lacks fixed five-key schema")
    elif sum(bool(str(forms.get(key, "")).strip()) and forms.get(key) is not None for key in WORD_FORM_KEYS) < 3:
        issues.append("wordForms has fewer than 3 informative keys")

    rich_chars = len(json.dumps({
        key: entry.get(key)
        for key in (
            "uncommonMeanings", "wordForms", "idioms", "collocations", "synonyms",
            "advancedExpressions", "sentenceUpgrade", "classPractice"
        )
    }, ensure_ascii=False))
    if rich_chars < 5500:
        issues.append(f"overall enrichment text {rich_chars} chars < 5500")

    return [f"{word}: {issue}" for issue in issues]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--summary-only", action="store_true")
    args = parser.parse_args()
    files: list[Path] = []
    for path in args.paths:
        files.extend(sorted(path.glob("*_data.json")) if path.is_dir() else [path])
    total_issues: list[str] = []
    for path in files:
        entries = load(path)
        issues = [issue for entry in entries for issue in validate_entry(entry)]
        issues.extend(repeated_corpus_padding(entries))
        total_issues.extend(f"{path.name}/{issue}" for issue in issues)
        print(f"{path.name}: {len(entries)} entries, {len(issues)} depth issues")
    if total_issues:
        if not args.summary_only:
            print("\nISSUES:")
            print("\n".join(total_issues))
    else:
        print("\nPASS")
    return 1 if total_issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
