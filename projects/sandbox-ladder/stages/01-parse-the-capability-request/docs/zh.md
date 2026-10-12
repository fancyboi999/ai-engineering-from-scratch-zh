# 解析能力请求

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

以四个显式布尔值表示威胁模型：不可信代码、带秘密宿主、拒绝网络、要求内核分离。拒绝未知键和含糊布尔值。策略评估器的价值取决于它是否实际理解请求。

```figure
pj-sandbox-ladder-1
```

## 实现边界

```rust
pub fn needs(text:&str)->Result<Needs,Error>
```

主要参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md)。

选择运行时前，用布尔值写威胁要求。这里 network=true 表示要求网络拒绝，host_kernel=true 表示要求独立内核。两名称都不授予访问权。

```text
untrusted=true,secrets=true,network=true,host_kernel=false
required: filesystem boundary + denied network
```

## 构建与检查

拒绝重复键和非精确 true/false 的值。不要猜 network=yes 意思。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py sandbox-ladder --init learning-artifacts/sandbox-ladder
python3 scripts/project_test.py sandbox-ladder --stage 1 --path learning-artifacts/sandbox-ladder
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

哪个额外要求会使共享内核容器不够用？
