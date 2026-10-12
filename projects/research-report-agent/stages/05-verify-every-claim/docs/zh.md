# 验证每条主张

> 引用是关于主张的主张。检查它，让运行框架决定何时结束。

**类型：** Build
**语言：** Python
**阶段：** 5 / 7（core）
**预计时间：** 约 2 小时

## 构建内容

`report_agent/critic.py`：

- `support_score(sentence, snippet_text)` 返回分数和原因。
- `review(markdown, snippets)` 为每句返回一个 `Verdict`。
- `apply_verdicts(report, verdicts)` 删除没有支持的句子。
- `Budget` 限制步骤和 token，`decide_state` 选择终态：`completed`、`needs_review` 或 `failed`。

## 为什么重要

第 4 阶段的写作器因复制而诚实。模型一旦写正文，引用就会漂移：名字被替换、“not”消失、数字变化，或真实片段被附到它从未表达的主张上。第二遍独立于写作器检查引用证据。标记能解析到来源是语法保证；来源支持是另一项判断。

已提交的公开 fixture 文件 `heldout/poisoned_drafts.json` 包含上述每种攻击的草稿，以及必须通过的忠实改写。旧目录名不意味着隐藏测试。审查器必须捕获前者，不误报后者。

## 三条支持规则

```python
def support_score(sentence, snippet_text):
    # 1. 名字和数字必须出现在来源中
    # 2. 否定词必须匹配
    # 3. 否则：主张的内容 token 在来源中出现的比例
```

| 攻击 | 捕获它的规则 |
|---|---|
| “The Hypervisor component intercepts system calls” 引用 interceptor 句子 | Hypervisor 是源中缺失的严格词项 |
| “Denylists are a security boundary” 引用 “Denylists are not a security boundary.” | 否定不同 |
| “allows 5 destinations” 引用 “allows 10 destinations” | 缺少数字 5 |
| 真实片段附到无关主张 | 低重叠或否定不匹配 |
| 句子无标记，或标记指向 `S9` | uncited 或 dangling |

严格词项包括含数字的词、首字母之后还有大写字母的词（`microVMs`），以及不在首位的首字母大写词。词法检查粗糙，但快速、免费、可解释。它们也为模型评判器设定了需超越的标准。

## 预算与终态

模型绝不决定运行何时结束，运行框架决定：

```python
budget = Budget(max_steps=50, max_tokens=20000)
budget.charge("plan", estimate_tokens(question))   # 超限时抛出 BudgetExceeded
```

| 状态 | 条件 |
|---|---|
| `completed` | 每句都有支持 |
| `needs_review` | 部分句子被删除 |
| `failed` | 预算耗尽，或没有句子得到支持 |

显示 `needs_review` 的运行不是失败，而是告诉人类确切检查位置的报告。

```figure
pj-rra-critic
```

## 沿机制推演

词法重叠是启发式，不是蕴含模型。复制的虚假来源可能通过，忠实改写可能失败。在每个 verdict 中保留分数、阈值和拒绝原因，让后续语义评判器可与基线比较，而非悄悄替换它。

## 你的任务

```python
class Budget:
    def __init__(self, max_steps=50, max_tokens=20000): ...
    def charge(self, step, tokens=0): ...
def strict_terms(sentence) -> set[str]: ...
def support_score(sentence, snippet_text) -> tuple[float, str]: ...
def review(markdown, snippets, threshold=0.6) -> list[Verdict]: ...
def decide_state(verdicts, budget_exceeded=False) -> str: ...
def apply_verdicts(report, verdicts) -> Report: ...
```

`snippets` 可以将 id 映射到 `Snippet` 对象或普通字符串。`snippet_text()` 处理两种情况。

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 5 --path my-report-agent
```

## 预期结果

第 5 阶段通过 9 个 Python 测试，之前所有阶段仍通过。六个投毒草稿都得到预期判定序列。实体替换、数字变化、否定变化和悬空标记被拒绝；忠实改写通过。两步预算在第三次计费前停止。

## 自测

1. 写作器复制片段。为什么还要构建审查器？
2. 找一个被审查器误拒绝的改写。模型评判器能改进什么，成本是多少？
3. 为什么 `needs_review` 比悄悄删除句子并报告 `completed` 更安全？

## 进一步探索

- 对词法分数在 0.4 至 0.6 的句子，在 `Model` 协议后添加模型评判器，并把答案记录到记录文件。
- 写三个能骗过审查器的新投毒草稿，再修复审查器。

## Orchard 案例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。先完成[第 4 阶段](../../04-write-with-citations/docs/zh.md)。

验证在有限工作预算下检查词法支持、数字和否定。审查器可以拒绝变化的超时值，却不能证明来源在现实世界中真实或仍有效。

```text
source timeout=15; draft timeout=60 -> 拒绝数字
无证据 -> 根据判定状态为 failed 或 needs_review
预算耗尽 -> 明确命名的终态
```

## 构建并检查

开始下一个操作前计费。在轨迹中保留被拒绝的主张，不要抹掉报告变短的原因。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，导入你的函数，不以参考方案替代。

```bash
python3 scripts/project_test.py research-report-agent --stage 5 --path learning-artifacts/research-report-agent
```

预测上面的中间状态，再运行本阶段。全新桩实现会失败；参考方案通过不能证明学习者工作区已完成。

## 下一步探查

依据部署建议行动前，你会增加什么独立检查？
