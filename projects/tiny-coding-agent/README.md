# 微型编码 agent

修复 agent，展示补丁/测试证据链，拒绝无依据的成功声明。

Orchard basket 修复在可信 Python 工作区的一次性副本中运行。打开任何请求文件前，先在该根目录下解析路径。路径看似本地，符号链接却可能把它指向工作区之外。

## 从学习者工作区开始

[Agent 循环](../../phases/14-agent-engineering/01-the-agent-loop/docs/zh.md)、[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及其标准库。项目使用文件锁或进程组监管的地方需要 POSIX。

```bash
python3 scripts/project_test.py tiny-coding-agent --init learning-artifacts/tiny-coding-agent
python3 scripts/project_test.py tiny-coding-agent --stage 1 --path learning-artifacts/tiny-coding-agent
```

## 构建路线

1. [将文件工具限制在工作区内](stages/01-confine-paths/docs/zh.md)
2. [应用带前置条件的精确补丁](stages/02-apply-exact-patches/docs/zh.md)
3. [通过一个允许的命令运行真实测试](stages/03-run-real-tests/docs/zh.md)
4. [根据证据或预算停止编码循环](stages/04-bound-the-loop/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令用原创 Orchard 示例运行你的工作区代码。将样本路径替换成自己的文件。

```bash
python3 learning-artifacts/tiny-coding-agent/cli.py projects/tiny-coding-agent/examples/workspace projects/tiny-coding-agent/examples/proposals.json --copy-to basket-repair --out repair-trace.json
```

若想先检查完整参考方案，在同一命令中把 `learning-artifacts/tiny-coding-agent` 替换为 `projects/tiny-coding-agent/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确列出，便于其他工具消费。

## 集成边界

CLI 将可信 Python 工作区复制到新目标，再作为本地代码运行测试。附带提案规划器按观察到的失败选择预写修复，不会发明补丁。POSIX 进程组超时会停止子孙进程，但内存和输出配额需要操作系统级运行器。

```bash
python3 scripts/project_test.py tiny-coding-agent --all --solution --strict
python3 scripts/project_test.py tiny-coding-agent --all --path learning-artifacts/tiny-coding-agent --strict
```

第一条命令检查参考方案，第二条检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见过的基准测试。

## 主要参考资料

- [机制与 API 参考](https://docs.python.org/3/library/subprocess.html)
