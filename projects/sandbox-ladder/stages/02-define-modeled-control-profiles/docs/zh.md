# 定义建模控制配置

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

将进程、文件系统、容器网络和 microVM 边界建模为数据。配置名本身不证明什么；将每个要求控制与布尔能力匹配。配置刻意假设操作者正确设置，部署验证留给真实运行时。

```figure
pj-sandbox-ladder-2
```

## 实现边界

```rust
pub fn profiles()->Vec<Profile>
pub fn satisfies(n:&Needs,p:&Profile)->bool
```

主要参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md)。先完成[阶段 1](../../01-parse-the-capability-request/docs/zh.md)。

配置是具有示意成本的建模能力。此模型中进程边界无文件系统或网络隔离；容器配置模拟两者，但共享宿主内核。

```text
process: filesystem=false, network=false, kernel=false
container: filesystem=true, network=true, kernel=false
```

## 构建与检查

独立测试要求。缺少任一必需能力时，低成本无关紧要。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py sandbox-ladder --stage 2 --path learning-artifacts/sandbox-ladder
```

预测上面的中间状态，再运行阶段。新桩代码会失败；参考运行通过不证明学员工作区完成。

## 下一步探索

为什么模型不是运行容器具有这些设置的证据？
