# 用溢出检查整数计价

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

fixture 价目表以每 token 纳美元计价。未缓存输入、缓存输入、输出分别收费。每乘法与求和检查溢出，浮点舍入不能悄悄改变账单。

```figure
pj-token-counter-and-cost-meter-3
```

## 实现边界

```rust
pub fn cost(usage:&Usage,rates:&Rates)->Result<u64,Error>
```

主要参考：[官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[分词器](../../../../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)。先完成[阶段 2](../../02-validate-recorded-usage/docs/zh.md)。

使用提供的每 token 整数纳美元价目表。input=2、output=5、cached=1 时，已记录请求花费 260 纳美元。fixture 费率不是当前 provider 价格。

```text
60 uncached * 2 = 120
40 cached * 1 = 40
20 output * 5 = 100
total=260 nano_dollars
```

## 构建与检查

用检查溢出的 u64 操作乘加。不要让各组件经浮点美元舍入。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --stage 3 --path learning-artifacts/token-counter-and-cost-meter
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

算术悄悄回绕时，溢出如何影响预算准入？
