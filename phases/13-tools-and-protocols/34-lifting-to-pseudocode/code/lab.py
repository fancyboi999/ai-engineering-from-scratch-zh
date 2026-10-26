"""课程编程练习：基于本课夹具回答五个问题。
预期值由 main.py 读取 fixtures/ 中已提交的文件后计算。
将答案写入 lab_answers.json，再运行 `python3 code/lab.py`。全部答对时返回状态码 0。
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import main

ANSWERS = HERE / "lab_answers.json"

O1 = main.read_object(main.FIXTURES / "ledger-x86_64-O1.o")
PERCENT = main.lift_function(O1, "percent_change")
TOTAL = main.lift_function(O1, "total")
TASKS = [
    ("t1", "-O1 下调用约定判定 percent_change 接收的参数", lambda: len(PERCENT.function.params)),
    ("t2", "-O1 下 total 的 SSA 形式中 phi 函数的数量", lambda: sum(1 for line in TOTAL.ssa_text.splitlines() if "= phi(" in line)),
    ("t3", "magic_divisor 为 0x66666667、移位量为 34 时找到的除数", lambda: main.magic_divisor(0x66666667, 34)),
    ("t4", "-O1 下 percent_change 伪代码的最后一条语句，按单行文本填写", lambda: [line.strip() for line in PERCENT.pseudocode.splitlines() if line.strip().startswith("return")][-1]),
    ("t5", "-O1 下 total 的 param_1 恢复出的 C 类型", lambda: TOTAL.function.web_types["param_1"])
]


def normal(value):
    if isinstance(value, bool):
        return ("bool", value)
    if isinstance(value, str):
        text = value.strip()
        if re.fullmatch(r"0x[0-9a-fA-F]+", text):
            return int(text, 16)
        return text
    if isinstance(value, (list, tuple)):
        return [normal(item) for item in value]
    return value


def expected():
    return {key: compute() for key, _, compute in TASKS}


def grade(answers):
    want = expected()
    rows = []
    for key, question, _ in TASKS:
        given = answers.get(key)
        if given is None:
            rows.append((key, question, "TODO"))
        else:
            rows.append((key, question, "PASS" if normal(given) == normal(want[key]) else "FAIL"))
    return rows


def run(argv):
    path = Path(argv[0]) if argv else ANSWERS
    answers = json.loads(path.read_text(encoding="utf-8"))
    rows = grade(answers)
    for key, question, status in rows:
        print(f"{status:4}  {key}  {question}")
    passed = sum(1 for row in rows if row[2] == "PASS")
    print(f"score: {passed}/{len(rows)}")
    return 0 if passed == len(rows) else 1


if __name__ == "__main__":
    raise SystemExit(run(sys.argv[1:]))
