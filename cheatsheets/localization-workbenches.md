---
id: localization-workbenches
title: 本地化与术语表工具
code: LG
subtitle: 运行、输入并检查三个以审校为先的本地化项目，选择多语言模型与源语言。
hue: 28
sources: phases/05-nlp-foundations-to-advanced/18-multilingual-nlp, projects/subtitle-localization-desk, projects/ui-string-localization-workbench, projects/glossary-hovercard-publisher
source_hash: b130e08c94f6d034
---

## 三个项目对比
type: comparison
span: 2
from: projects/subtitle-localization-desk/README.md, projects/subtitle-localization-desk/project.json, projects/subtitle-localization-desk/solution/cli.py, projects/ui-string-localization-workbench/README.md, projects/ui-string-localization-workbench/solution/cli.ts, projects/glossary-hovercard-publisher/README.md, projects/glossary-hovercard-publisher/solution/cli.ts

| 维度 | Subtitle Localization Desk | UI String Localization Workbench | Glossary Hovercard Publisher |
|---|---|---|---|
| 构建产物 | 已审校 WebVTT 与 HTML 工作台 | 已审校语言 JSON 与预览 | 带注解的 HTML 课程 |
| 语言 | Python 3.10+ | Node 22.18 或更新版 | Node 22.18 或更新版 |
| 输入键 | `vtt`、`translations`、`glossary`、`cps` | `locale`、`messages`、`proposals`、`values` | `glossary`、`lesson` |
| 输出 | `review.html`、`translation-decisions.json`、`reviewed.vtt` | `locale.json`、`unresolved-strings.json`、`report.html` | `report.html`、`glossary.json`、`coverage.json` |
| 审校文件 | `--decisions decisions.json` | 第三个参数 `locale-review.json` | 无 |
| 硬闸门 | 所有字幕条目批准后才写出 `reviewed.vtt` | 无问题才能批准 | 标签平衡的 HTML 子集 |

## 运行参考实现
type: command-table
from: projects/subtitle-localization-desk/README.md, projects/ui-string-localization-workbench/README.md, projects/ui-string-localization-workbench/solution/cli.ts, projects/glossary-hovercard-publisher/README.md

| 命令 | 作用 |
|---|---|
| `python3 cli.py samples/input.json --output demo-output` | 对样例运行字幕工作台 |
| `python3 cli.py <input.json> --output <dir>` | 对自己的输入运行字幕工作台 |
| `node cli.ts sample.json output` | UI 工作台或术语表发布器 |
| `node cli.ts <input.json> <dir> <review.json>` | 使用自己的审校结果运行 UI 工作台 |
| `node cli.ts --help` | 打印参数用法 |

## 构建并评测自己的版本
type: task-table
span: 2
from: projects/subtitle-localization-desk/README.md, projects/ui-string-localization-workbench/README.md, projects/glossary-hovercard-publisher/README.md

| 任务 | 代码 |
|---|---|
| 创建起始工作区 | `python3 scripts/project_test.py <project> --init <dir>` |
| 评测一个阶段 | `python3 scripts/project_test.py <project> --stage 1 --path <dir> --strict` |
| 评测所有阶段 | `python3 scripts/project_test.py <project> --all --path <dir> --strict` |
| 保存完成报告 | `--report completion.json` |
| 评测参考实现 | `python3 scripts/project_test.py <project> --all --solution --strict` |

## 字幕工作台流程
type: flow
from: projects/subtitle-localization-desk/API.md, projects/subtitle-localization-desk/solution/main.py, projects/subtitle-localization-desk/solution/cli.py

1. **parse_vtt**：将 WebVTT 读为字幕条目，保留时间戳字符串，为没有 id 的条目分配 `cue-N`。
2. **propose**：接收提供的译文，优先替换较长的源术语。
3. **inspect**：统计可见字符，设置 `budget=floor(duration*cps)`。
4. **export_localized**：通过提案与 cps 的 SHA-256 `fingerprint` 绑定审校结果。
5. **你**：编辑 `decisions.json`，为每条字幕设置 `approved`，再带 `--decisions` 重跑。
6. **CLI**：只有所有字幕条目都批准后，才写出 `reviewed.vtt`。

## 字幕输入（samples/input.json）
type: annotated-code
lang: text
from: projects/subtitle-localization-desk/solution/samples/input.json, projects/subtitle-localization-desk/API.md

```text
{
  "vtt": "WEBVTT\n\nmap\n00:00.000 --> 00:03.000\nOpen the map.\n...",
  "translations": {
    "map": "Abre el map.",  # 术语表将其改为 "Abre el mapa."
    "label": "Escribe un nombre descriptivo ..."  # 2 s，cps 为 12，预算为 24
  },
  "glossary": {"map": "mapa", "marker": "marcador"},  # 源语言到目标语言
  "cps": 12  # 可选，默认为 17
}
```

## UI 字符串工作台流程
type: architecture
from: projects/ui-string-localization-workbench/solution/main.ts, projects/ui-string-localization-workbench/solution/cli.ts, projects/ui-string-localization-workbench/README.md

