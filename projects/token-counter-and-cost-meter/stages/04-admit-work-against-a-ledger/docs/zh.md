# 按账本准入工作

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

只有 spent 加报价在配置限制内才预留报价金额。精确边界接受；被拒预留不修改账本。示例是单进程记账，不声称并发分布式保证。

```figure
pj-token-counter-and-cost-meter-4
```

## 实现边界

```rust
pub fn reserve(spent:&mut u64,quote:u64,limit:u64)->Result<u64,Error>
```

主要参考：[官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[分词器](../../../../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)。先完成[阶段 3](../../03-price-with-checked-integers/docs/zh.md)。

按已记录用量重放预留。首个 Orchard 请求预留 600，结算 260，释放 340。只剩 430 时，后续需 1,500 的请求被阻止。保存 JSON 保留请求 ID 与全部结算字段。

```text
limit=1000
request 1 reserved=600 actual=260 unused=340
request 2 actual=310 -> spent=570
remaining=430; larger reservation -> blocked
```

## 构建与检查

结算须记录实际用量，即使超过估计。明确标记超支，不要通过封顶计费成本来隐藏。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --stage 4 --path learning-artifacts/token-counter-and-cost-meter
```

累积阶段通过后，从仓库根对原创样本输入运行产物：

```bash
python3 learning-artifacts/token-counter-and-cost-meter/usage.py projects/token-counter-and-cost-meter/examples/usage.json --out usage-ledger.json
```

费率是显式 fixture 输入，单位为每 token 整数纳美元，不是当前 provider 价格。usage.py 规范已记录用量 JSON，把溢出检查算术交给 Rust。账本是用 --out 保存的顺序重放，不是真实计费服务或并发预留存储。

## 下一步探索

agent-budget-planner 可复用哪些字段而不混淆报价与实际用量？
