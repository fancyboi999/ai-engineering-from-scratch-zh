# A2A 101

1.0.1 版 Agent2Agent 协议，从用途讲到每个请求与响应。中文版网页位于 [aieng-zh.cn/manual-a2a-101.html](https://aieng-zh.cn/manual-a2a-101.html)，课程发布版附带的 PDF 文件名为 `aiefs-manual-a2a-101.pdf`。

## 内容

- 7 部分、28 个正文分节：一页看懂协议、AgentCard、数据模型、操作、绑定、安全与扩展、实现 A2A。之后是七个参考分节。
- 31 幅图，使用图表套件根据采集文件绘制。网页播放动画，打印保持静态。
- `capture/` 中的采集套件：三个 agent 和一个 planner，使用无依赖 Python。手册的每份代码清单均来自 `capture/out/` 中的文件。
- 规范、proto、文档和参考 SDK 之间 40 项冲突的登记表，包含各项上游状态，以及编写时发现的另外 20 项差异。
- Python、JavaScript、Java、Go、.NET、Rust SDK 的 14 项行为比较，以及官方测试套件对采集套件的一次测试运行。

## 文件

| 路径 | 内容 |
|---|---|
| `manual.json` | 清单：版本锁定、各部分、配色、来源 |
| `front.md`、`sections/` | 正文，每个分节一个文件 |
| `figures/src/` | 图表源文件，构建为 `figures/*.svg` |
| `capture/` | 套件及 `capture/out/` 中的录制输出 |
| `research/sources/` | v1.0.1 规范、proto、文档页面的随附副本及许可证 |
| `research/*.md` | 正文引用的事实简报和研究笔记 |

## 运行套件

```bash
cd manuals/a2a-101
python3 capture/run.py --check
```

检查在 41241 至 41243 端口启动三个 agent，重放所有录制交换，报告 `capture/out/` 每个文件是否仍一致。运行 `python3 capture/run.py` 会重新录制这些文件。`capture/README.md` 解释各 agent 及套件与参考 SDK 的差异。

这里的录制输出、规范、研究笔记与测试结果是冻结上游提供的来源证据，不代表中文版同步时在本机重新运行。教学说明译为中文，原始记录和规范保持原样。套件模拟测试、审查和部署，不调用真实模型、CI 或部署服务。

## 构建与检查

从仓库根目录运行：

```bash
node manuals/_shared/figkit.js build manuals/a2a-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual a2a-101
```

审计必须报告 `TOTAL 0`。编写契约见 [manuals/AUTHORING.md](../AUTHORING.md)。主导航和项目身份使用中文站 [aieng-zh.cn](https://aieng-zh.cn) 与 [fancyboi999/ai-engineering-from-scratch-zh](https://github.com/fancyboi999/ai-engineering-from-scratch-zh)，官方协议引用仍指向原始来源。