```arch
node | in | 1,1 | sample.json | messages、proposals | client
node | read | 2,1 | readCatalog() | 键、占位符 | process
node | prop | 3,1 | proposeTranslations() | issues、needsContext | process
node | rev | 3,2 | reviewTranslations() | approve、reject、pending | process
node | loc | 1,2 | locale.json | 已批准字符串 | store
node | unr | 2,2 | unresolved-strings.json | 键及原因 | store
edge | in | read | messages
edge | read | prop | Message[]
edge | prop | rev | Proposal[]
edge | rev | loc | 语言目录
edge | rev | unr | 未解决项
```

## 术语表发布规则
type: concepts
from: projects/glossary-hovercard-publisher/solution/main.ts, projects/glossary-hovercard-publisher/README.md

- **术语 id**：小写，匹配 `^[a-z][a-z0-9-]*$`，且必须唯一。
- **短语**：术语与别名在整个术语表中都不能重复，不区分大小写。
- **匹配**：`matchTerms()` 优先尝试最长短语，并要求单词边界。
- **跳过文本**：`pre`、`code` 和 `a` 内的文本不变。
- **属性**：仅允许 `class`、`id`、`title`、`lang`，以及 `a` 上的 `href`。
- **链接**：`href` 必须以 `https://`、`http://` 或 `#` 开头。
- **定义**：带 `aria-expanded` 的原生按钮显示一个 `role="note"` 的 span。

## 错误消息与修正
type: troubleshooting
from: projects/subtitle-localization-desk/solution/main.py, projects/subtitle-localization-desk/solution/cli.py, projects/ui-string-localization-workbench/solution/main.ts, projects/glossary-hovercard-publisher/solution/main.ts

| 现象 | 原因 | 修正 |
|---|---|---|
| `stale review` | 审校后提案或 cps 变化 | 使用 `review.html` 中新的 `decisions.json` |
| `resolve glossary or acknowledge reading-budget overflow` | 已批准条目缺少术语或超出预算 | 补上术语，或将 `override_budget` 设为 true |
| `STYLE and REGION are outside the supported subset` | VTT 包含 STYLE 或 REGION 块 | 删除这些块。NOTE 块会被忽略 |
| `Placeholder multiset changed` | 译文漏掉或增加 `{name}` | 保留源文的每个占位符 |
| `Stale or invalid translation decision` | 审校译文与提案不同 | 下载新的 `locale-review.json` |
| `Resolve translation issues or context before approving` | 未确认含糊键的上下文 | 将 `acknowledgeContext` 设为 true |
| `Ambiguous repeated phrase` | 两个术语包含同一短语 | 每个短语只归属一个术语 |
| `Unsupported HTML element` | 标签超出允许子集 | 只使用列出的标签 |

## 默认值与限制
type: defaults
from: projects/subtitle-localization-desk/solution/main.py, projects/subtitle-localization-desk/solution/cli.py, projects/ui-string-localization-workbench/solution/main.ts, projects/ui-string-localization-workbench/solution/cli.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| `cps` | 17 | 必须是正有限数 |
| `schema_version` | 1 | 位于 `translation-decisions.json` |
| `approved` | `False` | 所有条目初始都未批准 |
| `override_budget` | `False` | 批准超预算条目时必需 |
| 提案长度 | 2000 | 每个提案的最大字符数 |
| `schemaVersion` | 1 | `locale-review.json` 中必填 |
| 输出目录 | `output` | Node CLI 的第二个参数 |
| 错误退出码 | 2 | Node CLI 会打印消息 |

## 选择多语言模型
type: task-table
from: phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md

| 任务 | 代码 |
|---|---|
| 100 种语言的分类 | 微调 `XLM-R-base` |
| 零样本分类 | `joeddav/xlm-roberta-large-xnli` |
| 200 种语言的翻译 | `facebook/nllb-200-distilled-600M` |
| 低资源语言 | `XLM-V` 或相近语言微调 |
| 少样本训练轮数 | `num_train_epochs=5` |
| 少样本学习率 | `learning_rate=2e-5` |
| 长尾文字系统 | `byte_fallback=True` |

## 源语言选择
type: qa
from: phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md, phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/code/main.py

- **英语总是最佳源语言吗？** 不是。语言相似性比语料规模更能预测迁移效果。
- **目标语言是马拉地语呢？** `rank_source_languages()` 将印地语排在英语之前。
- **需要多少目标标签？** 100 至 500 个样例可达到英语基线的 95 至 98%。
- **为什么不用更高学习率？** 多语言对齐会坍塌成仅适合英语的模型。
- **什么是切词膨胀成本？** 印地语所需 token 可能是英语的 3 至 5 倍。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md, projects/subtitle-localization-desk/README.md, projects/ui-string-localization-workbench/README.md, projects/glossary-hovercard-publisher/README.md

- 逐语言报告准确率，汇总值会掩盖长尾。
- 训练前检查目标文本的切词膨胀率。
- 每份译文都需要人工审校，工具只标记问题。
- UI 工作台支持简单命名占位符，不支持 ICU 消息。
- 术语表短语不会跨元素或实体边界。
- HTML 在本地运行，不向第三方服务发送数据。
