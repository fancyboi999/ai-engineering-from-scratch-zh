#!/usr/bin/env python3
"""Verify a quiz de-bias rewrite against a Git revision.

Only a question's option order and the matching `correct` index may change. The
correct option value, all other question fields, and all top-level metadata must
remain byte-for-byte equivalent after JSON parsing. Positional-anchor questions
must remain completely unchanged.

Usage:
    python3 scripts/audit_quiz_debias.py --base HEAD
"""
from __future__ import annotations

import argparse
import collections
import copy
import json
import subprocess
import sys
from pathlib import Path

from debias_quizzes import debias_question, has_positional_anchor, iter_questions

ROOT = Path(__file__).resolve().parent.parent


class AuditFailure(Exception):
    pass


def quiz_paths_in_worktree() -> set[str]:
    return {
        path.relative_to(ROOT).as_posix()
        for path in ROOT.glob("phases/*/*/quiz.json")
        if path.is_file()
    }


def quiz_paths_in_revision(revision: str) -> set[str]:
    result = subprocess.run(
        ["git", "ls-tree", "-r", "--name-only", revision, "--", "phases"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return {path for path in result.stdout.splitlines() if path.endswith("/quiz.json")}


def load_worktree_json(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def load_revision_json(revision: str, path: str):
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def options_counter(options: list[object]) -> collections.Counter[str]:
    return collections.Counter(
        json.dumps(option, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        for option in options
    )


def answer_value(question: dict, path: str, index: int):
    options = question.get("options")
    correct = question.get("correct")
    if not isinstance(options, list) or not isinstance(correct, int):
        raise AuditFailure(f"{path}: question[{index}] has invalid options/correct fields")
    if not 0 <= correct < len(options):
        raise AuditFailure(f"{path}: question[{index}] correct index is out of range")
    return options[correct]


def compare_quiz(path: str, before, after) -> tuple[int, int]:
    if type(before) is not type(after):
        raise AuditFailure(f"{path}: top-level JSON type changed")
    if isinstance(before, dict):
        before_meta = {key: value for key, value in before.items() if key != "questions"}
        after_meta = {key: value for key, value in after.items() if key != "questions"}
        if before_meta != after_meta:
            raise AuditFailure(f"{path}: top-level metadata changed")

    before_questions = iter_questions(before)
    after_questions = iter_questions(after)
    if len(before_questions) != len(after_questions):
        raise AuditFailure(f"{path}: question count changed")

    changed = 0
    anchors = 0
    for index, (before_q, after_q) in enumerate(zip(before_questions, after_questions)):
        if not isinstance(before_q, dict) or not isinstance(after_q, dict):
            raise AuditFailure(f"{path}: question[{index}] changed object structure")

        before_fields = {key: value for key, value in before_q.items() if key not in {"options", "correct"}}
        after_fields = {key: value for key, value in after_q.items() if key not in {"options", "correct"}}
        if before_fields != after_fields:
            raise AuditFailure(f"{path}: question[{index}] changed outside options/correct")

        before_answer = answer_value(before_q, path, index)
        after_answer = answer_value(after_q, path, index)
        if before_answer != after_answer:
            raise AuditFailure(f"{path}: question[{index}] correct option value changed")

        before_options = before_q["options"]
        after_options = after_q["options"]
        if options_counter(before_options) != options_counter(after_options):
            raise AuditFailure(f"{path}: question[{index}] option set changed")

        if has_positional_anchor(before_options):
            anchors += 1
            if before_options != after_options or before_q["correct"] != after_q["correct"]:
                raise AuditFailure(f"{path}: question[{index}] positional anchor was reordered")

        expected = copy.deepcopy(after_q)
        if debias_question(path, expected):
            raise AuditFailure(f"{path}: question[{index}] is not idempotently de-biased")

        if before_options != after_options or before_q["correct"] != after_q["correct"]:
            changed += 1
    return changed, anchors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--base", default="HEAD", help="Git revision before the rewrite")
    args = parser.parse_args(argv)

    before_paths = quiz_paths_in_revision(args.base)
    after_paths = quiz_paths_in_worktree()
    if before_paths != after_paths:
        only_before = sorted(before_paths - after_paths)
        only_after = sorted(after_paths - before_paths)
        print(f"FAIL: quiz path set changed (only base={only_before}, only worktree={only_after})")
        return 1

    changed_files = 0
    changed_questions = 0
    anchored_questions = 0
    positions: collections.Counter[int] = collections.Counter()
    failures: list[str] = []
    for path in sorted(after_paths):
        try:
            before = load_revision_json(args.base, path)
            after = load_worktree_json(path)
            changed, anchors = compare_quiz(path, before, after)
        except (AuditFailure, json.JSONDecodeError, subprocess.CalledProcessError) as exc:
            failures.append(str(exc))
            continue
        if changed:
            changed_files += 1
            changed_questions += changed
        anchored_questions += anchors
        for question in iter_questions(after):
            if isinstance(question, dict) and isinstance(question.get("correct"), int):
                positions[question["correct"]] += 1

    if failures:
        print(f"FAIL: {len(failures)} audit violation(s)")
        for failure in failures[:20]:
            print(f"  {failure}")
        if len(failures) > 20:
            print(f"  ... {len(failures) - 20} more")
        return 1

    print(
        "OK: "
        f"{len(after_paths)} quiz files, {changed_files} files changed, "
        f"{changed_questions} questions reordered, {anchored_questions} positional anchors preserved"
    )
    print("correct-position distribution:")
    total = sum(positions.values())
    for position in sorted(positions):
        print(f"  {chr(65 + position)}: {positions[position]:4d}  {100 * positions[position] / total:5.1f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
