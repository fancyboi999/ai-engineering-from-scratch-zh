# Constitutional 规则引擎

> 一条规则 = 一个名字、一个谓词、一段解释。三者缺一，就只是凭感觉，不是规则。

**类型：** Build
**语言：** Python、YAML
**前置要求：** 阶段 18 安全相关课程、阶段 19 Track A 第 25-29 课
**预计时间：** ~90 分钟

## 问题背景

classifier 覆盖那些可识别的失败。rules engine 覆盖那些契约性的失败。一个写编程助手的团队想要这样一条约束："每个含代码的响应必须以一个可运行的代码块或一条明确写出的假设结尾。"一个跑客服 bot 的团队想要"每次 refusal 都必须给出下一步建议。"这些约束不是天生的 classifier 目标。它们是作用在响应、对话和 system policy 之上的谓词（predicate），而且需要让非工程师也能读懂。

诚实的表示方式是一个声明式文件。一部 constitution 以 YAML 形式与代码放在一起，纳入版本控制，配一套单独的审查流程。每条规则有一个 `name`、一个 `predicate`、一个 `severity` 和一个 `explanation` 模板。引擎加载这个文件，对候选输出逐条评估规则，并为每条触发的规则返回一个结构化的 `Violation`。本 Capstone 里的规则引擎用 `all_of`、`any_of` 和 `not_` 来组合谓词，于是单条规则就能表达"如果响应含代码，它必须以一个可运行代码块结尾，且不得引用某个仅供内部使用的库"。

本课的另一半是 revision（修订）。一个只会拦截的规则引擎只搭了一半。一个能提出修复方案的规则引擎在运维上才有用：助手起草一份响应，引擎标出 violation，一个 fixer 产出一份修订后的响应，引擎再确认这份修订满足了规则。本课附带一个极简的 fixer（每条规则做正则替换），以及一份在草稿和修订之间的结构化 diff（逐行的新增、删除、编辑）。

## 核心概念

```mermaid
flowchart LR
  D[草稿响应] --> RE[规则引擎]
  RE -->|violation| F[fixer]
  F --> R[修订后的响应]
  R --> RE2[规则引擎第二轮]
  RE2 -->|verdict| OUT[接受或上报]
  D -.->|diff| R
```

一条规则的形状是

```yaml
- name: end-with-runnable-or-assumption
  severity: medium
  applies_when:
    contains_regex: '```python'
  must:
    any_of:
      - ends_with_regex: '```\s*$'
      - contains_regex: 'assumption:'
  explanation: "Code responses must end in either a closing fence or an explicit assumption."
  fix:
    append_if_missing: "\n\nAssumption: example inputs are valid."
```

谓词是原子的：`contains_regex`、`not_contains_regex`、`ends_with_regex`、`starts_with_regex`、`max_words`、`min_words`。组合是 `all_of`、`any_of`、`not_`。引擎先评估 `applies_when`；如果规则不适用，violation 记为 `not_applicable`。否则引擎评估 `must`，产出 `pass` 或 `violation`。

severity 是 `low`、`medium`、`high`，与第 85 课一致。下游的安全防护（第 87 课）把一条 `high` 规则 violation 当作一条 `high` classifier verdict 一样对待：block。

fixer 是一列声明式操作：`append_if_missing`、`prepend_if_missing`、`replace_regex`。每个操作按名字把一条规则映射到一个变换。fixer 故意被限制为局部编辑；结构性重写属于另一个 refusal-and-help 层，本课不涉及。

diff 是拿原始版和修订版算出来的。它是一列 `Change` 记录，含 `op`（add、remove、edit）和相关文本。下游的安全防护可以把 diff 记下来，这样人类审阅者可以长期审计 fixer 的行为。

```figure
cd-constitution-loop
```

## 动手构建

`code/rules.yml` 存放这部 constitution。`code/main.py` 里的加载器既接受 YAML 文件（当 PyYAML 可用时），也接受 JSON 文件（内置）。本课附带的 `rules.yml` 会被课程测试用两条代码路径都解析一遍。`code/main.py` 定义 `Engine` 和 `Fixer` 类，以及一个 `diff` 函数。组合用递归评估，并在 `any_of` 上短路。

附带的 constitution 内容：

- `no-empty-refusal`（medium）—— 一次 refusal 必须包含一条建议或一个引导（redirect）
- `end-with-runnable-or-assumption`（medium）—— 代码响应必须干净地收尾
- `no-pii-in-examples`（high）—— 示例数据不得含邮箱或电话形状
- `cite-when-asserting-fact`（low）—— 以 "According to" 开头的行必须含一个括号引用
- `no-internal-library-leak`（high）—— `internal-only` 和 `policybot-internal` 这两个词不得出现在输出里
- `bounded-length`（low）—— 响应不得超过 800 个词

## 实际使用

`python3 main.py`。demo 让三份草稿响应过一遍引擎，打印 violation，跑 fixer，打印 diff，并写出 `outputs/rules_report.json`。其中一个 fixture 有一条不适用的规则（草稿里没有代码块），报告会为那条规则显示 `not_applicable`，这样团队就能看到引擎确实显式地评估过它。

## 拿去用

`outputs/skill-constitutional-rules-engine.md` 记录了规则文法和 fixer 操作。

## 练习

1. 增加一条规则：当 prompt 提到 safety 时，每个响应都必须包含短语 "If this is urgent"。用组合来写。
2. 把正则 fixer 换成一个带命名槽位（named slot）的模板 fixer。演示一条规则在新设计下如何重写。
3. 增加一个指标端点：给定一份草稿语料库，返回每条规则的 violation 率，这样团队就能看到哪条规则过度触发了。

## 关键术语

| 术语 | 通常用法 | 精确含义 |
|---|---|---|
| constitution | 一份含糊的 policy 文档 | 一个 YAML 文件，里面是带谓词、severity 和解释的规则 |
| predicate | 一个检查 | 一个从文本到 bool 的可调用对象，原子的或经 all_of/any_of/not_ 组合的 |
| violation | 一次失败 | 一条结构化记录，含规则名、severity、解释和命中片段 |
| fixer | 一次模型微调 | 一个确定性的、每条规则一个的变换，把草稿映射到修订版 |
| diff | 字符串比较 | 一个在草稿和修订之间的 add、remove、edit 操作结构化列表 |

## 延伸阅读

第 87 课把这个引擎与输入侧 detector、输出侧 classifier 组合成单一的安全防护。
