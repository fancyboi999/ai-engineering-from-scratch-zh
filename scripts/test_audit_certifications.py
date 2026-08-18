#!/usr/bin/env python3
"""Regression tests for certification audit rules that use synthetic inputs."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from audit_certifications import (
    Audit,
    check_study_plans,
    path_has_symlink_component,
    resolve_assessment_source,
)


ROOT = Path(__file__).resolve().parent.parent
TRACKS_DIR = ROOT / "certifications" / "claude" / "tracks"


class StudyPlanAuditTests(unittest.TestCase):
    def findings_for(self, plans: list[dict]) -> list[str]:
        audit = Audit()
        check_study_plans(audit, Path("synthetic-track.json"), {"studyPlans": plans})
        return [finding.message for finding in audit.findings if finding.rule == "C074"]

    def test_current_tracks_cover_every_day_or_week(self) -> None:
        audit = Audit()
        for path in sorted(TRACKS_DIR.glob("*.json")):
            check_study_plans(audit, path, json.loads(path.read_text(encoding="utf-8")))
        self.assertEqual([], [finding for finding in audit.findings if finding.rule == "C074"])

    def test_day_plan_rejects_gaps_and_wrong_end(self) -> None:
        findings = self.findings_for([
            {
                "id": "gap-plan",
                "label": "14 天计划",
                "durationDays": 14,
                "hoursPerWeek": 7,
                "milestones": ["第 2–4 天：跳过开头", "第 6–9 天：留下缺口"],
            }
        ])
        self.assertTrue(any("contiguous" in message for message in findings))
        self.assertTrue(any("expected day 14" in message for message in findings))

    def test_week_plan_must_cover_declared_duration(self) -> None:
        findings = self.findings_for([
            {
                "id": "short-plan",
                "label": "28 天计划",
                "durationDays": 28,
                "hoursPerWeek": 6,
                "milestones": ["第 1 周：基础", "第 2 周：实践", "第 4 周：复习"],
            }
        ])
        self.assertTrue(any("do not cover 28 days" in message for message in findings))

    def test_plan_ids_and_hours_are_valid(self) -> None:
        findings = self.findings_for([
            {
                "id": "same-plan",
                "label": "7 天计划",
                "durationDays": 7,
                "hoursPerWeek": 0,
                "milestones": ["第 1 周：学习"],
            },
            {
                "id": "same-plan",
                "label": "7 天计划",
                "durationDays": 7,
                "hoursPerWeek": 169,
                "milestones": ["第 1 周：复习"],
            },
        ])
        self.assertTrue(any("duplicate study plan id" in message for message in findings))
        self.assertEqual(2, sum("hoursPerWeek" in message for message in findings))

    def test_symlink_component_is_rejected_before_resolving(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cert_root = root / "certifications" / "claude"
            assessment_dir = cert_root / "assessments" / "demo"
            assessment_dir.mkdir(parents=True)
            target = assessment_dir / "target.json"
            target.write_text("{}", encoding="utf-8")
            link = assessment_dir / "linked.json"
            link.symlink_to(target)
            self.assertFalse(path_has_symlink_component(target, root))
            self.assertTrue(path_has_symlink_component(link, root))
            audit = Audit()
            resolved = resolve_assessment_source(
                audit,
                link.relative_to(root).as_posix(),
                Path("synthetic-track.json"),
                "assessment[0]",
                root=root,
                cert_root=cert_root,
            )
            self.assertIsNone(resolved)
            self.assertTrue(any(finding.rule == "C001" for finding in audit.findings))


if __name__ == "__main__":
    unittest.main()
