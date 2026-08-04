# 水印 —— SynthID、Stable Signature、C2PA

> 三项技术构成了 2026 年 AI 生成内容的溯源体系。SynthID（Google DeepMind）——图像水印于 2023 年 8 月推出，文本+视频于 2024 年 5 月（Gemini + Veo），文本于 2024 年 10 月经 Responsible GenAI Toolkit 开源，统一的多媒体检测器于 2025 年 11 月随 Gemini 3 Pro 一同发布。文本水印不可察觉地调整下一个 token 的采样概率；图像/视频水印能挺过压缩、裁剪、滤镜、帧率变化。Stable Signature（Fernandez et al., ICCV 2023, arXiv:2303.15435）——微调潜在扩散解码器，让每个输出都含有一条固定消息；被裁剪（裁到内容的 10%）的生成图像，在 FPR<1e-6 时检测率 >90%。后续工作「Stable Signature is Unstable」（arXiv:2405.07145, 2024 年 5 月）——微调能在保住质量的同时移除水印。C2PA——一个加密签名、可察觉篡改的元数据标准（C2PA 2.2 Explainer 2025）。水印与 C2PA 互补：元数据能被剥掉但携带更丰富的溯源；水印能挺过转码但携带的信息更少。

**类型：** Build
**语言：** Python（标准库，token 水印嵌入 + 检测）
**前置要求：** 阶段 10 · 04（采样）、阶段 01 · 09（信息论）
**预计时间：** ~75 分钟

## 学习目标

- 描述 token 级水印（SynthID-文本 风格）及其可检测的机制。
- 描述 Stable Signature 以及 2024 年攻破它的移除攻击。
- 说出 C2PA 的角色，以及为什么它与水印互补。
- 描述关键局限：信号与模型绑定、改写下的鲁棒性、以及保义攻击（arXiv:2508.20228）。

## 问题背景

2023-2024 年，深度伪造和 AI 生成内容大规模进入政治和消费场景。水印是被提议的技术溯源信号：在创建时给生成内容打标，之后再检测它们。2025 年的证据：没有水印是无条件鲁棒的，但与 C2PA 元数据分层叠加后，这个组合提供了一个可用的溯源故事。

## 核心概念

### 文本水印（SynthID-文本 风格）

Kirchenbauer et al. 2023 的机制，由 Google 产品化：

1. 在每个解码步，把前 K 个 token 哈希成对词表的一个伪随机划分，分成「绿」和「红」两组。
2. 通过给绿色 logits 加 δ，把采样偏向绿组。
3. 生成内容里绿色 token 比随机情况下更多。

检测：对每个前缀重新哈希，数生成内容里的绿色 token，算一个 z 分数。水印文本的 z 分数 >0，人类文本约为 0。

性质：
- 对读者不可察觉（δ 小到质量损失轻微）。
- 在能访问词表划分函数时可检测。
- 对改写不鲁棒——重写文本会摧毁信号。

SynthID-文本于 2024 年 10 月经 Google 的 Responsible GenAI Toolkit 开源。

### Stable Signature（图像）

Fernandez et al. ICCV 2023。微调潜在扩散解码器，让每张生成图像都在潜在表示里嵌入一条固定的二进制消息。检测时用一个神经解码器从潜在表示里解出。被裁剪（裁到内容的 10%）的图像，在 FPR<1e-6 时检测率 >90%。

2024 年 5 月「Stable Signature is Unstable」（arXiv:2405.07145）：微调解码器能在保住图像质量的同时移除水印。生成后的对抗性微调很廉价；这个水印的对抗鲁棒性有限。

### SynthID 统一检测器（2025 年 11 月）

随 Gemini 3 Pro 一同：一个多媒体检测器，在一个 API 里读取来自文本、图像、音频、视频的 SynthID 信号。统一了 Google 的溯源技术栈。

### C2PA

Coalition for Content Provenance and Authenticity。一个加密签名、可察觉篡改的元数据标准。C2PA 2.2 Explainer（2025）。一份 C2PA 清单记录溯源声明（谁创建、何时、做了什么变换），由创建者的密钥签名。

