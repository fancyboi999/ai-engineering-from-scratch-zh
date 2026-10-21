---
id: ai-tutor-learning-tools
title: AI 导师与学习工具
code: AL
subtitle: 跟踪掌握程度，让每张卡片都有来源依据，规划学习路径与物料，并从自有语料中推荐词语。
hue: 280
sources: phases/19-capstone-projects/17-personal-ai-tutor, projects/source-grounded-study-coach, projects/community-learning-path-finder, projects/vocabulary-autocomplete-pad, projects/workshop-materials-planner
source_hash: 7e7c582706265976
---

## 各项目的产物
type: comparison
span: 2
from: projects/source-grounded-study-coach/README.md, projects/community-learning-path-finder/README.md, projects/vocabulary-autocomplete-pad/README.md, projects/workshop-materials-planner/README.md, projects/vocabulary-autocomplete-pad/solution/cli.ts, projects/vocabulary-autocomplete-pad/solution/main.ts

| 比较项 | 学习教练 | 路径查找器 | 自动补全写作板 | 物料规划器 |
|---|---|---|---|---|
| 产物 | 含复习日期的练习页 | 可行的学习路径 | 本地写作板 | 装箱清单和缺货记录 |
| 运行时 | Node.js 22.18 | Python 3.10+ | Node 22.18 | Python 3.10+ |
| 输入 | 卡组 JSON 和作答事件 | 资源、目标、预算 | 含 id 和文本的语料 | 参与人数、物料、库存 |
| 输出 | index.html, progress.json | learning-map.html, path.json | report.html, vocabulary-model.json | packing-list.csv, shortages.json |
| 复习循环 | 下载作答 JSON | `--decisions decisions.json` | 下载 vocabulary-model.json | `--decisions decisions.json` |
| 限制 | 仅精确匹配答案 | 进度由学习者自报 | 预测一个后续 token，使用两个上下文 token | 同时仅一个会话 |

## 运行与评分
type: command-table
span: 2
from: projects/source-grounded-study-coach/README.md, projects/community-learning-path-finder/README.md, projects/vocabulary-autocomplete-pad/README.md, projects/workshop-materials-planner/README.md, phases/19-capstone-projects/17-personal-ai-tutor/code/main.py, phases/19-capstone-projects/17-personal-ai-tutor/code/ts/README.md

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py <project> --init <workspace>` | 创建工作区。第一阶段会失败 |
| `python3 scripts/project_test.py <project> --stage 1 --path <workspace> --strict` | 对一个阶段评分 |
| `python3 scripts/project_test.py <project> --all --solution --strict` | 检查参考解答 |
| `node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output` | 构建练习页与复习计划 |
| `python3 cli.py samples/input.json --output demo-output` | 运行路径查找器或物料规划器 |
| `node cli.ts sample.json output` | 训练写作板并写入 output/report.html |
| `python main.py` | 运行模拟的导师效果研究 |
| `npm run serve` | 在 :8090 启动导师 Web 应用 |

## 导师的一轮交互
type: flow
from: phases/19-capstone-projects/17-personal-ai-tutor/code/main.py, phases/19-capstone-projects/17-personal-ai-tutor/docs/zh.md

1. **next_concept**：遍历 DAG。选出首个掌握程度低于 0.85 且前置概念均已掌握的概念。
2. **难度**：从 0.3 开始，每个前置概念增加 0.1。
3. **上次动作**：提供前置概念支架则减 0.15，提供提示则减 0.08。
4. **学习者作答**：答对概率为知识水平减去难度的 sigmoid。
5. **socratic_policy**：答对且掌握程度高于 0.8 时返回 `celebrate_and_advance`。
6. **socratic_policy**：答对时返回 `reinforce_and_next_question`。答错且掌握程度高于 0.5 时返回 `hint`。
7. **socratic_policy**：答错且掌握程度不高于 0.5 时返回 `scaffold_from_prereq`。
8. **bkt_update**：更新掌握程度，再加上学习转移。

## BKT 更新
type: annotated-code
lang: python
from: phases/19-capstone-projects/17-personal-ai-tutor/code/main.py

```python
p = BKTParams()                          # p_init, p_learn, p_slip, p_guess
if correct:
    num = mastery * (1 - p.p_slip)
    denom = num + (1 - mastery) * p.p_guess
else:
    num = mastery * p.p_slip
    denom = num + (1 - mastery) * (1 - p.p_guess)
