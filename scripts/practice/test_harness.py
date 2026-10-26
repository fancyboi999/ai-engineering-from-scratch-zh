import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "practice" / "_harness"))

import practice_check

TESTS = '''
from practice_check import check, report, true


@check("examples", "train", "The loss is reported.")
def train(sub):
    sub.train()
    true(True, "")
'''


class HarnessTest(unittest.TestCase):
    def run_source(self, source):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "practice_tests.py"
            path.write_text(TESTS)
            return json.loads(practice_check.evaluate_json(source, str(path), "", "", 5))

    def test_a_diverging_loss_still_gives_a_report(self):
        report = self.run_source("from practice_check import report\n\n\ndef train():\n    report(0, 1.0)\n    report(1, float('nan'))\n    report(2, float('inf'))\n")
        self.assertEqual(report["curve"], [[0, 1.0, "loss"], [1, None, "loss"], [2, None, "loss"]])
        self.assertTrue(report["summary"]["ok"])

    def test_system_exit_in_learner_code_is_an_error(self):
        report = self.run_source("import sys\n\n\ndef train():\n    sys.exit(0)\n")
        self.assertEqual(report["results"][0]["status"], "error")
        self.assertFalse(report["summary"]["ok"])

    def test_failure_feedback_is_chinese(self):
        cases = [
            (lambda: practice_check.close(None, [1]), "输出没有值"),
            (lambda: practice_check.close("wrong", [1]), "输出的类型错误"),
            (lambda: practice_check.close([1, 2], [1]), "输出的形状错误"),
            (lambda: practice_check.close([float("nan")], [1]), "出现了 NaN 或无穷大"),
            (lambda: practice_check.close([2], [1]), "最大差值为 1"),
            (lambda: practice_check.equal(2, 1), "输出与期望值不相等"),
            (lambda: practice_check.shape(None, (1,)), "输出没有值"),
            (lambda: practice_check.shape([1, 2], (1,)), "输出的形状错误"),
            (lambda: practice_check.raises(ValueError, lambda: None), "代码却正常返回"),
            (lambda: practice_check.raises(ValueError, lambda: 1 / 0), "代码实际抛出 ZeroDivisionError"),
            (lambda: practice_check.fixtures("missing"), "夹具文件中没有名为"),
        ]
        for trigger, message in cases:
            with self.subTest(message=message):
                with self.assertRaises(practice_check.CheckFailed) as caught:
                    trigger()
                self.assertIn(message, caught.exception.message)

    def test_missing_exception_keeps_the_exception_type_and_translates_the_outcome(self):
        with self.assertRaises(practice_check.CheckFailed) as caught:
            practice_check.raises(ValueError, lambda: None)
        self.assertEqual(caught.exception.expected, "ValueError")
        self.assertEqual(caught.exception.actual, "未抛出异常")

    def test_array_description_and_user_trace_are_chinese(self):
        import numpy as np

        self.assertIn("数组形状 (2,)，数据类型 int", practice_check.describe(np.array([1, 2])))
        report = self.run_source("def train():\n    1 / 0\n")
        self.assertIn("ZeroDivisionError", report["results"][0]["message"])
        self.assertIn("（你的代码第 2 行）", report["results"][0]["message"])

    def test_a_support_module_does_not_leak_between_problems(self):
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            for folder, value in ((first, 1), (second, 2)):
                Path(folder, "support.py").write_text(f"VALUE = {value}\n")
                Path(folder, "practice_tests.py").write_text("from practice_check import check, equal\nfrom support import VALUE\n\n\n@check(\"examples\", \"value\", \"The value.\")\ndef value(sub):\n    equal(sub.VALUE, VALUE)\n")
            for folder, value in ((first, 1), (second, 2)):
                report = practice_check.evaluate(f"VALUE = {value}\n", str(Path(folder, "practice_tests.py")), {})
                self.assertTrue(report["summary"]["ok"], report)


if __name__ == "__main__":
    unittest.main()
