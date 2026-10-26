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

O0 = main.ElfFile.from_path(main.FIXTURES / "ledger-x86_64-O0.o")
O1 = main.ElfFile.from_path(main.FIXTURES / "ledger-x86_64-O1.o")
RODATA = O1.section_bytes(O1.section(".rodata"))
TASKS = [
    ("t1", "`ledger-x86_64-O1.o` 的 e_shoff，填写数值", lambda: O1.header.e_shoff),
    ("t2", "该文件中 percent_change 的 st_size", lambda: O1.symbol("percent_change").st_size),
    ("t3", "该文件中 .text 的文件偏移，填写十六进制", lambda: hex(O1.section(".text").sh_offset)),
    ("t4", "ledger-x86_64-O0.o 中的重定位类型名，排序后以列表填写", lambda: sorted({r.type_name for r in O0.relocations})),
    ("t5", "ledger-x86_64-O1.o 中 .rodata+0x14 的五个整数", lambda: [int.from_bytes(RODATA[i : i + 4], "little") for i in range(0x14, 0x28, 4)])
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
