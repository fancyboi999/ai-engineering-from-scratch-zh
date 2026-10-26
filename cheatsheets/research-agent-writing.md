---
id: research-agent-writing
title: 论文写作器、评审器与迭代
code: PW
subtitle: 用 UCB 调度实验，以五维评分评审器迭代草稿，并输出 LaTeX、BibTeX 与清单。
hue: 280
sources: phases/19-capstone-projects/54-paper-writer, phases/19-capstone-projects/55-critic-loop, phases/19-capstone-projects/56-iteration-scheduler, phases/19-capstone-projects/57-end-to-end-research-demo
source_hash: e05467138f76f37c
---

## 端到端研究演示
type: architecture
from: phases/19-capstone-projects/57-end-to-end-research-demo/docs/zh.md, phases/19-capstone-projects/57-end-to-end-research-demo/code/main.py, phases/19-capstone-projects/56-iteration-scheduler/docs/zh.md

```arch
node | seed | 1,1 | 初始假设 | alpha、beta、gamma | client
node | sched | 2,1 | IterationScheduler | UCB 选择器 | process
node | slots | 3,1 | 3 个并行槽位 | asyncio 任务 | process
node | bus | 4,1 | 结果总线 | 各分支奖励 | queue
node | pick | 4,2 | pick_best_branch | 最高平均奖励 | process
node | critic | 3,2 | CriticLoop | 每轮五项评分 | model
node | writer | 2,2 | PaperWriter | tex、bib、manifest | process
node | report | 1,2 | DemoReport | stop_reason | store
edge | seed | sched |
edge | sched | slots | 分派
edge | slots | bus | Result
edge | bus | sched | UCB 统计
edge | bus | pick | paper.trigger
edge | pick | critic | MiniPaper
edge | critic | writer | mini_to_full_paper
edge | writer | report | 清单
```

## 运行课程
type: command-table
span: 2
from: phases/19-capstone-projects/54-paper-writer/code/main.py, phases/19-capstone-projects/55-critic-loop/code/main.py, phases/19-capstone-projects/56-iteration-scheduler/code/main.py, phases/19-capstone-projects/57-end-to-end-research-demo/code/main.py

| 命令 | 作用 |
|---|---|
| `python3 code/main.py`（54） | 将 paper.tex、references.bib、manifest.json 写入临时目录 |
| `python3 code/main.py`（55） | 打印评审循环结果及逐轮轨迹 |
| `python3 code/main.py`（56） | 打印 stop_reason、论文触发事件及分支统计 |
| `python3 code/main.py`（57） | 打印最佳分支、评审状态及论文章节 |

## 代码调用
type: task-table
span: 2
from: phases/19-capstone-projects/54-paper-writer/code/main.py, phases/19-capstone-projects/55-critic-loop/code/main.py, phases/19-capstone-projects/56-iteration-scheduler/code/main.py, phases/19-capstone-projects/57-end-to-end-research-demo/code/main.py

| 任务 | 代码 |
|---|---|
| 从实验输出读取图表 | `figs = read_experiment_manifest(experiments, out_dir)` |
| 仅渲染 LaTeX | `render_latex(paper)` |
| 填写正文并写出三个文件 | `manifest = PaperWriter(prose=prose).write(paper, out_dir)` |
| 配对评审器与修订器 | `critic, reviser = make_deterministic_critic_pair()` |
| 迭代草稿 | `CriticLoop(critic=critic, reviser=reviser, max_rounds=6, target_score=8.0)` |
| 模拟实验 | `make_deterministic_runner(base_rewards, noise=0.04, delay_ms=2.0, seed=seed)` |
| 调度并等待 | `report = await sched.run(seed)` |
| 选择并晋级 | `pick_best_branch(sched_report)`，然后 `mini_to_full_paper(critic_result.paper, branch)` |

## 声明论文骨架
type: annotated-code
lang: python
from: phases/19-capstone-projects/54-paper-writer/code/main.py, phases/19-capstone-projects/54-paper-writer/docs/zh.md

```python
paper = Paper(
    title="<title>", authors=["Lab Bot"], abstract="<abstract>",
    sections=[
        Section(id="method", title="Method", cites=["jones2021"],
                figure_refs=[figs[0].id]),     # 标签 sec:method
    ],
    figures=figs,                              # 标签 fig:<id>
    bibliography=[
        BibEntry(key="jones2021", entry_type="article",
                 fields={"title": "On loops", "author": "Jones", "year": "2021"}),
    ],
)
prose = MockProseGenerator(outlines={"method": "<outline>"})
writer = PaperWriter(prose=prose)              # 写入任何文件前先执行门禁
```

## 运行 UCB 调度器
type: annotated-code
lang: python
from: phases/19-capstone-projects/56-iteration-scheduler/code/main.py

