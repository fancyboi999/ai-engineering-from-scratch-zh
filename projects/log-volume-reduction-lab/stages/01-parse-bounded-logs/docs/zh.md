# 解析日志记录并限制规模

> 将每一行转成经过验证、有定位信息的记录。

**类型：** Build
**语言：** Rust, Python
**阶段：** 1 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

Rust 解析 UTF-8 文件，每行包含一个 LEVEL、制表符和消息。级别是 DEBUG、INFO、WARN 或 ERROR。保留从一开始的源行号。有界契约最多接受一 MiB、10,000 条记录和每行 4096 字节。

## 示例推演

`WARN	retry request 42 after 50ms` 变成第 1 行、级别 WARN、原始消息，以及模板 `retry request # after #ms`。只替换 ASCII 数字段；非 ASCII 文本保持不变。

```figure
pj-log-volume-reduction-lab-1
```

## 实现契约

`parse_logs(&str) -> Result<Vec<Record>,String>`；`Record{line:usize,level:String,message:String,template:String}`。`template(&str)->String` 将连续的最大 ASCII 数字段替换为 #。拒绝空消息、无效严重级别和控制字符。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py log-volume-reduction-lab --init /tmp/log-volume-reduction-lab-work
python3 scripts/project_test.py log-volume-reduction-lab --stage 1 --path /tmp/log-volume-reduction-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

尝试一个 Unicode 数字。解释为什么更宽泛的数字归一化可能意外合并标识。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
