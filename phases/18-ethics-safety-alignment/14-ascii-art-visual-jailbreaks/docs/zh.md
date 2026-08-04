# ASCII 艺术与视觉越狱

> Jiang、Xu、Niu、Xiang、Ramasubramanian、Li、Poovendran，"ArtPrompt: ASCII Art-based Jailbreak Attacks against Aligned LLMs"（ACL 2024, arXiv:2402.11753）。把有害请求里安全相关的 token 遮掉，换成同一批字母的 ASCII 艺术渲染，再把这个伪装后的提示发出去。GPT-3.5、GPT-4、Gemini、Claude、Llama-2 都无法稳健地识别 ASCII 艺术 token。这种攻击绕过了 PPL（困惑度过滤）、改写防御、重分词。相关工作：ViTC 基准测量对非语义视觉提示的识别；StructuralSleight 把它推广到「不常见的文本编码结构」（树、图、嵌套 JSON），作为一个编码攻击家族。

**类型：** Build
**语言：** Python（标准库，ArtPrompt token 遮蔽测试台）
**前置要求：** 阶段 18 · 12（PAIR）、阶段 18 · 13（MSJ）
**预计时间：** ~60 分钟

## 学习目标

- 描述 ArtPrompt 攻击：词识别步骤、ASCII 艺术替换、最终的伪装提示。
- 解释为什么标准防御（PPL、改写、重分词）对 ArtPrompt 失效。
- 定义 ViTC 并描述它测量什么。
- 把 StructuralSleight 描述为对任意「不常见文本编码结构」的推广。

## 问题背景

经由改写和角色扮演的攻击（第 12 课）以及经由长上下文的攻击（第 13 课），都作用在文本层面的模式上。ArtPrompt 作用在识别层面：模型并不解析那个被禁的 token。它解析的是一幅用字符渲染的图像。安全过滤器看到的是无害的标点。模型看到的是一个词。

## 核心概念

### ArtPrompt，两步

第 1 步。词识别。给定一个有害请求，攻击者用一个 LLM 识别出安全相关的词（比如「how to make a bomb」里的「bomb」）。

第 2 步。生成伪装提示。把每个识别出的词换成它的 ASCII 艺术渲染（一个 7x5 或 7x7 的字符块，拼出字母形状）。模型收到的是一格标点和空格，一个足够强的模型能把它认成那个词；而安全过滤器只看到那一格。

结果：GPT-4、Gemini、Claude、Llama-2、GPT-3.5 全都失守。在他们的基准子集上攻击成功率超过 75%。

### 为什么标准防御失效

- **PPL（困惑度过滤）。** ASCII 艺术困惑度高——但所有新颖输入也都高。能拦住 ArtPrompt 的阈值选择，也会拦住合法的结构化输入。
- **改写。** 改写提示会破坏 ASCII 艺术。但实践中，改写用的 LLM 往往会保留或重建那幅艺术图。
- **重分词。** 换一种方式切分 token，并不改变「模型的视觉正在识别字母形状」这件事。

底层问题在于安全过滤器是 token 级或语义级的；而 ArtPrompt 作用在视觉识别层面。

### ViTC 基准

对非语义视觉提示的识别。测量模型读取 ASCII 艺术、wingdings 字体、以及其它非文本语义视觉内容的能力。ArtPrompt 的有效性与 ViTC 准确率相关：模型越会读视觉文本，ArtPrompt 对它越管用。这是一种能力-安全权衡。

### StructuralSleight

它推广了 ArtPrompt：不常见的文本编码结构（UTES）。树、图、嵌套 JSON、JSON 里嵌 CSV、diff 风格的代码块。如果某种结构在训练安全数据里罕见、但模型能解析，它就能藏匿有害内容。

防御上的含义：安全必须在模型能解析的各种结构化表示之间泛化。这个集合很大、还在变大。

### 图像模态的类比

视觉 LLM（GPT-5.2、Gemini 3 Pro、Claude Opus 4.5、Grok 4.1）扩大了攻击面。用真实图像做的 ArtPrompt 风格攻击比 ASCII 艺术版本更强，因为图像编码器产出更丰富的信号。

### 这在阶段 18 里的位置

第 12-14 课描述三个正交的攻击向量：迭代精化（PAIR）、上下文长度（MSJ）、编码（ArtPrompt/StructuralSleight）。第 15 课从以模型为中心的攻击转向系统边界攻击（间接提示注入）。第 16 课描述防御工具的应对。

```figure
al-ascii-cloak
```

## 实际使用

`code/main.py` 造了一个玩具 ArtPrompt。你可以用 ASCII 艺术字形伪装一个有害查询里的特定词，核验伪装后的字符串能通过关键词过滤，并（可选地）用一个简单识别器把伪装字符串解码回去。

## 拿去用

本课产出 `outputs/skill-encoding-audit.md`。给定一份越狱防御报告，它列举覆盖的编码攻击家族（ASCII 艺术、base64、leet 写法、UTF-8 同形异义字、UTES），以及捕捉每一种的防御层。

## 练习

1. 运行 `code/main.py`。核验伪装字符串能通过一个简单关键词过滤。报告所需的字符级改动量。

2. 实现第二种编码：对同一个目标词用 base64。对比它与 ArtPrompt 的过滤绕过率，以及恢复难度。

3. 读 Jiang et al. 2024 第 4.3 节（五模型结果）。提一个理由，解释为什么在同一基准上 Claude 的 ArtPrompt 抗性比 Gemini 高。

4. 设计一个生成前防御，检测提示里 ASCII 艺术形状的区域。测量它在合法代码、表格、数学记号上的假阳性率。

5. StructuralSleight 列出了 10 种编码结构。勾画一个能处理全部 10 种的通用防御，并估计每条被防御提示的计算成本。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| ArtPrompt | 「那个 ASCII 艺术攻击」 | 用 ASCII 艺术渲染遮蔽安全词的两步越狱 |
| 伪装（Cloaking） | 「藏住那个词」 | 把一个被禁 token 换成一种「模型读得出、过滤器读不出」的视觉表示 |
| UTES | 「不常见结构」 | 不常见文本编码结构——树、图、嵌套 JSON 等，用来夹带内容 |
| ViTC | 「视觉文本能力」 | 衡量模型读取非语义视觉编码能力的基准 |
| 困惑度过滤 | 「PPL 防御」 | 拒绝高困惑度提示；会失败，因为合法结构化输入也得分高 |
| 重分词 | 「换分词器防御」 | 用另一个分词器预处理提示；会失败，因为识别是视觉的 |
| 同形异义字 | 「长得像的字符」 | 看起来与拉丁字母一模一样的 Unicode 字符；绕过子串检查 |

## 延伸阅读

- [Jiang et al. — ArtPrompt (ACL 2024, arXiv:2402.11753)](https://arxiv.org/abs/2402.11753) —— ASCII 艺术越狱论文
- [Li et al. — StructuralSleight (arXiv:2406.08754)](https://arxiv.org/abs/2406.08754) —— UTES 推广
- [Chao et al. — PAIR (Lesson 12, arXiv:2310.08419)](https://arxiv.org/abs/2310.08419) —— 互补的迭代攻击
- [Anil et al. — Many-shot Jailbreaking (Lesson 13)](https://www.anthropic.com/research/many-shot-jailbreaking) —— 互补的长度攻击