```python
seed = [Hypothesis(id="h-a-1", branch="branch-a"),
        Hypothesis(id="h-b-1", branch="branch-b")]
runner = make_deterministic_runner(
    base_rewards={"branch-a": 0.85, "branch-b": 0.55},
    seed=7, delay_ms=2.0,
)                                              # 奖励为 base + N(0, noise)
sched = IterationScheduler(
    runner=runner, slots=3, max_experiments=20,
    paper_threshold=0.7, prune_floor=0.25, prune_after_runs=3,
    expander=deterministic_expander,           # 每个高奖励分支生成两个后续实验
)
report = asyncio.run(sched.run(seed))          # 返回 SchedulerReport
report.to_dict()                               # 包含 stop_reason、paper_triggers
```

## 评审轮次与停止规则
type: flow
from: phases/19-capstone-projects/55-critic-loop/docs/zh.md, phases/19-capstone-projects/55-critic-loop/code/main.py

1. **评审器**：对 clarity、novelty、evidence、methodology 和 related_work 给出 0 至 10 分。
2. **评审器**：为每个低于 8.0 的维度提出一条建议。
3. **运行框架**：五项均达到 `target_score` 时，以原因 target 停止。
4. **运行框架**：连续 2 轮平均增益不超过 `plateau_epsilon`，以原因 plateau 停止。
5. **修订器**：应用各项编辑，如 `expand-body` 或 `add-method-section`。
6. **运行框架**：达到 `max_rounds` 后，状态为 stopped，原因为 budget。
7. **优先级**：target 高于 plateau，plateau 高于 budget。

## 公式与评分
type: concepts
from: phases/19-capstone-projects/56-iteration-scheduler/docs/zh.md, phases/19-capstone-projects/56-iteration-scheduler/code/main.py, phases/19-capstone-projects/55-critic-loop/code/main.py, phases/19-capstone-projects/57-end-to-end-research-demo/code/main.py

- **UCB1**：平均奖励 + c 乘 sqrt(ln(total_runs) / runs)。
- **未尝试分支**：`ucb_score` 返回 `float("inf")`，因此优先运行。
- **剪枝**：尝试 `prune_after_runs` 次后，均值低于 `prune_floor`。
- **论文触发**：分支均值达到 `paper_threshold`，每个分支触发一次。
- **清晰度**：`min(10.0, 3.0 + avg_body / 50.0)`。
- **证据**：`min(10.0, 2.0 + 2.0 * fig_refs + 1.5 * cites)`。
- **新颖性**：`originality_tag` 为 high 时 9.0，medium 时 6.0，low 时 3.0。
- **演示原创性**：奖励至少 0.8 为 high，至少 0.6 为 medium。

## 循环默认值
type: defaults
from: phases/19-capstone-projects/55-critic-loop/code/main.py, phases/19-capstone-projects/55-critic-loop/docs/zh.md, phases/19-capstone-projects/56-iteration-scheduler/code/main.py, phases/19-capstone-projects/56-iteration-scheduler/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `max_rounds` | 5 | 评审预算。小于 1 抛出 ValueError |
| `target_score` | 8.0 | 每个维度，而非平均分 |
| `plateau_epsilon` | 0.1 | 对应 `plateau_window` 为 2 轮 |
| `slots` | 3 | 并行 asyncio 任务 |
| `max_experiments` | 50 | `max_seconds` 为 30.0 |
| `exploration_c` | sqrt(2) | UCB 探索权重 |
| `paper_threshold` | 0.7 | 触发 `paper.trigger` |
| `prune_floor` | 0.2 | 尝试 `prune_after_runs` 即 3 次后 |

## 错误与修正
type: troubleshooting
from: phases/19-capstone-projects/54-paper-writer/code/main.py, phases/19-capstone-projects/55-critic-loop/docs/zh.md, phases/19-capstone-projects/56-iteration-scheduler/code/main.py, phases/19-capstone-projects/57-end-to-end-research-demo/code/main.py, phases/19-capstone-projects/57-end-to-end-research-demo/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `PaperValidationError`：引用未知文献键 | 章节引用缺少 `BibEntry` | 将条目加入 `bibliography` |
| `PaperValidationError`：引用未知图表标识 | `figure_refs` 指向不存在的图表 | 先加入图表 |
| `NoTriggerError` | 无分支达到 `paper_threshold` | 按阈值检查分支奖励 |
| 五轮分数不变，判定为 budget | 建议从未提高评分 | 修正评审器，而非草稿 |
| 分支不再被调度 | 分支已被剪枝 | 检查 `prune_floor` 与 `prune_after_runs` |
| 轨迹事件类型为 error | 运行器任务抛出异常 | 阅读轨迹中异常的 `repr` |

## 问答
type: qa
span: 2
from: phases/19-capstone-projects/54-paper-writer/docs/zh.md, phases/19-capstone-projects/55-critic-loop/docs/zh.md, phases/19-capstone-projects/56-iteration-scheduler/docs/zh.md, phases/19-capstone-projects/57-end-to-end-research-demo/docs/zh.md

- **为何先写骨架？** 门禁先检查图表、引用与章节，再写正文。
- **评审器读什么？** `manifest.json`，不解析 LaTeX。
- **为何用 UCB？** 贪心从不探索，均匀分配从不利用已有结果。
- **为何导入而不复制？** 演示调整 `sys.path`，组合前面课程的实现。
