# 导出紧凑上下文与覆盖率

> 衡量哪些诊断模板在压缩后保留下来。

**类型：** Build
**语言：** Rust, Python
**阶段：** 4 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

Rust 紧凑输出为每个保留的模板生成一个 JSON 对象，计数来自完整源流。Python 对照源验证导出组并计算稀有模板覆盖率。任意 JSONL 消费端都可读取上下文。

## 示例推演

均匀输出保留一个模板，代表 199 条源记录；rareCoverage 为 0。稀有度输出保留两个模板，代表全部 200 条记录；rareCoverage 为 1。这里衡量的是模板，不是 token 节省或因果理解。

```figure
pj-log-volume-reduction-lab-4
```

## 实现契约

Rust `compact(&[Record],&[Record])->String`；JSONL 字段为 `schemaVersion,level,template,count,firstLine,lastLine,example`。Python `coverage(source:str,compact:str,rare_max:int=2)->dict` 拒绝未知组、重复组、计数不匹配和无效定位信息。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py log-volume-reduction-lab --init /tmp/log-volume-reduction-lab-work
python3 scripts/project_test.py log-volume-reduction-lab --stage 4 --path /tmp/log-volume-reduction-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

改变 rare_max，比较召回率。另加一个字节大小指标；长示例可能使行数更少的输出比预期更大。

[Rust 集合](https://doc.rust-lang.org/std/collections/)和 [Python JSON](https://docs.python.org/3/library/json.html)。
