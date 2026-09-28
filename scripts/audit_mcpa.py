#!/usr/bin/env python3
"""Audit the Chinese MCPA source tree against its declared track and assessments."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROGRAM = ROOT / "certifications" / "mcpa"
TRACK = PROGRAM / "tracks" / "mcpa-f.json"
REQUIRED_HEADINGS = (
    "学习目标", "交互实验", "实践实验", "交付产物", "验证", "综合项目关联",
)
STAGES = ("pre", "check", "check", "check", "post", "post")


def audit(root: Path = ROOT) -> list[str]:
    program = root / "certifications" / "mcpa"
    track_file = program / "tracks" / "mcpa-f.json"
    problems: list[str] = []
    if not track_file.is_file():
        return [f"{track_file}: 缺少认证路线"]
    try:
        track = json.loads(track_file.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return [f"{track_file}: {exc}"]
    program_file = program / "program.json"
    try:
        metadata = json.loads(program_file.read_text(encoding="utf-8"))
        if metadata.get("id") != "mcpa-certification" or metadata.get("tracks") != ["mcpa-f"] or metadata.get("prerequisitesPath") != "certifications/mcpa/prerequisites.json":
            problems.append(f"{program_file}: 项目标识、路线或前置要求路径不符")
    except (OSError, ValueError, AttributeError) as exc:
        problems.append(f"{program_file}: {exc}")
    domains = track.get("domains", [])
    if not isinstance(domains, list):
        domains = []
    domain_ids = [item.get("id") for item in domains if isinstance(item, dict)]
    if len(domain_ids) != 5 or len(set(domain_ids)) != 5 or any(not isinstance(item, dict) or not isinstance(item.get("weight"), int) or isinstance(item.get("weight"), bool) or item["weight"] <= 0 for item in domains) or sum(item["weight"] for item in domains if isinstance(item, dict) and isinstance(item.get("weight"), int)) != 100:
        problems.append(f"{track_file}: 知识域必须唯一、权重为正整数且合计 100")
    objectives = {item.get("id"): set(item.get("objectives", [])) for item in domains if isinstance(item, dict) and isinstance(item.get("objectives"), list)}
    lessons = track.get("lessons")
    if not isinstance(lessons, list) or len(lessons) != 34:
        return [f"{track_file}: 路线必须声明 34 节课"]
    paths = [item.get("path") for item in lessons if isinstance(item, dict)]
    if len(paths) != 34 or len(set(paths)) != 34:
        problems.append(f"{track_file}: 课程路径缺失或重复")
    declared = set(paths)
    for item in lessons:
        if not isinstance(item, dict) or not isinstance(item.get("domains"), list) or not item["domains"] or any(domain not in domain_ids for domain in item["domains"]):
            problems.append(f"{track_file}: 课程引用了未声明的知识域")
    prerequisite_file = program / "prerequisites.json"
    try:
        graph = json.loads(prerequisite_file.read_text(encoding="utf-8"))["lessons"]
        if not isinstance(graph, dict) or set(graph) != declared:
            problems.append(f"{prerequisite_file}: 前置要求必须覆盖全部路线课程")
        else:
            order = {path: index for index, path in enumerate(paths)}
            for path, prerequisites in graph.items():
                if not isinstance(prerequisites, list) or len(prerequisites) != len(set(prerequisites)) or any(prerequisite not in order or order[prerequisite] >= order[path] for prerequisite in prerequisites):
                    problems.append(f"{prerequisite_file}: {path} 引用了不存在或非先修课程")
    except (OSError, ValueError, KeyError, TypeError) as exc:
        problems.append(f"{prerequisite_file}: {exc}")
    for path in paths:
        if not isinstance(path, str) or not re.fullmatch(r"certifications/mcpa/lessons/\d\d-[a-z0-9-]+", path):
            problems.append(f"{track_file}: 课程路径无效 {path!r}")
            continue
        lesson = root / path
        document = lesson / "docs" / "zh.md"
        if not document.is_file() or document.is_symlink():
            problems.append(f"{document}: 缺少中文课程正文")
            continue
        if (lesson / "docs" / "en.md").exists():
            problems.append(f"{lesson}: 不应保留 en.md")
        text = document.read_text(encoding="utf-8")
        for heading in REQUIRED_HEADINGS:
            if not re.search(rf"^## {re.escape(heading)}\s*$", text, re.MULTILINE):
                problems.append(f"{document}: 缺少 ## {heading}")
        if not re.search(r"```figure\s*\n\s*mcpa-[a-z0-9-]+", text):
            problems.append(f"{document}: 缺少 MCPA figure")
        if not list((lesson / "outputs").glob("*")):
            problems.append(f"{lesson}: 缺少课程产物")
        main = lesson / "code" / "main.py"
        if not main.is_file():
            problems.append(f"{main}: 缺少可运行实验")
        tests = list((lesson / "code" / "tests").glob("test_*.py"))
        count = sum(len(re.findall(r"^\s*def test_[a-zA-Z0-9_]+\s*\(", p.read_text(encoding="utf-8"), re.MULTILINE)) for p in tests)
        if count < 5:
            problems.append(f"{lesson}: 实验测试不足五项（{count}）")
        quiz_file = lesson / "quiz.json"
        try:
            quiz = json.loads(quiz_file.read_text(encoding="utf-8"))
            questions = quiz.get("questions", [])
            if quiz.get("lesson") != lesson.name or tuple(q.get("stage") for q in questions) != STAGES:
                problems.append(f"{quiz_file}: 课程标识或六题阶段顺序不符")
            for q in questions:
                options = q.get("options")
                correct = q.get("correct")
                if not isinstance(options, list) or len(options) != 4 or not isinstance(correct, int) or isinstance(correct, bool) or not 0 <= correct < 4 or not all(isinstance(q.get(k), str) and q[k].strip() for k in ("question", "explanation")):
                    problems.append(f"{quiz_file}: 题目或答案结构无效")
                    break
        except (OSError, ValueError, AttributeError, TypeError) as exc:
            problems.append(f"{quiz_file}: {exc}")
    actual = {p.relative_to(root).as_posix() for p in (program / "lessons").glob("[0-9][0-9]-*") if p.is_dir()}
    if actual != declared:
        problems.append(f"{track_file}: 路线与课程目录不一致，未登记 {sorted(actual - declared)}")
    assessments = track.get("assessments", [])
    if not isinstance(assessments, list) or len(assessments) != 4 or len({item.get("id") for item in assessments if isinstance(item, dict)}) != 4:
        problems.append(f"{track_file}: 认证评估必须包含唯一诊断和三套模拟题")
        assessments = assessments if isinstance(assessments, list) else []
    for item in assessments:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str):
            problems.append(f"{track_file}: 认证评估声明无效")
            continue
        assessment_file = root / item["path"]
        try:
            assessment = json.loads(assessment_file.read_text(encoding="utf-8"))
            questions = assessment["questions"]
            expected = 30 if item["kind"] == "diagnostic" else 60
            if assessment.get("id") != item["id"] or assessment.get("track") != "mcpa-f" or assessment.get("kind") != item["kind"] or assessment.get("title") != item["title"] or assessment.get("timeLimitMinutes") != item["timeLimitMinutes"] or len(questions) != expected:
                problems.append(f"{assessment_file}: 标识、元数据或题数不符（应为 {expected} 题）")
            question_ids: set[str] = set()
            for q in questions:
                options, correct = q["options"], q["correct"]
                qid = q.get("id")
                if not isinstance(qid, str) or not qid or qid in question_ids:
                    problems.append(f"{assessment_file}: 题目标识缺失或重复")
                question_ids.add(qid)
                if q.get("domain") not in domain_ids or q.get("objective") not in objectives.get(q.get("domain"), set()):
                    problems.append(f"{assessment_file}: {qid} 引用了未声明的知识域或目标")
                if any(not isinstance(q.get(key), str) or not q[key].strip() for key in ("prompt", "explanation")) or not isinstance(options, list) or len(options) != 4 or not all(isinstance(value, str) and value.strip() for value in options):
                    problems.append(f"{assessment_file}: {qid} 题干、选项或解析缺失")
                kind = q.get("type")
                if kind not in {"single", "multiple"} or not isinstance(correct, list) or len(correct) != len(set(correct)) or (kind == "single" and len(correct) != 1) or (kind == "multiple" and len(correct) < 2) or any(not isinstance(index, int) or isinstance(index, bool) or index < 0 or index >= len(options) for index in correct):
                    problems.append(f"{assessment_file}: {qid} 答案类型、数量或索引无效")
                if any(ref.startswith("certifications/mcpa/lessons/") and ref not in declared for ref in q.get("references", []) if isinstance(ref, str)):
                    problems.append(f"{assessment_file}: {qid} 引用了未登记的课程")
        except (OSError, ValueError, KeyError, TypeError) as exc:
            problems.append(f"{assessment_file}: {exc}")
    return problems


if __name__ == "__main__":
    issues = audit()
    for issue in issues:
        print(issue, file=sys.stderr)
    print(f"MCPA source audit: {len(issues)} issue(s)")
    raise SystemExit(bool(issues))
