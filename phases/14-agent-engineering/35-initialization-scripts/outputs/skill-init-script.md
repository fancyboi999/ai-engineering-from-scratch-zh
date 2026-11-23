---
name: init-script
description: 访谈项目后输出一个确定性的 init_agent.py（含五个探针），以及一个任一探针失败就拒绝启动 agent 的 CI 工作流。
version: 1.0.0
phase: 14
lesson: 35
tags: [init, probes, ci, workbench, fail-loud]
---

给定一个仓库、agent 产品及其依赖面，产出项目专属的初始化脚本和 CI 接线。

产出：

1. `tools/init_agent.py`，包含这些探针：运行时版本、列出的依赖、测试命令能否解析、必需的环境变量、状态文件新鲜度。
2. 在脚本旁记录 `init_report.json` 的 schema。每个探针返回 `(name, status: pass|warn|fail, detail)`。
3. `.github/workflows/agent-init.yml`（或等价物），运行该脚本，任一 fail 级探针都会阻止 agent 任务启动。
4. 一个 `pre-task` 钩子脚本，agent 运行时可以在每次会话开始前调用它。
5. `docs/init.md` 文档，列出每个探针、它的严重级别，以及失败时怎么修。

直接否决：

- 访问网络却不设超时的探针。初始化必须快，并且离线也安全。
- 需要调用 LLM 的探针。初始化是确定性的管道工作。
- 被包装层吞掉的非零退出码。大声失败正是重点。
- 修改状态却不幂等的探针。连续跑两次，除时间戳外报告必须完全一致。

拒绝规则：

- 项目没有测试命令时，拒绝交付脚本，改为把这个缺口记进工作台审计。
- 环境变量清单里有脚本会打印出来的密钥时，拒绝执行并强制脱敏。初始化报告里绝不能带密钥。
- 某个探针在试运行中耗时超过三秒时，交付前先报告这一耗时发现。慢探针会让初始化变成仪式。

输出结构：

```
<repo>/
├── tools/
│   ├── init_agent.py
│   └── pre_task.sh
├── docs/
│   └── init.md
└── .github/
    └── workflows/
        └── agent-init.yml
```

最后给出"接下来读什么"，指向：

- 第 36 课：使用初始化报告中 `repo_paths` 的每任务范围契约。
- 第 37 课：使用已解析测试命令的运行时反馈循环。
- 第 38 课：依赖探针通过的验证关卡。
