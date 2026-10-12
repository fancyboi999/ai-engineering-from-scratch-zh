# 验证已记录用量

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

缓存输入是输入子集，不是要重复相加的额外 token 类别。cached 大于总输入的 provider 记录无效。从显式逗号分隔 fixture 线路格式解析三计数，拒绝正负号与缺字段。

```figure
pj-token-counter-and-cost-meter-2
```

## 实现边界

```rust
pub fn parse_usage(line:&str)->Result<Usage,Error>
```

主要参考：[官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[分词器](../../../../../phases/10-llms-from-scratch/01-tokenizers/docs/zh.md)。先完成[阶段 1](../../01-estimate-text-with-a-documented-bound/docs/zh.md)。

JSON 适配器读已记录输入输出用量与缓存输入详情。Rust 验证对应 input,output,cached 三元组。缓存 token 是输入 token 子集，不是额外输入费用。

```text
input_tokens=100; output_tokens=20; cached_tokens=40
wire=100,20,40
uncached input=60
```

## 构建与检查

拒绝布尔值、负值和超过输入的缓存计数。provider 响应规范化留在算术核心外。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --stage 2 --path learning-artifacts/token-counter-and-cost-meter
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

provider 响应缺必需输入用量时应怎样？
