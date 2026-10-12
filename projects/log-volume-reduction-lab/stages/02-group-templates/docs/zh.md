# 对重复模板分组并保留源定位信息

> 统计重复次数，不丢弃其源范围。

**类型：** Build
**语言：** Rust, Python
**阶段：** 2 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

按 (level, template) 二元组分组。每组包含总计数、首末源行号，以及首次遇到的原始消息。排序组键让序列化稳定。数字归一化是启发式，不是语义等价。

## 示例推演

200 行突发日志包含 199 条 WARN 重试，以及第 138 行的一条 ERROR disk-full 消息。重试组跨越第 1 至 200 行。disk 组的 firstLine=lastLine=138。

```figure
pj-log-volume-reduction-lab-2
```

## 实现契约

`group(&[Record])->Vec<Group>`；`Group{level,template,count,first,last,example}`。按 level/template 字典序返回组。源范围可能有间隙；不能据此声称中间每行都属于该组。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py log-volume-reduction-lab --init /tmp/log-volume-reduction-lab-work
python3 scripts/project_test.py log-volume-reduction-lab --stage 2 --path /tmp/log-volume-reduction-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

创建两条归并为同一数字模板的不同消息，讨论因此丢失的诊断证据。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
