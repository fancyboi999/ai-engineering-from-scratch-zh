# 翻译契约（所有翻译 subagent 必须遵守）

本仓库是 [rohitg00/ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch)（MIT）的**简体中文衍生翻译版**。所有翻译 agent 在动手前必须先读完本文件。

## 核心原则

1. **翻译文件统一命名 `zh.md`**：中文正文放在 `docs/zh.md`（`build.js` 依赖它）。不要用 `en.md`。
2. **只翻人读的散文，不碰机器读的结构**。
3. **去 AI 腔**（humanizer）：翻译要像中文母语者写的技术文档，不是逐字直译。

## 必须翻译

- 标题、正文段落、列表、表格里的说明文字
- 代码块**注释里的说明性文字**（如 `# 安装带 CUDA 的 PyTorch`）
- blockquote（课程开头的一句话 motto——`build.js` 抓它当 summary，务必翻好）

## 严禁改动（原样保留）

- 代码块里的**代码本身**（命令、变量、函数名、import）
- 文件路径、URL、命令（如 `phases/00-.../verify.py`、`https://...`）
- 工具名 / 产品名：`uv`、`pnpm`、`cargo`、`PyTorch`、`NumPy`、`Claude`、`Cursor`、`Codex`、`MCP`
- Markdown 结构：代码围栏 ``` 、表格分隔行、HTML 标签、`<br>`、`\n`
- mermaid / sequenceDiagram：语法、节点 ID、边和时序拓扑保持原样；面向读者的节点、边与消息文案译成中文，协议名、代码标识和命令字面量保留英文
- frontmatter（`---` 之间的 `name:`/`description:` 等字段名不翻，值按情况）

## 固定术语表（强制统一，保证全站一致）

### 课程文档章节标题（每篇 docs 都有，必须用这套译法）

| 英文 | 中文 |
|---|---|
| `## Learning Objectives` | `## 学习目标` |
| `## The Problem` | `## 问题背景` |
| `## The Concept` | `## 核心概念` |
| `## Build It` | `## 动手构建` |
| `## Use It` | `## 实际使用` |
| `## Ship It` | `## 拿去用` |
| `## Exercises` | `## 练习` |
| `## Key Terms` | `## 关键术语` |
| `## Further Reading` | `## 延伸阅读` |
| `## Pitfalls` | `## 常见坑` |
| `## Connections` | `## 关联` |
| `## Interactive Lab` | `## 交互实验` |
| `## Practice Lab` | `## 实践实验` |
| `## Shipped Artifact` | `## 交付产物` |
| `## Verify It` | `## 验证` |
| `## Capstone Connection` | `## 综合项目关联` |
| `**Type:**` | `**类型：**` |
| `**Languages:**` | `**语言：**` |
| `**Prerequisites:**` | `**前置要求：**` |
| `**Time:**` | `**预计时间：**` |

### 术语表字段

| 英文 | 中文 |
|---|---|
| `Category` | `分类` |
| `What people say` | `常见说法` |
| `What it actually means` | `实际含义` |
| `Why it matters` | `为什么重要` |
| `In practice` | `实际使用` |
| `Common confusion` | `常见混淆` |
| `Aliases` | `别名` |
| `Related terms` | `相关术语` |
| `Learn it` | `学习课程` |
| `Sources` | `来源` |
| `Why it's called that` | `名称由来` |

### 专业术语

| 英文 | 中文 |
|---|---|
| Backpropagation / Backprop | 反向传播 |
| Tokenizer | 分词器 |
| Attention | 注意力 |
| Gradient | 梯度 |
| Loss / Loss function | 损失 / 损失函数 |
| Neural network | 神经网络 |
| Embedding | 嵌入（embedding） |
| Fine-tuning | 微调 |
| Phase | 阶段 |
| Lesson | 课（如 "第 1 课"） |
| Artifact | 产物 |
| Build It / Use It | 动手构建 / 实际使用 |

### 保留英文，不翻

`agent`、`token`、`prompt`、`transformer`、`LLM`、`MCP`、`API`、`GPU`/`CPU`、`PyTorch`、`NumPy`、所有产品名和库名。

## humanizer 要点（翻译时套用）

- 删填充词，直接陈述。别写"值得注意的是""在这个时间点"。
- 变化句子节奏，长短句交错，别每句一个长度。
- 信任读者，别过度解释、别加"确保……"这类 -ing 尾巴。
- 少用破折号堆砌，少用"不仅……而且……"排比。
- 保留原文的锋芒和口语感（原文短句有力，译文也要有力，别翻软）。
- 但这是**技术教程**，不要强加文学性个性，准确清晰第一。

## 翻完自检（每个文件）

1. 代码块数量 = 翻译前（`grep -c '```'` 前后一致）
2. 所有 URL、文件路径原样还在
3. 章节标题用了上面的固定译法
4. 读一遍：像中文技术文档，不像机翻
