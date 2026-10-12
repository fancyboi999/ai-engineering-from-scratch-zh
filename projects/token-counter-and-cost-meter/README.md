# Token 计数器与成本计量器

解释真实账单为何不同于预检估算的用量对账工具。

从可见近似开始。每 token 四字符时，21 个 Unicode 标量估为六 token。这是预检规划基线；实际 provider 计数可因语言、标点、分词器不同而变化。

## 从学员工作区开始

[分词器](../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)、[验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/zh.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）与 Python 3.10+。核心用 Rust 标准库；Python 适配器编译到私有临时目录。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --init learning-artifacts/token-counter-and-cost-meter
python3 scripts/project_test.py token-counter-and-cost-meter --stage 1 --path learning-artifacts/token-counter-and-cost-meter
```

## 构建路线

1. [按已说明边界估算文本](stages/01-estimate-text-with-a-documented-bound/docs/zh.md)
2. [验证已记录用量](stages/02-validate-recorded-usage/docs/zh.md)
3. [用溢出检查整数计价](stages/03-price-with-checked-integers/docs/zh.md)
4. [按账本准入工作](stages/04-admit-work-against-a-ledger/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令在原创 Orchard 示例上运行你的工作区代码。把样本路径替换为自己的文件。

```bash
python3 learning-artifacts/token-counter-and-cost-meter/usage.py projects/token-counter-and-cost-meter/examples/usage.json --out usage-ledger.json
```

先检查完整参考方案时，将同命令中的 `learning-artifacts/token-counter-and-cost-meter` 替换为 `projects/token-counter-and-cost-meter/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具消费。

## 集成边界

费率是显式 fixture 输入，单位为每 token 整数纳美元，不是当前 provider 价格。usage.py 规范已记录用量 JSON，把溢出检查算术交给 Rust。账本是用 --out 保存的顺序重放，不是真实计费服务或并发预留存储。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --all --solution --strict
python3 scripts/project_test.py token-counter-and-cost-meter --all --path learning-artifacts/token-counter-and-cost-meter --strict
```

首命令检查参考方案，第二检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准测试。

## 主要参考资料

- [官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)