posterior = num / max(denom, 1e-6)
return posterior + (1 - posterior) * p.p_learn   # 学习转移
```

## 学习教练循环
type: architecture
from: projects/source-grounded-study-coach/solution/main.ts, projects/source-grounded-study-coach/README.md

```arch
node | deck | 1,1 | deck.json | 来源与卡片 | store
node | att | 1,2 | attempts.json | 带日期的答案 | store
node | val | 2,1 | validateDeck | 偏移区间包含答案 | process
node | prog | 2,2 | buildProgress | 每张卡的盒子与到期日 | process
node | exp | 3,1 | exportPractice | 写入输出 | process
node | page | 4,1 | index.html | 揭示答案并记录 | client
node | json | 3,2 | progress.json | 到期卡片 | store
edge | deck | val |
edge | val | exp |
edge | att | prog | 重放
edge | prog | exp |
edge | exp | page |
edge | exp | json |
edge | page | att | 下载
```

## 项目函数
type: task-table
from: projects/source-grounded-study-coach/solution/main.ts, projects/community-learning-path-finder/API.md, projects/vocabulary-autocomplete-pad/README.md, projects/workshop-materials-planner/API.md

| 任务 | 代码 |
|---|---|
| 给一个输入答案评分 | `gradeAnswer(deck, cardId, response)` |
| 列出到期卡片 | `dueCards(progress, date)` |
| 排序前置依赖 | `path_for(index, target, completed=None)` |
| 在预算内对路径排名 | `rank_paths(index, goals, budget, completed=None)` |
| 推荐下一个词 | `suggest(model: Model, prefix: string, history?: string[], limit?: number)` |
| 加载已保存的模型 | `importModel(value: unknown)` |
| 按人数调整物料 | `scale(model, participants=None)` |
| 查找缺货 | `shortages(model, participants=None)` |

## 代码中的规则
type: concepts
from: projects/source-grounded-study-coach/solution/main.ts, projects/community-learning-path-finder/API.md, projects/vocabulary-autocomplete-pad/solution/main.ts, projects/workshop-materials-planner/API.md

- **答案匹配**：先做 NFKC 规范化、转小写、去首尾空白、去末尾标点，再精确匹配。
- **盒子**：答对加 1，最高为 5。答错重置为 0。
- **间隔**：答对为 `2 ** (state.box - 1)` 天，答错为 1 天。
- **路径排名**：先按覆盖目标最多，再按耗时最少，最后按标识排序。
- **推荐分数**：`order * 1000000 + count`。更长的历史优先。
- **耗材**：`quantity*participants`。
- **共用设备**：`quantity*ceil(participants/share)`。
- **未知库存**：库存单位无法换算时，缺货量保持未知。

## 默认值与数值
type: defaults
from: phases/19-capstone-projects/17-personal-ai-tutor/code/main.py, projects/community-learning-path-finder/API.md, projects/vocabulary-autocomplete-pad/solution/main.ts, projects/workshop-materials-planner/solution/cli.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `p_init` | 0.2 | 先验知识水平 |
| `p_learn` | 0.12 | 每次练习的学习率 |
| `p_slip`, `p_guess` | 0.10 | 猜对概率为 0.15 |
| `master_threshold` | 0.85 | 跳过已掌握的概念 |
| 目录大小 | 18 | 精确规划器的上限 |
| `suggest` 上限 | 5 | 允许范围 0..50 |
| 规划器 `compare` | [8, 12] | 用来比较的参与人数 |
| 研究 `n_turns` | 60 | 每组 10 名学习者 |

## 错误与修正
type: troubleshooting
from: projects/source-grounded-study-coach/solution/main.ts, projects/community-learning-path-finder/solution/main.py, projects/vocabulary-autocomplete-pad/solution/main.ts, projects/workshop-materials-planner/solution/main.py

| 现象 | 原因 | 修正 |
|---|---|---|
| "Canonical answer must occur in the evidence quote" | 偏移区间未包含答案 | 按 UTF-16 单位修正 `start` 和 `end` |
| "Conflicting duplicate attempt ID" | 相同 id 对应不同内容 | 为每次作答分配新 id |
| "Proposal lacks verbatim answer evidence" | 模型引用不在来源中 | 拒绝提案，保持卡组不变 |
| "prerequisite cycle" | 资源互为前置条件 | 删除一条前置依赖边 |
| "stale progress" | 导出后输入已改变 | 重新运行，再编辑新的决策 |
| "complete prerequisites first" | 进度跳过了步骤 | 先标记前置条件为完成 |
| "inconsistent conversion cycle" | 两条单位换算路径不一致 | 修正换算系数 |
| "Unsupported model schema" | `schemaVersion` 不是 1 | 加载 schema 版本为 1 的模型 |

## 缩写
type: glossary
from: phases/19-capstone-projects/17-personal-ai-tutor/docs/zh.md, phases/19-capstone-projects/17-personal-ai-tutor/code/ts/README.md

- **BKT**：贝叶斯知识追踪。记录每个概念的掌握概率。
- **FSRS**：自由间隔重复调度器。优于 SM-2。
- **DAG**：带前置依赖边的概念有向无环图。
- **COPPA**：美国限制收集 13 岁以下儿童数据的法律。
- **OER**：每个课程节点附带的开放教育资源。

## 问答
type: qa
from: phases/19-capstone-projects/17-personal-ai-tutor/docs/zh.md, projects/source-grounded-study-coach/README.md, projects/workshop-materials-planner/API.md

- **学习者索要答案时，导师做什么？** 提出引导性问题。
- **什么能证明导师有效？** 在两周内对 10 名学习者测量前后测差值。
- **学习教练会批改作文吗？** 不会。它使用人工编写的问题和精确匹配。
- **模型生成的卡片会直接加入卡组吗？** 不会。先写入 card-proposal.json 供审查。
- **规划器会猜胶水体积吗？** 不会。它从不推断密度或包装大小。

## 提示
type: tips
from: phases/19-capstone-projects/17-personal-ai-tutor/docs/zh.md, projects/source-grounded-study-coach/README.md, projects/community-learning-path-finder/README.md

- 构建包含 50-150 个概念节点的课程图。
- 在相同内容上与非自适应基线比较。
- 1 年后自动删除记忆，并按学习者 ID 隔离。
- 把页面上的复习日期传给 `--date`。
- 单独保留第二组示例用于评估。
- 下载前重新加载练习页会丢弃新增作答。
