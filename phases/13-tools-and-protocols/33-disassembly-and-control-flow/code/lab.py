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

O0 = main.load_fixture("ledger-x86_64-O0.o")
O1 = main.load_fixture("ledger-x86_64-O1.o")
TRAP = main.load_fixture("sweep-trap.o")
TASKS = [
    ("t1", "-O1 下 grade 经递归下降解码出的指令数", lambda: len(main.analyze_function(O1, "grade").descent.instructions)),
    ("t2", "-O1 下 total 的基本块数", lambda: len(main.analyze_function(O1, "total").cfg.blocks)),
    ("t3", "-O1 下 total 循环头的地址，填写十六进制", lambda: hex(main.analyze_function(O1, "total").cfg.back_edges()[0][1])),
    ("t4", "sweep-trap.o 中线性扫描那条覆盖 0x14 的指令起始地址，填写十六进制", lambda: hex(main.analyze_function(TRAP, "lookup").sweep.covering(0x14).address)),
    ("t5", "-O0 下 grade 跳转表的项数", lambda: len(next(iter(main.analyze_function(O0, "grade").descent.resolved_tables.values())).targets))
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
