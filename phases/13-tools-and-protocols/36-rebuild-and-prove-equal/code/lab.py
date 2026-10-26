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

GRID = main.input_grid()
TASKS = [
    ("t1", "x86_64 上 percent_change_model(3, 105) 的结果", lambda: main.percent_change_model(3, 105)),
    ("t2", "x86_64 上 percent_change_model(0, 5) 的结果", lambda: main.percent_change_model(0, 5)),
    ("t3", "grade_model(100) 的结果", lambda: main.grade_model(100)),
    ("t4", "input_grid() 的单元数量", lambda: len(GRID)),
    ("t5", "网格中 x86_64 模型会触发异常的单元数量", lambda: sum(1 for cell in GRID if main.model(cell.function, cell.args) == main.TRAP))
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
