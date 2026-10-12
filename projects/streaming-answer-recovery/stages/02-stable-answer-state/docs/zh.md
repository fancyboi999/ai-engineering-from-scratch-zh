# 按稳定身份渲染文本和引用

> 让重复投递无害，同时保留未完成状态。

**类型：** Build
**语言：** TypeScript, Go
**阶段：** 2 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

回答协议在 SSE 上增加连续的正整数 ID 和 JSON 载荷。text 追加内容，citation 添加带标签的 HTTP(S) URL，complete 标记回答完成。相同的重复 ID 被忽略；重复 ID 载荷冲突、缺口和完成后事件均失败。

## 示例推演

事件 1 追加 Caf。回放事件 1 不产生变化。事件 2 追加 é 和更多文本。引用不意味着完成。在 complete 事件到来前，回答仍是草稿。

```figure
pj-streaming-answer-recovery-2
```

## 实现契约

`initial():Answer`；`apply(state,event):Answer`。Answer 包含 text、citations、status、lastID 和已接受事件。`interrupt(state)` 保留文本并标记 interrupted。`cancel(state)` 将未完成回答标记为 cancelled；取消的回答忽略后续事件。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py streaming-answer-recovery --init /tmp/streaming-answer-recovery-work
python3 scripts/project_test.py streaming-answer-recovery --stage 2 --path /tmp/streaming-answer-recovery-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

注入 javascript: 引用，在渲染前拒绝它。引用文本是内容，用 textContent 渲染。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
