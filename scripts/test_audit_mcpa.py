import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_mcpa import audit


class McpaAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.program = self.root / "certifications" / "mcpa"
        (self.program / "tracks").mkdir(parents=True)
        paths = [f"certifications/mcpa/lessons/{number:02d}-lesson" for number in range(34)]
        objective = "协议版本与交互"
        track = {"domains": [{"id": "protocol", "name": "协议", "weight": 20, "objectives": [objective]}] + [{"id": f"domain-{n}", "name": str(n), "weight": 20, "objectives": [objective]} for n in range(4)], "lessons": [{"path": path, "domains": ["protocol"]} for path in paths], "assessments": []}
        self.track_file = self.program / "tracks" / "mcpa-f.json"
        self.program_file = self.program / "program.json"
        self.prerequisite_file = self.program / "prerequisites.json"
        self.assessment_dir = self.program / "assessments" / "mcpa-f"
        self.assessment_dir.mkdir(parents=True)
        for name, kind, size in (("diagnostic", "diagnostic", 30), ("mock-01", "mock", 60), ("mock-02", "mock", 60), ("mock-03", "mock", 60)):
            item = {"id": f"mcpa-f-{name}", "path": f"certifications/mcpa/assessments/mcpa-f/{name}.json", "kind": kind, "title": name, "timeLimitMinutes": 30 if kind == "diagnostic" else 90}
            track["assessments"].append(item)
            questions = [{"id": f"{name}-{n}", "domain": "protocol", "objective": objective, "type": "single", "prompt": "题目", "options": ["甲", "乙", "丙", "丁"], "correct": [0], "explanation": "答案说明", "references": [paths[0]]} for n in range(size)]
            (self.assessment_dir / f"{name}.json").write_text(json.dumps({**item, "track": "mcpa-f", "questions": questions}), encoding="utf-8")
        self.track_file.write_text(json.dumps(track), encoding="utf-8")
        self.program_file.write_text(json.dumps({"id": "mcpa-certification", "tracks": ["mcpa-f"], "prerequisitesPath": "certifications/mcpa/prerequisites.json"}), encoding="utf-8")
        self.prerequisite_file.write_text(json.dumps({"lessons": {path: paths[index - 1:index] for index, path in enumerate(paths)}}), encoding="utf-8")
        for path in paths:
            lesson = self.root / path
            (lesson / "docs").mkdir(parents=True)
            (lesson / "code" / "tests").mkdir(parents=True)
            (lesson / "outputs").mkdir()
            headings = "\n".join(f"## {name}" for name in ("学习目标", "交互实验", "实践实验", "交付产物", "验证", "综合项目关联"))
            (lesson / "docs" / "zh.md").write_text(f"# 课程\n{headings}\n```figure\nmcpa-figure\n```\n", encoding="utf-8")
            (lesson / "code" / "main.py").write_text("print('ok')\n", encoding="utf-8")
            (lesson / "code" / "tests" / "test_main.py").write_text("\n".join(f"def test_{n}(): pass" for n in range(5)), encoding="utf-8")
            (lesson / "outputs" / "output.md").write_text("# 产物\n", encoding="utf-8")
            questions = [{"stage": stage, "question": "题目", "options": ["甲", "乙", "丙", "丁"], "correct": 0, "explanation": "正确答案说明"} for stage in ("pre", "check", "check", "check", "post", "post")]
            (lesson / "quiz.json").write_text(json.dumps({"lesson": lesson.name, "questions": questions}), encoding="utf-8")
        self.lesson = self.root / paths[0]

    def test_complete_track(self):
        self.assertEqual(audit(self.root), [])

    def test_missing_quiz_fails(self):
        (self.lesson / "quiz.json").unlink()
        self.assertTrue(any("quiz.json" in issue for issue in audit(self.root)))

    def test_missing_document_or_required_heading_fails(self):
        document = self.lesson / "docs" / "zh.md"
        document.write_text("# 课程\n", encoding="utf-8")
        self.assertTrue(any("交互实验" in issue for issue in audit(self.root)))

    def test_missing_test_methods_fails(self):
        (self.lesson / "code" / "tests" / "test_main.py").unlink()
        self.assertTrue(any("不足五项" in issue for issue in audit(self.root)))

    def test_missing_declared_lesson_fails(self):
        (self.lesson / "docs" / "zh.md").unlink()
        self.assertTrue(any("缺少中文课程正文" in issue for issue in audit(self.root)))

    def test_extra_lesson_fails(self):
        (self.program / "lessons" / "34-unlisted").mkdir()
        self.assertTrue(any("未登记" in issue for issue in audit(self.root)))

    def test_unsupported_answer_cardinality_and_duplicate_ids_fail(self):
        path = self.assessment_dir / "diagnostic.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["questions"][0]["correct"] = [0, 1]
        data["questions"][1]["id"] = data["questions"][0]["id"]
        path.write_text(json.dumps(data), encoding="utf-8")
        issues = audit(self.root)
        self.assertTrue(any("答案类型" in issue for issue in issues))
        self.assertTrue(any("标识缺失或重复" in issue for issue in issues))

    def test_missing_program_and_invalid_domain_weight_fail(self):
        self.program_file.unlink()
        track = json.loads(self.track_file.read_text(encoding="utf-8"))
        track["domains"][0]["weight"] = 5
        self.track_file.write_text(json.dumps(track), encoding="utf-8")
        issues = audit(self.root)
        self.assertTrue(any("program.json" in issue for issue in issues))
        self.assertTrue(any("合计 100" in issue for issue in issues))

    def test_unknown_objective_and_bad_prerequisite_fail(self):
        path = self.assessment_dir / "mock-01.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["questions"][0]["objective"] = "not in track"
        path.write_text(json.dumps(data), encoding="utf-8")
        graph = json.loads(self.prerequisite_file.read_text(encoding="utf-8"))
        first, last = next(iter(graph["lessons"])), next(reversed(graph["lessons"]))
        graph["lessons"][first] = [last]
        self.prerequisite_file.write_text(json.dumps(graph), encoding="utf-8")
        issues = audit(self.root)
        self.assertTrue(any("目标" in issue for issue in issues))
        self.assertTrue(any("非先修课程" in issue for issue in issues))

    def test_assessment_title_drift_fails(self):
        path = self.assessment_dir / "mock-03.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["title"] = "另一个标题"
        path.write_text(json.dumps(data), encoding="utf-8")
        self.assertTrue(any("元数据" in issue for issue in audit(self.root)))


if __name__ == "__main__":
    unittest.main()
