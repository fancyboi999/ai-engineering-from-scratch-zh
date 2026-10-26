import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRACTICE = ROOT / "practice"
sys.path.insert(0, str(PRACTICE / "_harness"))

import practice_check

MARKS = {"pass": "通过", "fail": "未通过", "error": "错误", "skip": "跳过"}


def problem_dir(name):
    path = Path(name)
    if path.is_dir() and (path / "meta.json").exists():
        return path.resolve()
    candidate = PRACTICE / name
    if (candidate / "meta.json").exists():
        return candidate
    raise SystemExit(f"找不到名为 {name!r}。题目位于 practice/ 下包含 meta.json 的目录中。")


def read_fixtures(problem):
    path = problem / "fixtures.json"
    return json.loads(path.read_text()) if path.exists() else {}


def evaluate(problem, code_path, layers=None, limit_s=None):
    source = Path(code_path).read_text()
    return practice_check.evaluate(source, str(problem / "tests.py"), read_fixtures(problem), layers, limit_s)


def build_fixtures(problem, reference_path):
    practice_check.reset()
    practice_check.load_tests(str(problem / "tests.py"))
    reference = practice_check.load_module(str(reference_path), "practice_reference")
    return practice_check.build_fixtures(reference)


def print_report(report, meta):
    print(f"{meta['title']} ({meta['id']})")
    if report["load_error"]:
        print(f"  {report['load_error']}")
    layer = None
    for result in report["results"]:
        if result["layer"] != layer:
            layer = result["layer"]
            print(f"\n  {practice_check.LAYER_TITLES[layer]}")
        print(f"    {MARKS[result['status']]:5} {result['name']}")
        if result["status"] != "pass":
            print(f"          {result['message']}")
            if result["expected"] is not None:
                print("          期望值：" + result["expected"].replace("\n", "\n                    "))
            if result["actual"] is not None:
                print("          实际值：" + result["actual"].replace("\n", "\n                    "))
            print(f"          说明：{result['explain']}")
    for warning in report.get("warnings", []):
        print(f"\n  你的代码产生了警告： {warning}")
    if report.get("stdout"):
        print("\n  你的代码输出：\n    " + report["stdout"].rstrip().replace("\n", "\n    "))
    total = report["summary"]
    print(f"\n  {total['total']} 项检查中有 {total['passed']} 项通过。")


def main(argv=None):
    parser = argparse.ArgumentParser(description="运行一道练习的检查并评估你的代码。")
    parser.add_argument("problem", help="题目 ID，例如 softmax-stable")
    parser.add_argument("code", nargs="?", help="你的 Python 文件，默认使用题目 starter")
    parser.add_argument("--examples", action="store_true", help="只运行示例检查，对应页面上的运行按钮")
    parser.add_argument("--layers", default="", help="以逗号分隔的检查层：examples, properties, edge, reference")
    parser.add_argument("--limit", type=float, default=0, help="时间限制（秒）")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出报告")
    parser.add_argument("--build-fixtures", metavar="REFERENCE", help="输出该参考实现生成的夹具")
    args = parser.parse_args(argv)
    problem = problem_dir(args.problem)
    meta = json.loads((problem / "meta.json").read_text())
    if args.build_fixtures:
        print(json.dumps(build_fixtures(problem, args.build_fixtures), allow_nan=True))
        return 0
    layers = ["examples"] if args.examples else [layer for layer in args.layers.split(",") if layer] or None
    code = args.code or str(problem / "starter.py")
    report = evaluate(problem, code, layers, args.limit or None)
    if args.json:
        print(json.dumps(report, allow_nan=False))
    else:
        print_report(report, meta)
    return 0 if report["summary"]["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