与水印互补：
- 元数据能被剥掉；水印不能（不容易）。
- 元数据丰富（完整溯源链）；水印携带的是比特。
- C2PA 依赖平台采纳；水印自动嵌入。

Google 在搜索、广告、「关于这张图片」里集成了两者。

### 局限

- **与模型绑定。** SynthID 给来自启用 SynthID 的模型的生成内容打水印。来自没有 SynthID 的模型的生成内容不带水印，所以「没有 SynthID 信号」不是真实性的证明。
- **改写。** 文本水印挺不过保义的改写。
- **变换攻击。** arXiv:2508.20228（2025）展示了能摧毁文本水印和许多图像水印的保义攻击。
- **微调移除。** 据「Stable Signature is Unstable」，生成后的微调能移除嵌入的水印。

### EU AI 法案第 50 条

针对 AI 生成内容标注的透明度行为准则（首稿 2025 年 12 月，二稿 2026 年 3 月，据 [欧盟委员会状态页](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content) 预计 2026 年 6 月定稿）。截至 2026 年 4 月该准则仍处草案阶段，时间线可能变动。这是要求技术层的那个监管层。深度伪造必须被标注。

### 这在阶段 18 里的位置

第 22-23 课关注模型输出什么（私有数据、溯源信号）。第 27 课讲训练数据治理。第 24 课是要求这些技术措施的监管框架。

```figure
an-watermark-greenlist
```

## 实际使用

`code/main.py` 造了一个玩具文本水印。token 是整数 0..N-1；水印采样偏向哈希定义的绿组。一个检测器计算绿 token 的 z 分数。你可以在 1000-token 生成上观察检测、看着改写摧毁信号、并测量人类文本上的假阳性率。

## 拿去用

本课产出 `outputs/skill-provenance-audit.md`。给定一个带溯源声明的内容部署，它审计：水印机制（如果有）、C2PA 签名链（如果有）、各自的对抗鲁棒性、以及逐模态的覆盖。

## 练习

1. 运行 `code/main.py`。报告水印 1000-token 生成 vs 人类撰写文本的 z 分数。指出 95% 置信阈值下的假阳性率。

2. 实现一个改写攻击，用同义词替换 30% 的 token。重新测量 z 分数。

3. 读 Kirchenbauer et al. 2023 第 6 节关于鲁棒性的内容。为什么文本水印在改写下失败、而图像水印能挺过裁剪？

4. 设计一个使用 SynthID-文本 + C2PA 元数据的部署。描述消费者看到的溯源链。指出每个组件的一个失败模式。

5. 2024 年「Stable Signature is Unstable」结果表明微调能移除图像水印。设计一个限制这种攻击的部署控制——比如，要求对微调后的检查点做签名发布。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| SynthID | 「Google 的水印」 | 跨模态溯源信号；文本、图像、音频、视频 |
| token 水印 | 「Kirchenbauer 风格」 | 偏向采样的文本水印，经由绿 token z 分数可检测 |
| Stable Signature | 「图像水印」 | 微调解码器的水印；ICCV 2023 |
| C2PA | 「那个元数据标准」 | 加密签名、可察觉篡改的溯源元数据 |
| 改写鲁棒性 | 「重新措辞会不会破坏它」 | 文本水印的性质；目前有限 |
| 微调移除 | 「对抗性去水印」 | 经由解码器微调移除图像水印的攻击 |
| 跨模态检测器 | 「统一 SynthID」 | 2025 年 11 月跨模态的统一 API |

## 延伸阅读

- [Kirchenbauer et al. — A Watermark for Large Language Models (ICML 2023, arXiv:2301.10226)](https://arxiv.org/abs/2301.10226) —— token 水印机制
- [Fernandez et al. — Stable Signature (ICCV 2023, arXiv:2303.15435)](https://arxiv.org/abs/2303.15435) —— 图像水印论文
- ["Stable Signature is Unstable" (arXiv:2405.07145)](https://arxiv.org/abs/2405.07145) —— 移除攻击
- [Google DeepMind — SynthID](https://deepmind.google/models/synthid/) —— 跨模态水印
- [C2PA 2.2 Explainer (2025)](https://c2pa.org/specifications/specifications/2.2/explainer/Explainer.html) —— 元数据标准
