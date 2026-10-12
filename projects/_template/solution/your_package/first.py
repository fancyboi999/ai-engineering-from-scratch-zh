"""编写示例：有长度限制的任务标签解析。

课程：projects/your-project-id/stages/01-first-stage/docs/zh.md
接受的语法避免歧义分隔符和无界标识符。
"""

import re


def first_function(argument: str) -> str:
    if not isinstance(argument, str):
        raise TypeError("task label must be text")
    label = argument.strip().lower()
    if len(label) > 32 or not re.fullmatch(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*", label):
        raise ValueError("expected a task label of 1 to 32 characters")
    return label
