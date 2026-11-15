# Agent Substrate 101

面向 Kubernetes 上的 Agent Substrate v1.0.0 技术手册，从第一个 actor 一直讲到容量规划、版本升级与故障排查，每项工程决策都给出实测答案。官方文档说明每个对象和标志的设计用途，本手册则记录真实运行、主动注入故障并恢复集群的全过程。中文网页版位于 [aieng-zh.cn/manual-agent-substrate-101.html](https://aieng-zh.cn/manual-agent-substrate-101.html)，上游英文课程各版本 release 附带英文 PDF `aiefs-manual-agent-substrate-101.pdf`。

## 手册内容

- 正文共 9 个部分 40 节，外加 10 节参考。第 1 部分用一页篇幅勾勒整个系统；第 2 至第 6 部分覆盖安装、actor、worker 与容量、身份与访问控制以及网络；第 7 部分连接 kagent 1.0、agentgateway v1.7.0 与 Agent Executor；第 8 部分覆盖运维、故障与升级；第 9 部分亲手构建四个可直接运行的组件。
- 每个实测数字都注明测试机器与运行次数。当前版本尚未测量的场景在文中如实标明，第 8.5 节汇总列入下一版的补测清单。
- 75 幅正文图表与 1 幅封面插图，均由图表套件生成。统计图表直接读取汇总文件，大多数同时绘出单次样本点与中位数。
- 177 段代码清单（listing），每一段都截自实测录制文件或固定标签处的源码，经审计脚本逐行核对溯源。
- 第 1.1 节将项目官网的每项核心宣称与我们的实测结果并列对照。

## 目录结构

| 路径 | 内容 |
|---|---|
| `manual.json` | 手册清单：固定版本、篇章结构、配色表、来源、封面插图 |
| `front.md`、`sections/` | 正文 Markdown，每节一个文件 |
| `figures/src/` | 图表脚本源码，构建输出至 `figures/*.svg` |
| `capture/lab/` | `A-quickstart` 至 `Z-bursts` 共 24 组录制实验，每组包含脚本、原始输出及说明废弃行的 README |
| `capture/lab/summary/` | 供表格和统计图读取的 38 份汇总文件 |
| `capture/lab/REDACTIONS.txt` | 提交前裁剪、缩短或脱敏的每个文件及原因记录 |
| `capture/run.py` | 离线从原始录制重建并校验汇总文件，无需联网 |
| `capture/demos/` | 四个示例程序及其录制输出：空闲挂起器、有状态 agent、工具沙箱、故障演练 |
| `research/brief.md` | 编写本手册所依据的研究简报 |

## 固定版本

| 项目 | 版本 |
|---|---|
| Agent Substrate | v1.0.0，提交 `b34fbee742906494b5eb4f1f36987176bf8770a4`，发布于 2026-11-05 |
| kagent | v1.0.0 |
| agentgateway | v1.7.0 |
| Agent Executor | 提交 `a72b8ca4`，另用 v0.3.1 做一处对比 |
| 核验日期 | 2026-11-12 至 2026-11-13（上游录制与核验日期） |

## 录制环境

| 手册中的名称 | 机器配置 |
|---|---|
| x86 服务器客户机 | 24 vCPU、47 GB 内存的 KVM 客户机，开启嵌套 KVM |
| 另一台 x86 服务器客户机 | 16 vCPU、23 GB 内存，或 16 vCPU、31 GB 内存的 KVM 客户机，文中按内存大小区分 |
| Mac | 运行 Docker Desktop 的 Apple silicon 笔记本，使用 arm64 发布镜像 |

测试集群均为 1 至 3 节点的 kind 集群。kagent 与 Agent Executor 实验使用运行在 CPU 上的 1 至 2 GB 小型开源模型，速度约每秒 7 至 14 个 token，未使用 GPU。`capture/README.md` 列出了每组实验对应的机器，请勿跨机器横向比较耗时数字。

## 阅读建议

先读前言“如何阅读本手册”，照着命令从发布镜像装起 Agent Substrate 并唤醒第一个 actor。完整通读一遍第 1 部分，之后按手头问题直接跳读对应章节。遇到集群异常时，先查第 8.3 节的现象对照表。

## 复验录制数据

原始录制依赖 Kubernetes 集群，不在 CI 中重跑；各组实验脚本保存在 `capture/lab/` 对应子目录下，`capture/README.md` 记录了机器、软件版本与步骤，`capture/demos/` 下的四个示例各有独立 README 和 `run.sh`。

汇总文件可离线复验（上游录制快照核对，不在本机重跑集群）：

```bash
cd manuals/agent-substrate-101
python3 capture/run.py --check
```

该命令在临时目录重建全部汇总并与已提交文件比对，录制部分会打印一行 `skipped:` 说明未启动集群。

## 构建与审计

在仓库根目录运行：

```bash
node manuals/_shared/figkit.js build manuals/agent-substrate-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual agent-substrate-101 --skip-capture
```

审计必须报告 `TOTAL 0`。完整规范见 [manuals/AUTHORING.md](../AUTHORING.md)。
