# 沙箱

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

为运行代码或操作电脑的 agent 做隔离，以及围绕隔离的策略。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [agent 拥有 sudo 和 Docker Engine，隔离墙究竟在何处](hypervisor-is-the-boundary.md) | 概念 | 1 基础 | 6 |
| [页面指示立即发送，且 agent 拥有发送工具](screen-text-is-not-permission.md) | 概念 | 1 基础 | 6 |
| [密钥显示为 proxy-managed，agent 却依然正常工作](sentinel-is-not-the-key.md) | 概念 | 1 基础 | 6 |
| [被称为超时的主机请求，其实返回了 90 字节](blocked-host-reads-as-timeout.md) | 排障 | 2 应用 | 8 |
| [干净的 diff 与新增的 pre-commit 钩子](clone-mode-and-the-hidden-hook.md) | 排障 | 2 应用 | 8 |
| [为什么针对 example.com 的拒绝规则会被直接拒绝](deny-wins-and-the-two-scopes.md) | 概念 | 2 应用 | 8 |
| [启动进程前的四项检查，以及能通过检查的调用](denylist-runner-is-a-guardrail.md) | 代码阅读 | 2 应用 | 8 |
| [pwd 在某次运行中被拒，在下次运行中却执行了](permissions-are-not-a-boundary.md) | 概念 | 2 应用 | 8 |
| [在一个环回地址上响应而在另一个上拒绝的端口](published-port-answers-ipv4-only.md) | 排障 | 2 应用 | 6 |
| [将耗时一小时的安装共享为模板还是工具包](template-or-kit-for-the-toolchain.md) | 权衡 | 2 应用 | 8 |
| [已登录且可读取任意网页的差旅 agent](browser-agent-trust-boundary.md) | 设计 | 3 高级 | 10 |
| [耗时一天的构建运行在寿命一小时的沙箱上](cloud-sandbox-clock-and-bill.md) | 估算 | 3 高级 | 8 |
| [所有笔记本共用一份放行列表，谁能放宽它](governance-narrows-never-widens.md) | 权衡 | 3 高级 | 10 |
| [两个混入组件、一个主机与必须阻止的升级](kit-grants-union-and-widen.md) | 设计 | 3 高级 | 10 |
| [单次沙箱 agent 运行中的三重失败](readonly-database-in-the-sandbox.md) | 排障 | 3 高级 | 10 |
| [依然能带走代码仓库的外发放行列表](exfil-through-an-allowed-host.md) | 设计 | 4 架构与规模 | 12 |
| [连续五次相同调用，五次被拒，退出码 1](headless-coordinator-loops-to-death.md) | 排障 | 4 架构与规模 | 12 |
| [六名工程师、一个代码仓库与一套可审查的沙箱配置](team-sandbox-policy-take-home.md) | 课后任务 | 4 架构与规模 | 60 |

[全部主题](../../README.md)
