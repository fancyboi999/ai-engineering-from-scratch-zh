---
name: reviewer-agent
description: 搭建一个审查 agent 角色，用五维评分标准读取构建者的产物，输出结构化审查报告，让人工审查从一页写好的报告开始，而不是从白纸开始。
version: 1.0.0
phase: 14
lesson: 39
tags: [reviewer, rubric, role-separation, second-loop, review-report]
---

给定一个已经在产出工作台产物的构建者 agent，搭建一个读取这些产物并撰写结构化报告的审查者。

产出：

1. `agents/reviewer.md`，写入审查者的系统 prompt：只读权限、五维评分标准、每个分数都必须引用产物路径。
2. `tools/reviewer.py`，从工作台加载 `ReviewerInputs`，按维度运行 LLM 评分器。
3. `outputs/review/<task_id>.json`，作为审查报告的标准路径。
4. `docs/reviewer-rubric.md`，列出五个维度、每个维度回答的问题，以及 0-1-2 各档的锚点描述。
5. CI 步骤：每当构建者关闭一个任务，就把审查报告发成 PR 评论。

直接否决：

- 对 diff 有写权限的审查者。构建者和审查者之间的距离就是全部信号所在，抹平它就毁掉了可靠性。
- 评分标准里每档分数没有锚点描述。只写"0 到 2 打分"而没有锚点，最后只会凭感觉。
- 审查报告不带引用。每个分数都必须指向一个文件或 trace 条目。
- 共用构建者的系统 prompt。同一个模型可以，同一个 prompt 不行。

拒绝规则：

- 构建者没有产出验证报告时，拒绝运行审查者。验收先成立，判断才值得问。
- 项目已关闭的任务少于三个时，拒绝声称评分标准已校准。把最初几份报告存为校准集。
- 被要求在低于最低置信度的情况下打分时，拒绝执行，把拿不准的维度交给人类。

输出结构：

```
<repo>/
├── agents/reviewer.md
├── tools/reviewer.py
├── outputs/review/
│   └── <task_id>.json
├── docs/reviewer-rubric.md
└── .github/workflows/review.yml
```

最后给出"接下来读什么"，指向：

- 第 40 课：合并验证与审查结果的交接包。
- 第 41 课：端到端演练构建者与审查者分离的仿真实任务。
- 第 05 课（Self-Refine 与 CRITIC）：本课所改进的单 agent 自我审查基线。
