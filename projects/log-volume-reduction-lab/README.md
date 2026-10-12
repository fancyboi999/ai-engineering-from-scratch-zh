# 日志量缩减实验

帮助工程师为助手构建紧凑的日志上下文。学习有界模板分组、计数和代表性示例，再用专门编写的故障 fixture 比较均匀采样和稀有度感知采样。导出压缩后的 JSONL 和覆盖报告，显示丢失了哪些重要事件。

仅使用标准库。四个阶段，约八小时。评分器会测试 Rust 和 Python 实现。

## 动手构建

1. [解析日志记录并限制规模](stages/01-parse-bounded-logs/docs/zh.md)
2. [对重复模板分组并保留源定位信息](stages/02-group-templates/docs/zh.md)
3. [比较采样策略对稀有事件的表现](stages/03-compare-samplers/docs/zh.md)
4. [导出紧凑上下文与覆盖率](stages/04-export-coverage/docs/zh.md)

```bash
python3 scripts/project_test.py log-volume-reduction-lab --init /tmp/log-volume-reduction-lab-work
python3 scripts/project_test.py log-volume-reduction-lab --stage 1 --path /tmp/log-volume-reduction-lab-work --strict
python3 scripts/project_test.py log-volume-reduction-lab --all --solution --strict
```

全新的 starter 在实现前会失败。运行参考方案绝不会授予学习者完成证书。

## 运行你自己的日志

```bash
cd projects/log-volume-reduction-lab/solution
rustc --edition 2021 main.rs -o /tmp/log-context
/tmp/log-context fixtures/burst.log 8 rarity /tmp/context.jsonl
python3 main.py fixtures/burst.log /tmp/context.jsonl --out /tmp/coverage.json
python3 demo.py
```

输入是 UTF-8 的 `LEVEL<TAB>message`，每行一条记录。Rust 工具将连续的最大 ASCII 数字段替换为 `#`，按严重级别和模板分组，在采样记录预算内保留代表组。它写出 schema-version-1 JSONL，包含源记录总数和首末行定位信息。Python 消费端对照原始源独立检查组身份和计数，再报告稀有模板覆盖率（默认频次不超过 2）。

专门编写的 200 行 fixture 在第 138 行有一个 disk-full 事件。预算为 8 的均匀采样漏掉它，rarity 策略则保留它。归一化可能合并无关消息，范围也不是完整的源身份列表。工具既不对敏感日志文本脱敏，也不能证明保留了所有因果线索。发送上下文给助手前，先对输入脱敏。有界核心接受一 MiB、10,000 行、每行 4096 字节。

演示编译并执行实际 Rust 实现，将生成的两个 JSONL 文件交给 Python 覆盖率实现。[Rust 字符串](https://doc.rust-lang.org/std/string/struct.String.html)介绍了 UTF-8 行为。

## 完成证据

```bash
python3 scripts/project_test.py log-volume-reduction-lab --all --path /tmp/log-volume-reduction-lab-work --strict --report /tmp/log-volume-reduction-lab-result.json
```

本地报告未经签名，是自行报告的证据。可编辑图表计算示例值；CLI 运行实际实现。
