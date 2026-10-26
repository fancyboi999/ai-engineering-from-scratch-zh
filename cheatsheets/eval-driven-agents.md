---
id: eval-driven-agents
title: 评估驱动的 Agent 开发
code: ED
subtitle: 运行评估用例、把关合并、按量规评审，并把关 prompt 与报告变更。使用 Python 标准库。
hue: 140
sources: phases/14-agent-engineering/30-eval-driven-agent-development, phases/14-agent-engineering/38-verification-gates, phases/14-agent-engineering/39-reviewer-agent, projects/prompt-regression-tester, projects/report-judge
source_hash: 2c31de1478efc81e
---

## 从构建到签核
type: architecture
from: phases/14-agent-engineering/38-verification-gates/docs/zh.md, phases/14-agent-engineering/39-reviewer-agent/docs/zh.md

```arch
node | builder | 1,1 | 构建 Agent | 编写差异 | model
node | arts | 2,1 | 产物 | 差异、范围、规则、反馈 | store
node | gate | 3,1 | 验证门槛 | 确定性，无 LLM | process
node | report | 4,1 | verification_report.json | passed 为 true 或 false | store
node | refuse | 4,2 | 拒绝宣告完成 | 提交人工处理 | client
node | rev | 3,2 | 评审 Agent | 只读，按量规评审 | model
node | human | 2,2 | 人工签核 | 读取 review_report.json | client
edge | builder | arts |
edge | arts | gate |
edge | gate | report |
edge | report | refuse | 否
edge | report | rev | 是
edge | rev | human |
```

## 三层评估
type: comparison
from: phases/14-agent-engineering/30-eval-driven-agent-development/docs/zh.md

| 比较项 | 静态基准 | 自定义离线评估 | 在线评估 |
|---|---|---|---|
| 示例 | SWE-bench Verified、GAIA、BFCL V4 | LLM 评委、执行、轨迹 | 会话重放、护栏告警 |
| 用途 | 跨模型比较 | 你的产品形态 | 生产行为 |
| 测量 | 通用能力 | 适合产品的正确补丁 | 每步成本与延迟 |
| 注意 | 污染、32.67% 泄漏 | 评委也会产生幻觉 | 每次失败都对应一个新用例 |

## 评估器与优化器循环
type: flow
from: phases/14-agent-engineering/30-eval-driven-agent-development/code/main.py, phases/14-agent-engineering/30-eval-driven-agent-development/docs/zh.md

1. **提议者**：`case.proposer(feedback)` 产生候选结果。
2. **评委**：`case.judge(candidate)` 返回是否通过及原因。
3. **改进**：原因成为下一轮反馈。
4. **停止**：达到 `max_rounds` 后，用例判失败。
5. **CI 门槛**：`ci_gate` 阻止超过阈值的回归。

## 运行课程与项目
type: command-table
span: 2
from: phases/14-agent-engineering/30-eval-driven-agent-development/docs/zh.md, phases/14-agent-engineering/38-verification-gates/code/main.py, projects/prompt-regression-tester/README.md, projects/prompt-regression-tester/solution/cli.py, projects/report-judge/README.md, projects/report-judge/solution/cli.py

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 运行课程演示；第 38、39 课会写 JSON 报告 |
| `VERIFY_DEMO_MODE=1 python3 code/main.py --strict` | 使用演示密钥运行门槛演示；所有警告变为阻断 |
| `python3 code/main.py --floor <value>` | 使用不同覆盖率下限运行门槛演示 |
| `python3 scripts/project_test.py <project> --init learning-artifacts/<project>` | 创建学习者工作区 |
| `python3 scripts/project_test.py <project> --stage <n> --path learning-artifacts/<project>` | 测试工作区的一个阶段 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 检查参考实现 |
| `python3 <dir>/cli.py <cases> <baseline> <candidate> --out <json> --markdown <md>` | 比较 prompt；模型变更时加 `--allow-configuration-change` |
| `python3 <dir>/cli.py <claims> --out <json> --html <html>` | 审计报告；报告载荷需加 `--research-payload` |

## 把关一个任务
type: annotated-code
lang: python
from: phases/14-agent-engineering/38-verification-gates/code/main.py

```python
art = Artifacts(task_id="T-001",
    acceptance_commands=accept,              # 退出码为零才算完成
    feedback=[{"command": accept[0], "exit_code": 0}],
    scope_report={"forbidden_writes": [], "off_scope_writes": []},
    rule_report=[{"slug": "done/tests-pass", "passed": True}],
    coverage_report={"current": 0.84, "previous": 0.85},
    head_commit="a1b2c3d")
report = verify(art, strict=False, coverage_floor=0.80)
report.passed                                # 任一阻断发现都会使其为 False
record_override(task_id, finding_code, reason, user_id, head_commit)
verify_signature(entry)                      # 校验覆盖操作的 HMAC
```

## 评审量规
type: concepts
from: phases/14-agent-engineering/39-reviewer-agent/docs/zh.md, phases/14-agent-engineering/39-reviewer-agent/code/main.py

- **问题匹配**：是否解决了原定任务？
- **范围纪律**：修改是否在契约内？
- **假设**：是否写明？
- **验证质量**：验收是否证明目标达成？
- **交接准备**：下次会话能否接手？
- **评分**：每项 0 至 2 分，总分 10 分。
- **结论**：7 分及以上为 `pass`，否则为 `soft_fail`。
- **`hard_fail`**：总分低于 5 或任一项为 0。

