# 报告残余假设

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

返回选定 fixture，明确说明尚未执行操作系统强制约束。根据选定控制列出共享内核和启用网络的残余项，拒绝不符合原始要求的配置。报告是部署审查输入。

```figure
pj-sandbox-ladder-4
```

## 实现边界

```rust
pub fn plan(n:&Needs,p:&Profile)->Result<String,Error>
```

主要参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和[面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md)。先完成[阶段 3](../../03-select-the-least-costly-sufficient-profile/docs/zh.md)。

可选 Docker 适配器生成可检查参数列表，只运行调用者选定、已在本地的镜像。无害探针测试被拒绝根写入和无默认路由。不含 microVM 实现。

```text
--docker-image alpine:local -> command preview
--execute -> docker_probe with observed stdout
shared host kernel remains a residual
```

## 构建与检查

区分 policy_simulation 和 docker_probe 结果。成功探针仅证明那些检查，不证明能防容器逃逸。

在学员工作区实现阶段。CLI 辅助程序是提供的适配器，导入你的函数，不替换为参考方案。

```bash
python3 scripts/project_test.py sandbox-ladder --stage 4 --path learning-artifacts/sandbox-ladder
```

累积阶段通过后，从仓库根对原创样本输入运行产物：

```bash
python3 learning-artifacts/sandbox-ladder/cli.py untrusted=true,secrets=true,network=true,host_kernel=false --budget 3
```

默认输出是策略模拟。--docker-image 预览调用；--execute 需要本地已有镜像和 Docker。仅测试根写入和默认路由探针。适配器从不实现或验证 microVM 边界。

## 下一步探索

root_write 变为允许时，先检查哪个运行时设置？
