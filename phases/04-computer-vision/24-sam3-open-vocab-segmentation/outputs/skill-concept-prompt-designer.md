---
name: skill-concept-prompt-designer
description: 把用户的自然语言表述转成规范的 SAM 3 概念 prompt，包括拆分、消歧和兜底
version: 1.0.0
phase: 4
lesson: 24
tags: [sam3, open-vocab, prompt-engineering, segmentation]
---

# 概念 Prompt 设计器

SAM 3 的准确率很大程度上取决于概念 prompt 怎么写。这个 skill 把用户随意写的表述规范化，变成 SAM 3 能处理好的 prompt。

## 何时使用

- 搭建一个接受自然语言物体查询的 UI。
- 通过 API 对外提供 SAM 3，上游调用方发来的是整句话。
- 排查 SAM 3 匹配效果差的问题：往往是 prompt 写得不对，不是模型的问题。

## 输入

- `utterance`：用户原始字符串。
- `context`：可选的领域提示（例如 "surveillance"、"medical"、"retail"）。
- `max_concepts`：每条表述最多提取的概念数；默认 5。

## SAM 3 偏好的写法

- **短名词短语，不要整句。** `"cat"` 好过 `"there is a cat"`。
- **具体名词。** `"skateboard"` 好过 `"thing to ride on"`。
- **修饰语紧贴在名词前面。** `"red car"` 好过 `"car that is red"`。
- **小写。** SAM 3 很稳健，但实测小写输入略好一些。
- **单数或复数。** 都可以；预期有多个实例时，复数有帮助。

## 步骤

1. **按常见分隔符切分**：逗号、分号、"and"、"or"、"&"。
2. **去掉填充前缀**："find"、"show me"、"segment"、"detect"、"locate"、"a"、"an"、"the"。
3. **只保留视觉上的介词修饰语**：`"striped red umbrella"` 保留，`"umbrella from yesterday"` 不保留（`"from yesterday"` 不在图像里）。
4. **借助可选的 `context` 消除歧义**：
   - 监控场景中的 `"window"` -> `"building window"`。
   - 医学场景中的 `"window"` -> 通常是错误；建议用户澄清。
5. **兜底**：如果拆分后没有得到任何概念，*并且*表述中至少有一个具体名词，就直接使用原字符串。如果提取不出任何具体名词，就不要输出概念，只返回警告并请用户澄清（见规则）。
6. **上限为 `max_concepts`。** 如果提取出的概念多于调用方要求的数量，按表述中的顺序保留前 `max_concepts` 个，其余放进 `dropped`，原因写 `"exceeded max_concepts"`。这样即使用户粘贴了一长串列举，延迟也有上限。

## 输出格式

```
[designed prompts]
  utterance:    <original>
  concepts:     ["concept_1", "concept_2", ...]
  dropped:      ["filler_1", ...]
  warnings:     ["concept too abstract", "may match many classes", ...]

[sam3 calls]
  For each concept run: sam3.detect(image, concept)
  Merge outputs with distinct concept tags per detection.
```

## 示例

```
in:  "can you find me a cat or two dogs?"
out: ["cat", "dogs"]
dropped: ["can you find me", "a", "or two", "?"]
note: "dogs" kept plural because the utterance says "two dogs" — plural hint preserved.

in:  "segment the big red truck and the blue sedan"
out: ["big red truck", "blue sedan"]
dropped: ["segment", "the", "and"]

in:  "thing near the door"
out: ["door"]
warnings: ["'thing' is too abstract for SAM 3; fell back to 'door'"]

in:  "striped red umbrella, green hat, pink balloon"
out: ["striped red umbrella", "green hat", "pink balloon"]
```

## 规则

- 绝不把超过 8 个词的句子传给 SAM 3；超过这个长度准确率会下降。
- 如果表述里提取不出具体名词，就不要运行 SAM 3；返回警告并请求澄清。
- 不要在引号内的字符串里按标点切分；如果 `"black and white cat"` 带了引号，就把它作为一个概念保留。
- 一律记录原始表述和推导出的概念，便于生产环境排查。