## 默认值与数值
type: defaults
from: phases/14-agent-engineering/30-eval-driven-agent-development/code/main.py, phases/14-agent-engineering/38-verification-gates/code/main.py, projects/prompt-regression-tester/solution/main.py, projects/report-judge/solution/support.py, projects/report-judge/solution/compare.py, projects/report-judge/solution/metrics.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_rounds` | 3 | 每个用例的评估与优化轮数 |
| `regression_threshold` | 0.05 | 超过时 `ci_gate` 阻断 |
| `COVERAGE_FLOOR_DEFAULT` | 0.80 | 低于则阻断 |
| `COVERAGE_REGRESSION_DELTA` | 0.01 | 比上次合并下降更多则阻断 |
| `release_gate` `min_pass` | 1.0 | [0,1] 内的通过比例 |
| `release_gate` `max_regressions` | 0 | 整数回归预算 |
| `judge_claim` `threshold` | 0.8 | 判为有依据所需的重叠分数 |
| `compare` `samples` | 2000 | Bootstrap 重采样，`seed=7` |

## Prompt 回归测试器
type: task-table
from: projects/prompt-regression-tester/solution/main.py, projects/prompt-regression-tester/solution/cli.py, projects/prompt-regression-tester/stages/03-pair-revisions/docs/zh.md

| 任务 | 代码 |
|---|---|
| 唯一 ID、已知检查类型 | `validate_cases(cases)` |
| 检查类型 | `contains`, `excludes`, `json` |
| 为一条录制回答评分 | `score_response(response, checks)` |
| 按用例 ID 配对修订 | `compare(cases, baseline, candidate)` |
| 配对状态 | `stable_pass`, `regressed`, `improved` |
| 发布或阻断 | `release_gate(report)` |
| 将录制记录绑定到用例 | `case_sha256 == case_digest(cases)` |
| 加载绑定来源的运行记录 | `load_run(raw, cases)` |

## 报告评委
type: task-table
from: projects/report-judge/solution/claims.py, projects/report-judge/solution/support.py, projects/report-judge/solution/metrics.py, projects/report-judge/solution/compare.py

| 任务 | 代码 |
|---|---|
| 每句一个论断 | `parse_claims(text)` |
| 单条论断的词汇支持度 | `support(claim, source)` |
| 依据证据判定引用 | `judge_claim(claim, evidence)` |
| 零分原因 | `negation`, `number`, `uncited` |
| 精确率、召回率、覆盖率 | `score_report(text, evidence)` |
| 分数权重 | `precision` 0.5、`recall` 0.25 |
| 状态 | `no_evidence`, `needs_review` |
| 配对 bootstrap | `compare(baseline, candidate)` |

## 故障排查
type: troubleshooting
span: 2
from: phases/14-agent-engineering/30-eval-driven-agent-development/docs/zh.md, phases/14-agent-engineering/38-verification-gates/code/main.py, phases/14-agent-engineering/38-verification-gates/docs/zh.md, projects/prompt-regression-tester/solution/cli.py, projects/prompt-regression-tester/stages/02-score-recordings/docs/zh.md, projects/report-judge/stages/02-support/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 评估分数无法解读 | 没有基线 | 保存最近已知正常的基线 |
| 评委放行错误输出 | LLM 评委缺少外部依据 | 用外部工具为评委提供依据 |
| 评估通过，生产失败 | 对评估过拟合 | 轮换用例 |
| CI 误报 | 用例不稳定、不确定 | 固定种子，保存状态快照 |
| `refused to start: VERIFY_OVERRIDE_SECRET is unset` | 没有覆盖密钥 | 设置环境变量；演示可设 `VERIFY_DEMO_MODE=1` |
| `recording does not match cases` | 录制后用例列表变化 | 重新录制 |
| `model/settings changed; explicitly allow this experiment` | 基线与候选配置不同 | 传入 `--allow-configuration-change` |
| 真实论断出现 `order_requires_review` | 词汇规则拒绝改写表达 | 由人工评审论断 |

## 问答
type: qa
from: phases/14-agent-engineering/38-verification-gates/docs/zh.md, phases/14-agent-engineering/39-reviewer-agent/docs/zh.md, projects/prompt-regression-tester/stages/03-pair-revisions/docs/zh.md, projects/prompt-regression-tester/stages/04-gate-releases/docs/zh.md, projects/report-judge/stages/03-metrics/docs/zh.md

- **门槛为何不用 LLM？** 相同产物每次都会得到同一结论。
- **谁能覆盖阻断？** 只有人类，并填写 `override_reason` 与 `overridden_by`。
- **为何单独设置评审者？** 分离职责：不同 prompt、不同输入、没有写权限。
- **为何按 ID 配对用例？** 平均值可能掩盖严重回归。
- **召回率为何为 null？** 召回率和覆盖率需要标签。没有标签就无法计算。

## 提示
type: tips
from: phases/14-agent-engineering/30-eval-driven-agent-development/docs/zh.md, phases/14-agent-engineering/38-verification-gates/docs/zh.md, phases/14-agent-engineering/39-reviewer-agent/docs/zh.md

- 将评估与代码放在一起。每个 PR 都在 CI 中运行。
- 将每条护栏与每条习得规则映射到评估用例。
- 每个任务向 `outputs/verification/<task_id>.json` 写一份报告。
- 仅在发布分支使用 `--strict`。它不是全局默认值。
- 每次 prompt 变更后，在 10-20 个任务的校准集上运行评审者。
- 一致率低于 80% 时，先修改量规，再发布评审者。

## 门槛发现代码
type: concepts
from: phases/14-agent-engineering/38-verification-gates/code/main.py

- **`acceptance.missing`**：阻断。命令未运行。
- **`acceptance.failed`**：阻断。退出码非零。
- **`feedback.null_exit`**：阻断。没有退出码。
- **`scope.forbidden`**：阻断。**`scope.off_scope`**：警告。
- **`coverage.below_floor`**：阻断。**`coverage.missing`**：警告。
