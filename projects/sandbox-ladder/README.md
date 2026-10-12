# 沙箱策略规划器

将请求能力映射到观测运行时探针的沙箱证据规划器。

选择运行时前，用布尔值写威胁要求。这里 network=true 表示要求网络拒绝，host_kernel=true 表示要求独立内核。两名称都不授予访问权。

## 从学员工作区开始

[面向 AI 的 Docker](../../phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md)、[安全与秘密审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）与 Python 3.10+。核心用 Rust 标准库；Python 适配器编译到私有临时目录。

```bash
python3 scripts/project_test.py sandbox-ladder --init learning-artifacts/sandbox-ladder
python3 scripts/project_test.py sandbox-ladder --stage 1 --path learning-artifacts/sandbox-ladder
```

## 构建路线

1. [解析能力请求](stages/01-parse-the-capability-request/docs/zh.md)
2. [定义建模控制配置](stages/02-define-modeled-control-profiles/docs/zh.md)
3. [选择成本最低的充分配置](stages/03-select-the-least-costly-sufficient-profile/docs/zh.md)
4. [报告残余假设](stages/04-report-residual-assumptions/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令在原创 Orchard 示例上运行你的工作区代码。把样本路径替换为自己的文件。

```bash
python3 learning-artifacts/sandbox-ladder/cli.py untrusted=true,secrets=true,network=true,host_kernel=false --budget 3
```

先检查完整参考方案时，将同命令中的 `learning-artifacts/sandbox-ladder` 替换为 `projects/sandbox-ladder/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具消费。

## 集成边界

默认输出是策略模拟。--docker-image 预览调用；--execute 需要本地已有镜像和 Docker。仅测试根写入和默认路由探针。适配器从不实现或验证 microVM 边界。

```bash
python3 scripts/project_test.py sandbox-ladder --all --solution --strict
python3 scripts/project_test.py sandbox-ladder --all --path learning-artifacts/sandbox-ladder --strict
```

首命令检查参考方案，第二检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准测试。

## 主要参考资料

- [官方参考](https://docs.docker.com/engine/security/)
