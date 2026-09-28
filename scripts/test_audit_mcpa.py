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
        track = {"lessons": [{"path": path} for path in paths], "assessments": []}
        (self.program / "tracks" / "mcpa-f.json").write_text(json.dumps(track), encoding="utf-8")
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


if __name__ == "__main__":
    unittest.main()
