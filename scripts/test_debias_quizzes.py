"""Regression tests for deterministic quiz option de-biasing."""
from __future__ import annotations

import copy
import unittest

from debias_quizzes import debias_question, has_positional_anchor


class PositionalAnchorTests(unittest.TestCase):
    def test_english_and_chinese_positional_anchors_are_preserved(self):
        cases = (
            ["All of the above", "One", "Two", "Three"],
            ["以上全部；后门在每一种方法中都存活了下来", "One", "Two", "Three"],
            ["B 和 C 都正确", "One", "Two", "Three"],
            ["以下说法都不正确", "One", "Two", "Three"],
            ["两者都不成立", "One", "Two", "Three"],
        )

        for options in cases:
            with self.subTest(options=options[0]):
                self.assertTrue(has_positional_anchor(options))
                question = {"question": "anchor", "options": options, "correct": 0}
                original = copy.deepcopy(question)
                self.assertFalse(debias_question("phases/00/example/quiz.json", question))
                self.assertEqual(question, original)

    def test_non_positional_question_is_deterministic_and_idempotent(self):
        question = {
            "question": "Which option is correct?",
            "options": ["distractor C", "correct answer", "distractor A", "distractor B"],
            "correct": 1,
        }
        expected_answer = question["options"][question["correct"]]

        self.assertTrue(debias_question("phases/00/example/quiz.json", question))
        self.assertEqual(question["options"][question["correct"]], expected_answer)
        once = copy.deepcopy(question)
        self.assertFalse(debias_question("phases/00/example/quiz.json", question))
        self.assertEqual(question, once)

    def test_technical_terms_are_not_positional_anchors(self):
        self.assertFalse(
            has_positional_anchor(
                [
                    "An instruction-following model",
                    "A model trained with RLHF",
                    "A base language model",
                    "A model with a larger context window",
                ]
            )
        )


if __name__ == "__main__":
    unittest.main()
