---
id: tokenizer-drift-ci
title: 权重没变，分数却掉了
card: tokenization-decoding
kind: debug
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [debugging, design-review]
tags: [tokenizer-drift, normalization, prefix-space, ci, evaluation]
minutes: 10
lessons: [phases/05-nlp-foundations-to-advanced/19-subword-tokenization, phases/10-llms-from-scratch/02-building-a-tokenizer]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/chat-template-garbage, tokenization-decoding/pre-tokenization-regex]
updated: 2026-11-03
---

一次常规的依赖升级之后，一个已部署模型的评测分数大幅下降。模型权重一个都没变。给我一份从分词器查起的诊断计划，以及你会加什么控制，让这种事不再发生。

## Short answer

用一套词表训练、用另一套词表服务的模型，同一段文本会得到不同的 ID，输出就是乱码，所以先在两个环境里给分词器文件算哈希并比对。哈希一致的话，再查那些不改词表却会改 ID 的设置：是否添加特殊 token、是否添加前缀空格，以及归一化步骤，因为一个前导空格，或一个归一化结果不同的连字，都会让整个 token 变掉。然后在 CI 里冻结分词器哈希，为一份固定语料保存标准 token ID（golden ids），任何改动在上线前都会让测试失败。

## Full answer

### 第一步：文件

合并表和词表就是分词器。库升级可能拉来另一个文件，也可能把模型名解析到更新的修订版。把评测环境里分词器文件的哈希，和模型训练时用的那一份比对。

### 第二步：文件周围的设置

| 设置 | 改变了什么 | 症状 |
|---|---|---|
| 添加特殊 token | 开头多出或少了一个文本开始 ID | 每个位置都错开一位 |
| 添加前缀空格 | 第一个词拿到的是词首 ID 还是词中 ID | 每个 prompt 的第一个 token 都不同 |
| 归一化 | 像双字母 "fi" 这样的连字变成两个字符，或全角字母变成 ASCII | 同一个词在两个环境里切出不同的片段 |
| 预分词引擎 | 支持 Unicode 的模式退回到 ASCII 字符类 | 非拉丁文本的切法不同 |

这些都是库版本可能改掉的默认值。它们都不碰词表文件，所以只看哈希抓不到它们。

### 第三步：证实

从评测里取一组固定的 prompt。在两个环境里分别编码，对 ID 列表做 diff。第一个不同的位置会告诉你是哪项设置变了。把不同的 ID 解码回来，看看是哪些片段。

### 控制措施

1. 在部署中按哈希锁定分词器文件，哈希一变就让构建失败。
2. 为一份固定语料保存标准 token ID，语料覆盖英语、非拉丁文字、代码、emoji，以及一个带前导空格的 prompt；测试对语料编码并比对。
3. 在同一份语料上断言往返：先编码再解码。与配置的归一化器产出的文本比对；对归一化器不改动的文本，要求字节级完全一致。
4. 把分词器设置和权重放在一起记录，让服务配置无法偏离训练配置。

### 课程里的验证方案

留出集上的平均每词 token 数、unknown 比率、压缩比和往返一致性。长期跟踪这四个数，能比评测更早发现漂移。

## Follow-ups

- **Level 3:** 前缀空格怎样改变 ID？ Expected: 空格是词首 token 的一部分，有空格时第一个词是一个 ID，没有时是另一个，这种差异还可能顺着合并继续传下去。
- **Level 3:** 兼容性归一化做什么？什么时候有害？ Expected: 它把兼容字符映射成普通形式，比如连字变成两个字母、全角字母变成 ASCII；它是有损的，依赖精确字形的代码或文本会因此改变含义。
- **Level 4:** 哈希一致，ID 却只在非拉丁文本上不同。变的是什么？ Expected: 预分词引擎；缺少 Unicode 感知模块的环境退回到了 ASCII 模式。
- **Level 4:** 用两句话设计这道 CI 门槛。 Expected: 一个测试对固定的多语言语料编码，与保存的标准 ID 和保存的分词器哈希比对；任何差异都让构建失败，并打印第一个不同的位置。

## Wrong answers

- "权重没变，所以模型没变。" 模型是权重加上文本到 ID 的映射；映射变了，模型看到的输入就变了。
- "在新分词器上重训模型。" 为一个配置 bug 花几周时间；应该恢复训练时的分词器和设置。
- "全部转成小写，归一化就无所谓了。" 这会再一次改变 ID，还丢掉了模型训练时依赖的信息。

## Taught in

[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)列出了漂移和空白相关的坑以及验证方案，[分词器构建课程](../../../phases/10-llms-from-scratch/02-building-a-tokenizer/)讲了归一化和正则引擎。
