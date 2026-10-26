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

GRADE = json.loads((main.FIXTURES / "rea-evidence-grade.json").read_text(encoding="utf-8"))
TASKS = [
    ("t1", "compute_evidence_id 为 rea-evidence-grade.json 得出的证据 ID", lambda: main.compute_evidence_id(GRADE)),
    ("t2", "grade 记录中的限制数量", lambda: len(GRADE["limitations"])),
    ("t3", "grade 记录的 relationship_coverage 状态", lambda: GRADE["relationship_coverage"]["status"]),
    ("t4", "grade 记录的置信度与权威性，按两个字符串组成的列表填写", lambda: [GRADE["confidence"], GRADE["authority"]]),
    ("t5", "grade 记录 subject 的 SHA-256", lambda: GRADE["subject"]["digest"]["sha256"])
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
