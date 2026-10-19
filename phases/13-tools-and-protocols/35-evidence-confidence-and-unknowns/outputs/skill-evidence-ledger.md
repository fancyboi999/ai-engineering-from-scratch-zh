---
name: evidence-ledger
description: 将二进制分析发现记录为带内容哈希 ID 的 observed、derived 或 inferred 证据；无观察执行时不声称结果已证实。
version: 1.0.0
phase: 13
lesson: 35
tags: [reverse-engineering, evidence, confidence, unknowns, ghidra, rea]
---

给定自己编译的程序及相关问题，维护一份证据账本和残留未知项列表。最终报告每句话引用证据 ID。适用于 Claude、Cursor、Codex、OpenClaw、Hermes 或任何读取 SKILL.md 的 agent。

## 必需输入

- 目标文件、SHA-256、格式和架构。
- 每次观察的 provider：工具名称和版本，或分析者。
- 每次 provider 运行的分析配置，包含所有契约版本字符串。
- 待回答问题，以及可解决问题的 authority 和 confidence。
- 涉及行为时，提供本机编译器和测试程序。
- 覆盖该目标的授权。只分析自己拥有或有书面许可的程序。

## 步骤

1. 哈希目标。将摘要、格式、架构写入每个 subject，名称和路径不进入身份。
2. 每条记录赋予一种 confidence。`observed` 为从字节或运行读取；`derived` 为由观察记录计算；`inferred` 为预期。
3. 每条记录赋予一种 authority。`shipped-artifact` 表示读取文件，`controlled-replay` 表示受控执行，`analyst-inference` 表示分析者判断。
4. 用记录的规范 JSON（RFC 8785）计算 SHA-256，加 `ev_` 得 `evidence_id`；排除 ID、名称和路径。
5. 原样保留 provider 限制。若执行使用的构建与分析文件不同，添加自己的限制。
6. 每个 derived、inferred 通过 `evidence_links` 链接依赖记录。
7. 每问题开启一个未知项，存问题、范围摘要、严重度、所需 confidence、所需 authority 和推荐探测。
8. 未知项每次变更产生新版本，引用前版摘要；预期版本过期就拒绝变更。
9. 行为主张只与相同函数和参数的观察执行记录核对，统计有运行的输入数。
10. 全部输入有一致执行则 `pass`，任一不一致则 `fail`，部分缺执行则 `unknown`，全部没有则 `unsupported`。
11. 仅以满足 confidence、authority 的证据 ID 解决未知项，一句话不能关闭未知项。
12. 缓存键覆盖目标、provider、profile 摘要、操作和参数。profile 摘要或格式版本不同就拒绝快照。

## 必需账本

对每项主张报告：

- 主张文本，以及覆盖的函数和参数。
- 预测记录 ID 与依赖的推导记录。
- 有观察执行的输入数 / 主张覆盖输入数。
- 支持和反证 ID。
- 从支持记录继承的限制。
- 状态：`pass`、`fail`、`unknown`、`unsupported`。
- 未知项 ID、当前状态、版本。

每个未知项报告问题、严重度、所需 authority、当前状态和版本数。

## 必须拒绝

- 无观察执行，仅从伪代码或反汇编列表声称结果。
- 对仅部分输入有执行的主张给 `pass`。
- 根据空列表给 `fail` 或 `pass`；空列表意味着 `unknown`。
- 证据 ID 包含本地路径或文件名。
- 分析配置中的 provider 与记录 provider 不同。
- 用 derived、inferred 或无证据 ID 解决未知项。
- 不提供当前版本号就变更未知项。
- 契约版本字符串改变后重放旧快照。
- 丢弃 provider 限制。
- 运行记录隐瞒执行的是相同源码的另一构建。
- 将静态分析称为执行观察。

## 输出

返回以下部分：

1. 目标：摘要、格式、架构、构建命令、授权。
2. 证据：每条的 ID、confidence、authority、operation、limitations。
3. 主张：上述账本，每主张一行。
4. 未知项：open、investigating、blocked、contradicted、resolved，各带版本链。
5. 缓存：快照键字段、复用项、各拒绝导入及原因。
6. 完成状态：`ecl_` ID、各状态数量、是否全部主张通过。

最后给出仍阻碍完整答案的第一个未知项及可关闭它的探测。
