# 选择成本最低的充分配置

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

先过滤不充分配置，再比较成本。遵守成本上限，按名称打破平局，返回显式无合适配置错误。绝不只因预算太小就降级必需隔离控制。

```figure
pj-sandbox-ladder-3
```

## 实现边界

```rust
pub fn select(n:&Needs,candidates:&[Profile],budget:u32)->Result<Profile,Error>
```

主要参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md)。先完成[阶段 2](../../02-define-modeled-control-profiles/docs/zh.md)。

最便宜充分配置也可能超过预算。要求内核分离时，预算 4 不能悄悄降级到成本 3 的容器。

```text
kernel separation required; candidates costs 1,2,3,5
budget 4 -> no sufficient profile
budget 5 -> microvm-fixture
```

## 构建与检查

先按能力过滤，再按成本，再按稳定名称顺序。剩余集合为空则返回限制错误。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py sandbox-ladder --stage 3 --path learning-artifacts/sandbox-ladder
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

两个充分配置有相同建模成本时，应如何变化？
