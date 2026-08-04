"""Regression tests for the statistics lesson's special-function calculations."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).with_name("statistics.py")
SPEC = importlib.util.spec_from_file_location("lesson_statistics", MODULE_PATH)
assert SPEC and SPEC.loader
statistics = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(statistics)


class SpecialFunctionRegressionTests(unittest.TestCase):
    def test_large_df_t_test_regression(self):
        p_value = statistics.p_value_two_sided(1.855, 19992)

        self.assertAlmostEqual(p_value, 0.06361093769844328, delta=1e-12)
        self.assertGreater(p_value, 0.05)
        self.assertGreater(p_value, 1e-6)

    def test_chi_squared_pole_regression(self):
        result = statistics.chi_squared_test([120, 80], [100, 100])

        self.assertEqual(result["chi2"], 8.0)
        self.assertEqual(result["df"], 1)
        self.assertAlmostEqual(result["p_value"], 0.004677734981047276, delta=1e-12)

    def test_chi_squared_large_df_does_not_overflow(self):
        p_value = statistics.chi_squared_p_value(450, 400)

        self.assertAlmostEqual(p_value, 0.04249935069791977, delta=1e-12)
        self.assertGreater(p_value, 0.0)
        self.assertLess(p_value, 1.0)

    def test_extreme_t_tail_does_not_cancel_to_zero(self):
        p_value = statistics.p_value_two_sided(1e16, 1)

        self.assertAlmostEqual(p_value, 6.366197723675814e-17, delta=1e-30)
        self.assertGreater(p_value, 0.0)

        overflow_scale_p_value = statistics.p_value_two_sided(1e200, 1)
        self.assertAlmostEqual(
            overflow_scale_p_value,
            6.366197723675814e-201,
            delta=1e-212,
        )
        self.assertGreater(overflow_scale_p_value, 0.0)

    def test_extreme_chi_squared_tail_does_not_cancel_to_zero(self):
        p_value = statistics.chi_squared_p_value(100, 2)

        self.assertAlmostEqual(p_value, 1.9287498479639178e-22, delta=1e-35)
        self.assertGreater(p_value, 0.0)

    def test_large_df_chi_squared_series_converges(self):
        p_value = statistics.chi_squared_p_value(1_000_000, 1_000_000)

        self.assertAlmostEqual(p_value, 0.4998119368033945, delta=1e-9)

    def test_huge_df_chi_squared_uses_stable_approximation(self):
        p_value = statistics.chi_squared_p_value(10_000_000_000, 10_000_000_000)

        self.assertAlmostEqual(p_value, 0.4999981193680548, delta=1e-8)
        self.assertGreaterEqual(p_value, 0.0)
        self.assertLessEqual(p_value, 1.0)

    def test_t_distribution_symmetry_and_boundaries(self):
        for df in (1, 10, 400, 19992):
            self.assertAlmostEqual(statistics.t_cdf_approx(0.0, df), 0.5, delta=1e-14)
            self.assertAlmostEqual(
                statistics.t_cdf_approx(-1.5, df),
                1.0 - statistics.t_cdf_approx(1.5, df),
                delta=1e-12,
            )
        self.assertEqual(statistics.p_value_two_sided(0.0, 10), 1.0)
        self.assertAlmostEqual(
            statistics.p_value_two_sided(-1.5, 198),
            statistics.p_value_two_sided(1.5, 198),
            delta=1e-14,
        )

    def test_regularized_functions_cover_boundaries_and_both_branches(self):
        self.assertEqual(statistics._regularized_beta(0.0, 2.0, 3.0), 0.0)
        self.assertEqual(statistics._regularized_beta(1.0, 2.0, 3.0), 1.0)
        self.assertAlmostEqual(
            statistics._regularized_beta(0.2, 2.0, 3.0)
            + statistics._regularized_beta(0.8, 3.0, 2.0),
            1.0,
            delta=1e-12,
        )

        self.assertEqual(statistics._lower_incomplete_gamma_ratio(2.0, 0.0), 0.0)
        series_value = statistics._lower_incomplete_gamma_ratio(2.0, 1.0)
        fraction_value = statistics._lower_incomplete_gamma_ratio(2.0, 4.0)
        self.assertGreater(series_value, 0.0)
        self.assertLess(series_value, fraction_value)
        self.assertLess(fraction_value, 1.0)


if __name__ == "__main__":
    unittest.main()
