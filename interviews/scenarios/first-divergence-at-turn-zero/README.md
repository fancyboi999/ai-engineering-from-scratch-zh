---
id: first-divergence-at-turn-zero
title: 第 0 轮就发生首次分歧的不稳定检查
card: scenarios
kind: incident
level: 3
roles: [ai-evaluation-reliability-engineer, agentic-ai-engineer]
rounds: [debugging, design-review]
tags: [agents, regression-test, sessions, cassettes, determinism]
minutes: 25
lessons: []
manuals: [docker-sandboxes-101#s-session-db-sessions-diff-and-eval]
practice: []
cheatsheet: []
related: [scenarios/eval-failed-with-zero-cost]
updated: 2026-11-03
system:
  version: docker-agent v1.149.0 and sbx v0.47.0
  model: a recorded cassette of ai/qwen3:4b, replayed with no model
  hardware: one Mac, no GPU
source:
  - manuals/docker-sandboxes-101/capture/out/21-two-runs.txt
  - manuals/docker-sandboxes-101/capture/out/18-transcript.txt
  - manuals/docker-sandboxes-101/capture/out/21-sessions-diff.txt
  - manuals/docker-sandboxes-101/capture/out/21-sessions-diff.json
  - manuals/docker-sandboxes-101/capture/out/20-restricted.txt
  - manuals/docker-sandboxes-101/capture/out/21-session-db.txt
  - manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md
---

## Situation

一个团队维护着一个能够列出仓库文件并统计行数的小型 agent。其配置文件的每次变更都必须通过一项检查：运行该 agent，随后通过 `sessions diff` 比对最新生成的会话与前一个会话，若两者存在差异则判定流水线失败。在一周内该检查输出了三种完全不同的结果：一次输出了 `Error: unknown shorthand flag: '1' in -1`；一次判定通过；另一次以 `sessions diverged` 报错失败，且在第 0 轮就发生首次分歧，一侧调用了 `list_directory` 而另一侧调用了 `shell`。

团队将这三种迥异的结果视为 agent 存在非确定性随机行为的铁证，并在一个 pull request 中提议彻底删除该检查项。你手头掌握了命令行执行记录、三次比对的输出结果，以及运行这些命令的机器上的会话数据库存储。

## Evidence

- [基于同一录制卡带运行文件 agent 两次的输出日志](evidence/two-replays-of-one-cassette.txt)
- [卡带重放转录文本中的五轮对话交互](evidence/the-five-turns.txt)
- [帮助文档给出的首次命令行比对尝试形式](evidence/the-help-form.txt)
- [两次重放之间逐轮比对的对比结果](evidence/identical-over-five-turns.txt)
- [最新会话与倒数第三个会话在 CI 参数下的分歧日志](evidence/the-divergence.txt)
- [受防护 agent 在 restricted 模式下的第一轮交互记录](evidence/the-third-newest-session.txt)
- [会话存储表以及最新的五个会话标题列表](evidence/the-sessions-table.txt)

## Questions

1. 三种结果中哪一个真正反映了 agent 本身的状态，哪些反映的是命令调用的问题？
2. 基于同一录制卡带的两次运行结果完全一致。卡带固定了什么，又留下了什么自由度？
3. 分歧报告指明第 0 轮存在 `list_directory` 与 `shell` 的冲突。参与比对的两个会话分别是什么，如何证明？
4. 该比对工具到底比对了什么内容，为什么它在发现首个差异时就停止了后续比对？
5. 重写该检查机制，确保会话分歧只能由 agent 本身的改动触发。

## Walkthrough

1. **分析两次相同运行。** 相同的参数、相同的工作目录、相同的卡带、相同的两条输入消息，以及两次完全一致的最终答复。卡带中保存了预先录制好的模型回复，`--fake` 参数在不调用实际模型的情况下完成回放。模型被完全排除在变量之外，唯一的变数来自操作数与比对机制本身。
2. **统计交互轮数。** 卡带重放的转录记录包含五个模型回复：一次 `list_directory` 调用、一条回复、一次被用户拒绝的 `shell` 调用、一次 `read_file` 调用以及一条最终回复。这五个回复正是比对报告中记录的五轮交互。
3. **查明执行失败的命令。** 帮助文本给出了直接使用负数相对引用的示例形式，而参数解析器将第一个参数直接误判为了未知短参数选项。该错误完全来自参数解析器，与 agent 毫无关系。在相对引用前加上 `--`（正如第二条命令所做的那样）即可规避该问题。
4. **分析通过的测试结果。** 两次重放在全部五轮交互中展现出完全一致的工具调用，JSON 输出统计显示 `turns_a` 为 5、`turns_b` 为 5、`turns_matched` 为 5。这正是该回归检查建立的初衷。
5. **分析报错失败的测试结果。** 此次比对发生在最新的会话（5 轮）与倒数第三新的会话（6 轮）之间。最新的会话首轮调用了 `list_directory`。而倒数第三新的会话首轮调用了 `shell` 执行 `echo m101-ok`。该首轮调用恰好对应另一个 agent 配置文件（带防护的 agent）在 restricted 模式下的运行记录，其响应的是完全不同的用户指令。相对引用 `-3` 根本没有指向文件处理 agent 的历史运行。
6. **审查会话数据库。** 相对引用按照创建时间对单个 `session.db` 中的所有会话全局排序，该表混合记录了所有 agent 配置文件的运行以及团队测试的子会话。最新的五条记录标题全都是统一的 `Running agent`，仅凭标题无法辨别。该机器上最后一次执行的任何任务都会被标记为 `-1`。
7. **明确比对的核心维度。** 工具仅比对工具调用序列，刻意忽略助手的自然语言正文。由于首个差异发生后后续的所有轮次都属于受其影响的下游分支，因此工具报告首次分歧后立即停止后续比对。

## Resolution

Agent 本身没有任何改动。不稳定的测试结果完全源自操作数的错误：针对包含其他 agent 运行记录的共享会话库使用了相对引用，以及采用了被解析器误判的帮助文档命令写法。在唯一的有效比对（针对同一卡带的两次重放）中，全部五轮调用完全匹配。

修复后的检查规整了三个要素：固定模型输入，通过 `--record=PATH` 和 `--models-gateway` 录制卡带，并以 `--fake` 在两侧重放（每条消息保持单个工具调用，因为包含两次并行调用的轮次在重放时会报 500）；固定比对操作数，通过 `--data-dir` 为检查指定专用的独立数据目录，确保其 `session.db` 仅包含自身任务的运行记录，并在引用前显式加上 `--`；固定度量工具，执行 `sessions diff --fail-on-divergence` 且仅关注首次分歧。已有的通过记录提供了确凿证明：两侧使用同一卡带时，测试报告匹配轮数为 5/5，退出码为 0。

## Wrong turns

- "agent 存在随机性，应当删除该检查。" 基于单张卡带的两次重放在全部五轮中完全一致。失败的比对误把两个完全不同的 agent 放在一起比对。
- "将引用加上引号写成 `'-1'` 解决参数报错。" 解析器依然能看到前导减号。必须使用 `--` 来明确终结参数解析。
- "比对助手回复的文本内容而非工具调用。" 自然语言文本在实时运行中容易产生词句波动，比对工具刻意忽略了自然语言。工具调用才是代表行为的本质。
- "继续阅读第 0 轮之后的轮次以寻找更多 bug。" 首次分歧之后的所有交互都属于下游衍生结果，不再具备比对意义。

## Generalize

对 agent 的回归测试需要三个固定的锚点：模型回复、比对操作数以及度量标准。录制卡带固定了模型回复；独立的会话存储与显式参数引用固定了比对操作数；在首个差异处停下的工具调用比对固定了度量标准。当测试在通过与失败之间波动摇摆时，在怀疑被测对象之前，先查明它实际比对了什么。

## Taught in

[会话管理页面](../../../manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md#sessions-diff)展示了帮助文档写法、可用写法以及本次分歧事故。
