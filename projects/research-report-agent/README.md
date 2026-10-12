# 研究报告 agent

第 2 级，构建者。约 20 小时。使用 Rust、Python 和 TypeScript 标准库。离线运行。需要 Python 3.10+、rustc 和 Node 22.18+。

将一个问题和一文件夹文档转成每句都能核查的报告。你将构建深度研究工具背后的流水线：搜索、片段提取、规划、带引用写作、主张验证、发布和评估。

```figure
pj-rra-pipeline
```

Rust 负责排序，Python 负责证据和编排，TypeScript 负责发布。两处语言边界都使用可检查的 JSON。回放模型使测试确定；实时模型可选。

## 最终交付

```bash
python3 projects/research-report-agent/solution/run_report.py \
  "How does a secrets proxy protect API keys from prompt injection?" --out out/ --code my-report-agent
```

- `out/report.html`：带编号脚注的章节。每个脚注引用精确的源句子，并链接原始页面。
- `out/report.json`：TypeScript 查看器消费的版本化证据契约。
- `out/trace.json`：运行 id、每一步的耗时、计数、预算使用和终态（`completed`、`needs_review` 或 `failed`）。
- 基于已提交的公开评估 fixture 的评分卡，包含可比较、可分享的分项指标。

## 阶段

| # | 阶段 | 你要实现 | 级别 |
|---|---|---|---|
| 1 | 搜索语料库 | `search/main.rs`、Python 适配器（BM25） | starter |
| 2 | 提取可引用的片段 | `snippets.py`（句子范围、偏移量） | starter |
| 3 | 规划研究 | `planner.py`、`model.py`（回放记录、回退） | core |
| 4 | 只依据证据写作 | `citations.py`、`writer.py` | core |
| 5 | 验证每条主张 | `critic.py`（支持规则、预算、终态） | core |
| 6 | 发布报告 | `publish.py`、`pipeline.py`、`viewer/render.ts` | core |
| 7 | 为公开 fixture 评分 | `evaluate.py` | stretch |

## 开始

```bash
python3 scripts/project_test.py research-report-agent --init my-report-agent
python3 scripts/project_test.py research-report-agent --stage 1 --path my-report-agent
```

阅读 `stages/01-search-the-corpus/docs/zh.md`，补齐 `my-report-agent/report_agent/` 中的桩实现，重复运行直到第 1 阶段通过。后续每阶段都重跑之前所有阶段，因此回归会立即暴露。

遇到困难？参考实现位于 `solution/`。先尝试，再阅读。

## 目录结构

```text
project.json        站点和评分器读取的元数据
fixtures/corpus/    12 篇原创概念笔记，附支持内容的官方来源
fixtures/questions.json       开发问题
fixtures/cassettes/planner.json  第 3 阶段的模型回复记录
heldout/            公开评估问题和投毒草稿（旧目录名）
stages/NN-*/docs/zh.md        每阶段课程
stages/NN-*/starter/          --init 复制的桩实现
stages/NN-*/tests/            评分器运行的测试
solution/           参考实现和 run_report.py
```

## 用于你自己的文档

将 `--corpus` 指向任意 Markdown 文件目录。每个文件以 `title:`、`source_url:` 和 `published:` 三行开头，再接一个空行和正文。

## 已验证的参考输出

secrets-proxy 示例生成 4 个章节、10 个句子，没有删除主张，状态为 `completed`。悬停或键盘聚焦脚注可显示精确证据，可展开的轨迹显示五个流水线步骤。参考基线在六个已提交的公开评估问题上得分 87.5 / 100。演示重复该文件的问题 h4，因此这是可复现的 fixture 分数，不是未见评估的证据。词法验证不能证明现实世界的真相。


## 检查来源更新

原创 Orchard 语料库是虚构的运维文档。用同一问题运行两个修订版本，检查 `orchard-after/changes.json`。

```bash
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code projects/research-report-agent/solution --corpus projects/research-report-agent/examples/orchard/before --out orchard-before
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code projects/research-report-agent/solution --corpus projects/research-report-agent/examples/orchard/after --compare orchard-before/report.json --out orchard-after
```

默认采用确定性规划和抽取式写作。--model replay 需要 --cassette。--model live 使用 RRA_LLM_BASE_URL、RRA_LLM_MODEL 和可选的 RRA_LLM_API_KEY，只用于规划。实时服务行为需用调用者凭据单独运行。公开 fixture 分数不衡量未见数据上的泛化。
